const express = require('express');
const app = express();
const port = 3000;

// Serve static files from both root and public directory
app.use(express.static('.'));
app.use(express.static('public'));

// Handle routes that don't end in .html
app.use((req, res, next) => {
    // Skip if the path already ends with .html or has a file extension
    if (req.path.includes('.') || req.path.endsWith('/')) {
        next();
        return;
    }

    // Remove trailing slash if present
    const path = req.path.replace(/\/$/, '');
    
    // Redirect to the .html version
    res.redirect(path + '.html');
});

// Handle root paths like /blog/ or /about/
app.use((req, res, next) => {
    if (req.path.endsWith('/') && req.path !== '/') {
        // Remove trailing slash and redirect to .html
        const path = req.path.slice(0, -1);
        res.redirect(path + '.html');
    } else {
        next();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 