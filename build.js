const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Read template
const template = fs.readFileSync('./templates/base.html', 'utf-8');

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
function processMarkdown(filePath) {
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
        const html = processMarkdown(path.join(blogDir, file));
        const outputPath = path.join(blogOutputDir, file.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    }
});

// Build pages (including index and blog pages)
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.md')) {
        const html = processMarkdown(path.join(pagesDir, file));
        let outputPath;
        
        if (file === 'index.md') {
            // Place index.html at root level
            outputPath = './index.html';
        } else {
            outputPath = path.join(publicDir, file.replace('.md', '.html'));
        }
        
        fs.writeFileSync(outputPath, html);
    }
});

// Ensure asset directories exist
const cssDir = path.join(publicDir, 'css');
const jsDir = path.join(publicDir, 'js');

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