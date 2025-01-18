const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Configure marked options
marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    smartLists: true,
    smartypants: true,
    headerIds: false,
    mangle: false,
    html: true
});

// Build pages
const pagesDir = './content/pages';
const publicDir = './public';
const blogDir = './content/blog';
const blogOutputDir = path.join(publicDir, 'blog');

// Get blog post excerpt
function getExcerpt(content, length = 200) {
    // Remove front matter
    const parts = content.split('---');
    const markdown = parts.length > 2 ? parts.slice(2).join('---') : content;
    
    // Remove the first heading (title)
    const withoutTitle = markdown.replace(/^#[^#].*$/m, '').trim();
    
    // Get the first paragraph
    const firstParagraph = withoutTitle.split('\n\n')[0];
    
    // Convert to plain text
    const text = firstParagraph
        .replace(/#+\s+/g, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with just text
        .replace(/[*_`]/g, '') // Remove markdown formatting
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .trim();
    
    // Get first n characters
    return text.length > length ? text.slice(0, length) + '...' : text;
}

// Read templates
const baseTemplate = fs.readFileSync('./templates/base.html', 'utf-8');
const rootTemplate = baseTemplate
    .replace('href="../assets/css/style.css"', 'href="assets/css/style.css"')
    .replace('src="../assets/js/main.js"', 'src="assets/js/main.js"')
    .replace(/href="\.\.\/index\.html"/g, 'href="index.html"')
    .replace('href="blog.html"', 'href="public/blog.html"')
    .replace('href="about.html"', 'href="public/about.html"')
    .replace('href="faq.html"', 'href="public/faq.html"');

// Create blog post template with proper paths
const blogPostTemplate = baseTemplate
    .replace('href="../assets/css/style.css"', 'href="../../assets/css/style.css"')
    .replace('src="../assets/js/main.js"', 'src="../../assets/js/main.js"')
    .replace('href="../index.html"', 'href="../../index.html"')
    .replace('href="about.html"', 'href="../about.html"')
    .replace('href="resume.html"', 'href="../resume.html"')
    .replace('href="projects.html"', 'href="../projects.html"')
    .replace('href="blog.html"', 'href="../blog.html"')
    .replace('href="faq.html"', 'href="../faq.html"');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}
if (!fs.existsSync(blogOutputDir)) {
    fs.mkdirSync(blogOutputDir, { recursive: true });
}

// Process markdown files
function processMarkdown(filePath, template, content = null) {
    const fileContent = content || fs.readFileSync(filePath, 'utf-8');
    
    let frontMatter = '';
    let markdownContent = fileContent;
    let title = path.basename(filePath, '.md');
    let date = '';
    
    if (fileContent.startsWith('---\n')) {
        const parts = fileContent.split('---\n').filter(Boolean);
        if (parts.length >= 2) {
            frontMatter = parts[0];
            markdownContent = parts.slice(1).join('---\n');
            
            const titleMatch = frontMatter.match(/title:\s*(.+)/);
            if (titleMatch) {
                title = titleMatch[1].trim();
            }
            
            const dateMatch = frontMatter.match(/date:\s*(.+)/);
            if (dateMatch) {
                date = dateMatch[1].trim();
            }
        }
    }
    
    // Configure marked for this specific content
    marked.setOptions({
        gfm: true,
        breaks: true,
        pedantic: false,
        smartLists: true,
        smartypants: true,
        headerIds: false,
        mangle: false,
        html: true,
        xhtml: true
    });
    
    // Split content into sections based on h2 headers
    const sections = markdownContent.split(/(?=##\s)/);
    
    // Process each section
    const processedSections = sections.map(section => {
        if (section.startsWith('<div class="hero">')) {
            return section;
        }
        return `<div class="content-section">\n${marked.parse(section.trim())}\n</div>`;
    });
    
    const htmlContent = processedSections.join('\n');
    
    return {
        title,
        date,
        content: markdownContent,
        html: template
            .replace('{{title}}', title)
            .replace('{{content}}', htmlContent)
    };
}

// Get all blog posts
function getBlogPosts() {
    const posts = [];
    fs.readdirSync(blogDir).forEach(file => {
        if (file.endsWith('.md')) {
            const filePath = path.join(blogDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const { title, date, content: markdownContent } = processMarkdown(filePath, '');
            
            posts.push({
                title,
                date,
                excerpt: getExcerpt(markdownContent),
                file: file.replace('.md', '.html'),
                image: `../assets/images/blog/${file.replace('.md', '.jpg')}`
            });
        }
    });
    
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Build blog posts
fs.readdirSync(blogDir).forEach(file => {
    if (file.endsWith('.md')) {
        const { html } = processMarkdown(path.join(blogDir, file), blogPostTemplate);
        const outputPath = path.join(blogOutputDir, file.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    }
});

// Build pages
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.md')) {
        const isRoot = file === 'index.md';
        const template = isRoot ? rootTemplate : baseTemplate;
        
        if (file === 'blog.md') {
            // Generate blog index page with list of posts
            const posts = getBlogPosts();
            const blogContent = `<div class="hero">
    <div class="hero-content">
        <h1>Blog</h1>
        <p>Thoughts on product, design, and life</p>
    </div>
</div>

<div class="content-section blog-content">
    <div class="blog-grid">
        ${posts.map(post => `
        <article class="blog-preview">
            <img src="${post.image}" alt="${post.title}" class="blog-preview-image">
            <div class="blog-preview-content">
                <h2><a href="blog/${post.file}">${post.title}</a></h2>
                <time class="blog-date">${post.date}</time>
                <p class="blog-excerpt">${post.excerpt}</p>
                <a href="blog/${post.file}" class="read-more">Read More →</a>
            </div>
        </article>`).join('')}
    </div>
</div>`;

            const outputPath = path.join(publicDir, 'blog.html');
            const html = template
                .replace('{{title}}', 'Blog')
                .replace('{{content}}', blogContent);
            fs.writeFileSync(outputPath, html);
        } else {
            const { html } = processMarkdown(path.join(pagesDir, file), template);
            const outputPath = isRoot ? './index.html' : path.join(publicDir, file.replace('.md', '.html'));
            fs.writeFileSync(outputPath, html);
        }
    }
});

// Ensure asset directories exist
const cssDir = path.join('assets', 'css');
const jsDir = path.join('assets', 'js');
const blogImagesDir = path.join('assets', 'images', 'blog');

if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
}
if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
}
if (!fs.existsSync(blogImagesDir)) {
    fs.mkdirSync(blogImagesDir, { recursive: true });
}

// Create empty CSS and JS files if they don't exist
const cssFile = path.join(cssDir, 'style.css');
const jsFile = path.join(jsDir, 'main.js');

if (!fs.existsSync(cssFile)) {
    fs.writeFileSync(cssFile, '/* Add your styles here */\n');
}
if (!fs.existsSync(jsFile)) {
    fs.writeFileSync(jsFile, '// Add your JavaScript here\n');
}

console.log('Build complete!');