const fs = require('fs');
const path = require('path');
const marked = require('marked');

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

// Build pages
const pagesDir = './content/pages';
const publicDir = './public';
const blogDir = './content/blog';
const blogOutputDir = path.join(publicDir, 'blog');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}
if (!fs.existsSync(blogOutputDir)) {
    fs.mkdirSync(blogOutputDir, { recursive: true });
}

// Process markdown files
function processMarkdown(filePath, template) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parts = content.split('---\n').filter(Boolean);
    
    // Parse front matter
    const frontMatter = parts[0];
    const markdownContent = parts[1] || '';
    
    // Extract title from front matter
    const titleMatch = frontMatter.match(/title:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    // Convert markdown to HTML
    const htmlContent = marked.parse(markdownContent);
    
    // Insert into template
    return template
        .replace('{{title}}', title)
        .replace('{{content}}', htmlContent);
}

// Build blog posts
fs.readdirSync(blogDir).forEach(file => {
    if (file.endsWith('.md')) {
        const html = processMarkdown(path.join(blogDir, file), blogPostTemplate);
        const outputPath = path.join(blogOutputDir, file.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    }
});

// Build pages
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.md')) {
        const isRoot = file === 'index.md';
        const template = isRoot ? rootTemplate : baseTemplate;
        const html = processMarkdown(path.join(pagesDir, file), template);
        let outputPath;
        
        if (isRoot) {
            outputPath = './index.html';
        } else {
            outputPath = path.join(publicDir, file.replace('.md', '.html'));
        }
        
        fs.writeFileSync(outputPath, html);
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