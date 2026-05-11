const fs = require('fs');

const newFooter = `        <div class="footer-nav-grid">
            <div class="footer-nav-col">
                <h4>Navigation</h4>
                <nav aria-label="Footer Navigation">
                    <a href="/">Home</a>
                    <a href="/#featured">Featured</a>
                    <a href="/#for-you">For You</a>
                </nav>
            </div>
            <div class="footer-nav-col">
                <h4>Legal</h4>
                <nav aria-label="Footer Legal">
                    <a href="/about.html">About Us</a>
                    <a href="/contact.html">Contact Us</a>
                    <a href="/privacy.html">Privacy Policy</a>
                </nav>
            </div>
        </div>`;

function updateFooter(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Add IDs if index.html
    if (file === 'index.html') {
        content = content.replace('<div class="blog-featured-carousel">', '<div class="blog-featured-carousel" id="featured">');
        content = content.replace('<div class="blog-recents-header">For You</div>', '<div class="blog-recents-header" id="for-you">For You</div>');
    }

    // Replace footer nav grid
    const footerRegex = /<div class="footer-nav-grid">[\s\S]*?<\/nav>\s*<\/div>\s*<\/div>/;
    content = content.replace(footerRegex, newFooter);
    
    fs.writeFileSync(file, content);
    console.log('Updated', file);
}

['index.html', '404.html', 'template.js'].forEach(updateFooter);
