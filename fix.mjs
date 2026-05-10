import fs from 'fs';
let content = fs.readFileSync('C:/Users/deekshith/Desktop/n8n-content-worker/src/template.js', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('C:/Users/deekshith/Desktop/n8n-content-worker/src/template.js', content);
