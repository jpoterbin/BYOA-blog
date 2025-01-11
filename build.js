const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Build pages
const pagesDir = './content/pages';
const publicDir = './public';
const blogDir = './content/blog';
const blogOutputDir = path.join(publicDir, 'blog');

// Ensure second blog post exists
const secondPost = path.join(blogDir, '01-11-25.md');
if (!fs.existsSync(secondPost) || fs.statSync(secondPost).size === 0) {
    const content = `---
title: My Second Blog Post
date: 2024-01-11
---

# My Second Blog Post

This is my second blog post. Welcome to my blog!

## What's Next?

Stay tuned for more interesting content coming soon!`;
    fs.writeFileSync(secondPost, content);
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

// Create blog post template with absolute paths for GitHub Pages
const blogPostTemplate = baseTemplate
    .replace('href="../assets/css/style.css"', 'href="/BYOA-blog/assets/css/style.css"')
    .replace('src="../assets/js/main.js"', 'src="/BYOA-blog/assets/js/main.js"')
    .replace(/href="\.\.\/index\.html"/g, 'href="/BYOA-blog/index.html"')
    .replace('href="blog.html"', 'href="/BYOA-blog/public/blog.html"')
    .replace('href="about.html"', 'href="/BYOA-blog/public/about.html"')
    .replace('href="faq.html"', 'href="/BYOA-blog/public/faq.html"');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}
if (!fs.existsSync(blogOutputDir)) {
    fs.mkdirSync(blogOutputDir, { recursive: true });
}

// Process markdown files
function processMarkdown(filePath, template, content = null) {
    // Use provided content or read from file
    const fileContent = content || fs.readFileSync(filePath, 'utf-8');
    
    // Split content into front matter and markdown
    let frontMatter = '';
    let markdownContent = fileContent;
    
    // Check if the file has front matter (between --- markers)
    if (fileContent.startsWith('---\n')) {
        const parts = fileContent.split('---\n').filter(Boolean);
        if (parts.length >= 2) {
            frontMatter = parts[0];
            markdownContent = parts.slice(1).join('---\n');
        }
    }
    
    // Extract title and date from front matter or use filename
    let title = path.basename(filePath, '.md');
    let date = '';
    if (frontMatter) {
        const titleMatch = frontMatter.match(/title:\s*(.+)/);
        if (titleMatch) {
            title = titleMatch[1].trim();
        }
        const dateMatch = frontMatter.match(/date:\s*(.+)/);
        if (dateMatch) {
            date = dateMatch[1].trim();
        }
    }
    
    // Convert markdown to HTML
    const htmlContent = marked.parse(markdownContent);
    
    return {
        title,
        date,
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
            
            // Split content into front matter and markdown
            let title = path.basename(file, '.md');
            let date = '';
            
            if (content.startsWith('---\n')) {
                const parts = content.split('---\n').filter(Boolean);
                if (parts.length >= 2) {
                    const frontMatter = parts[0];
                    
                    // Extract title
                    const titleMatch = frontMatter.match(/title:\s*(.+)(\r?\n|$)/);
                    if (titleMatch) {
                        title = titleMatch[1].trim();
                        console.log(`Found title "${title}" in ${file}`);
                    } else {
                        console.log(`No title found in front matter of ${file}`);
                        console.log('Front matter:', frontMatter);
                    }
                    
                    // Extract date
                    const dateMatch = frontMatter.match(/date:\s*(.+)(\r?\n|$)/);
                    if (dateMatch) {
                        date = dateMatch[1].trim();
                    }
                }
            }
            
            posts.push({
                title,
                date,
                file: file.replace('.md', '.html')
            });
        }
    });
    
    // Sort posts by date in descending order
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
            const blogListContent = `---
title: Blog Posts
---

# Latest Blog Posts

Here are my latest blog posts:

${posts.map(post => `- [${post.title}](/BYOA-blog/public/blog/${post.file}) - ${post.date}`).join('\n')}
`;
            const { html } = processMarkdown(path.join(pagesDir, file), template, blogListContent);
            const outputPath = path.join(publicDir, 'blog.html');
            fs.writeFileSync(outputPath, html);
        } else {
            const { html } = processMarkdown(path.join(pagesDir, file), template);
            let outputPath;
            
            if (isRoot) {
                outputPath = './index.html';
            } else {
                outputPath = path.join(publicDir, file.replace('.md', '.html'));
            }
            
            fs.writeFileSync(outputPath, html);
        }
    }
});

// Ensure asset directories exist
const cssDir = path.join('assets', 'css');
const jsDir = path.join('assets', 'js');

if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
}
if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir, { recursive: true });
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