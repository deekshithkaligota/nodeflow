import fs from 'fs';
import path from 'path';
import { generateStaticHtml } from './template.js';

const SANITY_PROJECT_ID = 'si810ffl';
const SANITY_DATASET = 'posts-1';

async function sanityFetch(query) {
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.result;
}

// Convert Sanity portable text to basic HTML for template
function portableTextToHtml(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '';
    let html = '';
    for (let block of blocks) {
        if (block._type === 'block') {
            const text = block.children.map(c => c.text).join('');
            html += `<p>${text}</p>\n`;
        }
    }
    return html;
}

function sanityImageUrl(thumbnail) {
    if (!thumbnail || !thumbnail.asset || !thumbnail.asset._ref) return '';
    const ref = thumbnail.asset._ref;
    const parts = ref.replace('image-', '').split('-');
    const ext = parts.pop();
    const dimensions = parts.pop();
    const hash = parts.join('-');
    return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${hash}-${dimensions}.${ext}`;
}

async function build() {
    console.log("Fetching existing posts from Sanity...");
    const posts = await sanityFetch(`*[_type == "post"] | order(_createdAt desc) { 
        title, 
        "slug": slug.current, 
        content, 
        thumbnail, 
        "workflowUrl": workflowFile.asset->url,
        _createdAt,
        excerpt
    }`);

    const recommended = posts.slice(0, 3);
    const announcements = await sanityFetch('*[_type == "announcement" && isActive == true]');

    const blogDir = path.join(process.cwd(), 'blog');
    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir);

    for (const post of posts) {
        if (!post.slug) continue;
        
        const postDir = path.join(blogDir, post.slug);
        if (!fs.existsSync(postDir)) fs.mkdirSync(postDir);

        const postData = {
            title: post.title,
            slug: post.slug,
            content: typeof post.content === 'string' ? post.content : portableTextToHtml(post.content)
        };

        const seoData = {
            metaTitle: post.title,
            metaDescription: post.excerpt || postData.content.substring(0, 150),
            primaryKeyword: "n8n workflow",
            faqs: []
        };

        const imageUrl = sanityImageUrl(post.thumbnail);
        const html = generateStaticHtml(postData, seoData, imageUrl, post.workflowUrl, recommended, 'https://nodeflow.ai', announcements);

        fs.writeFileSync(path.join(postDir, 'index.html'), html);
        console.log(`Generated /blog/${post.slug}/index.html`);
    }

    // Generate sitemap.xml
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nodeflow.ai/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
${posts.filter(p => p.slug).map(p => `  <url>
    <loc>https://nodeflow.ai/blog/${p.slug}</loc>
    <lastmod>${new Date(p._createdAt || Date.now()).toISOString()}</lastmod>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;
    
    fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), sitemapContent);
    console.log("Generated sitemap.xml");

    // Generate robots.txt
    const robotsContent = `User-agent: *
Allow: /

Sitemap: https://nodeflow.ai/sitemap.xml`;
    fs.writeFileSync(path.join(process.cwd(), 'robots.txt'), robotsContent);
    console.log("Generated robots.txt");

    console.log("Done generating all static files locally!");
}

build().catch(console.error);
