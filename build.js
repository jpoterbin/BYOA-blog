const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Read template
const template = fs.readFileSync('./templates/base.html', 'utf-8');

// Build pages
const pagesDir = './content/pages';
const publicDir = './public';

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Process markdown files
function processMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const [frontMatter, ...markdownContent] = content.split('---\n');
    
    // Parse front matter
    const titleMatch = frontMatter.match(/title:\s*(.+)/);
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    
    // Convert markdown to HTML
    const htmlContent = marked.parse(markdownContent.join('---\n'));
    
    // Insert into template
    return template
        .replace('{{title}}', title)
        .replace('{{content}}', htmlContent);
}

// Build pages
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.md') && file !== 'index.md') {
        const html = processMarkdown(path.join(pagesDir, file));
        const outputPath = path.join(publicDir, file.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    }
});

// Copy static assets
fs.cpSync('./public/css', path.join(publicDir, 'css'), { recursive: true });
fs.cpSync('./public/js', path.join(publicDir, 'js'), { recursive: true });

console.log('Build complete!'); 