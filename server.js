const express = require('express');
const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Redirect /about to /about.html etc.
app.use((req, res, next) => {
    if (!req.path.endsWith('.html') && !req.path.endsWith('/')) {
        res.redirect(req.path + '.html');
    } else {
        next();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 