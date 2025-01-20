const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Load hero images configuration
const heroImages = JSON.parse(fs.readFileSync('./content/hero-images.json', 'utf-8'));

// Function to get a random hero image
function getRandomHeroImage() {
    const images = heroImages.images;
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
}

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

// Function to copy directory recursively
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Clean and create directories
if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true });
}
fs.mkdirSync(publicDir);
fs.mkdirSync(blogOutputDir, { recursive: true });

// Copy assets to public directory
if (fs.existsSync('./assets')) {
    copyDir('./assets', path.join(publicDir, 'assets'));
}

// Create a .nojekyll file to prevent GitHub Pages from ignoring files that start with underscores
fs.writeFileSync(path.join(publicDir, '.nojekyll'), '');

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
const rootTemplate = fs.readFileSync('./templates/root.html', 'utf-8');

// Create blog template with proper relative paths
const blogTemplate = baseTemplate
    .replace(/href="\//g, 'href="../')
    .replace(/src="\//g, 'src="../');

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

    // Handle hero section separately
    let heroSection = '';
    let mainContent = markdownContent;
    
    if (markdownContent.includes('<div class="hero">')) {
        const parts = markdownContent.split('</div>\n\n');
        heroSection = parts[0] + '</div>';
        mainContent = parts.slice(1).join('</div>\n\n');
        
        // Replace hero background image with random one
        const heroImage = getRandomHeroImage();
        heroSection = heroSection.replace(
            /style="[^"]*"/,
            `style="background-image: url('/assets/images/hero/${heroImage.path}')"`
        );
        
        // Replace the photo caption if it exists
        if (heroSection.includes('<p>Photo:')) {
            heroSection = heroSection.replace(
                /<p>Photo:.*?<\/p>/,
                `<p>Photo: ${heroImage.caption}</p>`
            );
        }
    }
    
    // Process the main content
    const htmlContent = heroSection + '\n<div class="content-section">\n' + marked.parse(mainContent) + '\n</div>';
    
    return {
        title,
        date,
        content: markdownContent,
        html: template
            .replace('{{title}}', title)
            .replace('{{content}}', htmlContent)
    };
}

// Build blog posts
fs.readdirSync(blogDir).forEach(file => {
    if (file.endsWith('.md')) {
        const { html } = processMarkdown(path.join(blogDir, file), baseTemplate);
        const outputPath = path.join(blogOutputDir, file.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    }
});

// Get all blog posts
function getBlogPosts() {
    const posts = [];
    fs.readdirSync(blogDir).forEach(file => {
        if (file.endsWith('.md')) {
            const filePath = path.join(blogDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const { title, date, content: markdownContent } = processMarkdown(filePath, '');
            
            // Check if .png exists, otherwise use .jpg
            const baseName = file.replace('.md', '');
            const pngPath = path.join('assets', 'images', 'blog', `${baseName}.png`);
            const jpgPath = path.join('assets', 'images', 'blog', `${baseName}.jpg`);
            const imagePath = fs.existsSync(path.join(publicDir, pngPath)) ? pngPath : jpgPath;
            
            posts.push({
                title,
                date,
                excerpt: getExcerpt(markdownContent),
                file: `/blog/${file.replace('.md', '.html')}`,
                image: `/${imagePath}`
            });
        }
    });
    
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Build pages
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.md')) {
        const isRoot = file === 'index.md';
        const template = isRoot ? rootTemplate : baseTemplate;
        
        if (file === 'blog.md') {
            // Generate blog index page with list of posts
            const posts = getBlogPosts();
            const { content: pageContent } = processMarkdown(path.join(pagesDir, file), '');
            
            // Process the page content first to handle the hero section
            const { html: processedHtml } = processMarkdown(path.join(pagesDir, file), template, pageContent);
            
            // Add the blog grid after the hero section
            const blogContent = processedHtml.replace('</div>\n</div>\n\n<div class="content-section">', '</div>\n</div>\n\n<div class="content-section blog-content">\n<div class="blog-grid">');
            
            const outputPath = path.join(publicDir, 'blog.html');
            fs.writeFileSync(outputPath, blogContent);
        } else {
            const { html } = processMarkdown(path.join(pagesDir, file), template);
            const outputPath = path.join(publicDir, file.replace('.md', '.html'));
            fs.writeFileSync(outputPath, html);
        }
    }
});

console.log('Build complete!');