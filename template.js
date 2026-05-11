function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sanityImageUrl(thumbnail, width, projectId = 'si810ffl', dataset = 'posts-1') {
  if (!thumbnail || !thumbnail.asset || !thumbnail.asset._ref) return '';
  const ref = thumbnail.asset._ref;
  const parts = ref.replace('image-', '').split('-');
  const ext = parts.pop();
  const dimensions = parts.pop();
  const hash = parts.join('-');
  let url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${dimensions}.${ext}`;
  const params = [];
  if (width) params.push(`w=${width}`);
  params.push('fit=crop', 'auto=format');

  const crop = thumbnail.crop;
  if (crop && (crop.top || crop.bottom || crop.left || crop.right)) {
      const [origW, origH] = dimensions.split('x').map(Number);
      const left = Math.round((crop.left || 0) * origW);
      const top = Math.round((crop.top || 0) * origH);
      const w = Math.round((1 - (crop.left || 0) - (crop.right || 0)) * origW);
      const h = Math.round((1 - (crop.top || 0) - (crop.bottom || 0)) * origH);
      params.push(`rect=${left},${top},${w},${h}`);
  }

  const hotspot = thumbnail.hotspot;
  if (hotspot && hotspot.x != null && hotspot.y != null) {
      params.push(`fp-x=${hotspot.x}`, `fp-y=${hotspot.y}`);
  }

  url += '?' + params.join('&');
  return url;
}

function formatSanityDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeTime(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return formatSanityDate(isoDate);
}

export function generateStaticHtml(postData, seoData, imageUrl, workflowUrl, recommendedPosts = [], siteUrl = 'https://nodeflow.ai', announcements = []) {
  const schemaLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": seoData.metaTitle,
    "datePublished": new Date().toISOString(),
    "author": { "@type": "Organization", "name": "NodeFlow Team", "url": siteUrl },
    "image": imageUrl,
    "keywords": (seoData.secondaryKeywords || []).concat([seoData.primaryKeyword]).join(", ")
  };

  // Convert basic markdown to HTML for body content
  let htmlBody = postData.content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>');

  htmlBody = htmlBody.replace(/(<li>.*<\/li>(\n<li>.*<\/li>)*)/g, '<ul>$1</ul>');

  htmlBody = htmlBody.split('\\n\\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<blockquote')) return p;
    return `<p>${p}</p>`;
  }).join('\\n');

  // Build recommendation HTML
  let recommendHTML = '';
  if (recommendedPosts && recommendedPosts.length > 0) {
      recommendHTML = `<div class="blog-recommend">
          <div class="blog-recommend-title">Recommended</div>` +
          recommendedPosts.map(rp => {
              const rpThumb = rp.thumbnail ? sanityImageUrl(rp.thumbnail, 200) : '';
              const thumbEl = rpThumb
                  ? `<img class="blog-recommend-thumb" src="${rpThumb}" alt="${escapeHtml(rp.title || '')}">`
                  : `<div class="blog-recommend-thumb"></div>`;
              const excerpt = (rp.excerpt || '').substring(0, 120);
              return `<a class="blog-recommend-card" href="/blog/${rp.slug}">
                  <div class="blog-recommend-card-left">
                      <h4>${escapeHtml(rp.title || '')}</h4>
                      <p class="recommend-excerpt">${escapeHtml(excerpt)}</p>
                      <p class="recommend-date">${relativeTime(rp._createdAt)}</p>
                  </div>
                  ${thumbEl}
              </a>`;
          }).join('') +
      `</div>`;
  }

  const postExcerpt = postData.content.replace(/<[^>]+>/g, '').substring(0, 200).trim();
  const displayExcerpt = postExcerpt ? postExcerpt + (postExcerpt.length >= 200 ? '…' : '') : '';
  const postDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Safe share title
  const shareTitle = escapeHtml(postData.title).replace(/'/g, "\\\\'");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(seoData.metaTitle)} — NodeFlow</title>
<meta name="description" content="${escapeHtml(seoData.metaDescription)}">
<link rel="canonical" href="${siteUrl}/blog/${postData.slug}">
<link rel="icon" href="/favicon.ico">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:url" content="${siteUrl}/blog/${postData.slug}">
<meta property="og:title" content="${escapeHtml(seoData.metaTitle)}">
<meta property="og:description" content="${escapeHtml(seoData.metaDescription)}">
<meta property="og:image" content="${imageUrl}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${siteUrl}/blog/${postData.slug}">
<meta property="twitter:title" content="${escapeHtml(seoData.metaTitle)}">
<meta property="twitter:description" content="${escapeHtml(seoData.metaDescription)}">
<meta property="twitter:image" content="${imageUrl}">

<script type="application/ld+json">
  ${JSON.stringify(schemaLd)}
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<style>
    body { background: #f4f4f4; }
    .blog-page-wrap { min-height: 100vh; display: flex; flex-direction: column; }
    .blog-page-content { flex: none; }

    .blog-hero-wrap {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 0;
        margin: 18px 0;
        overflow: hidden;
        background: var(--surface3);
    }
    .blog-hero-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .blog-recommend {
        background: #fff;
        border-radius: var(--card-radius);
        padding: 0;
        margin-top: 18px;
        overflow: hidden;
    }
    .blog-recommend-title {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: var(--ink4);
        padding: 16px 18px 0;
        margin-bottom: 0;
    }
    .blog-recommend-card {
        display: flex;
        gap: 14px;
        padding: 18px;
        border-top: 1px solid var(--border);
        text-decoration: none;
        color: inherit;
        transition: background 0.15s;
        align-items: stretch;
    }
    .blog-recommend-card:first-of-type { border-top: none; margin-top: 12px; }
    .blog-recommend-card:hover { background: var(--surface2); }
    .blog-recommend-card-left {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }
    .blog-recommend-card-left h4 {
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: var(--ink);
        line-height: 1.3;
        margin: 0 0 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .blog-recommend-card-left .recommend-excerpt {
        font-size: 12px;
        color: var(--ink3);
        line-height: 1.5;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        flex: 1;
    }
    .blog-recommend-card-left .recommend-date {
        font-size: 11px;
        color: var(--ink4);
        margin: 0;
        padding-top: 8px;
        border-top: 1px solid var(--border);
        margin-top: 8px;
    }
    .blog-recommend-thumb {
        width: 100px;
        height: 70px;
        border-radius: 6px;
        object-fit: cover;
        background: var(--surface3);
        flex-shrink: 0;
        align-self: center;
    }
</style>
</head>
<body>

<div class="blog-page-wrap">

    <!-- Announcement Bar -->
    <div class="announce-bar" id="announce-bar">
        <div class="announce-inner">
            <span class="announce-text" id="announce-text"></span>
            <span class="announce-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
        </div>
    </div>

    <!-- Nav -->
    <nav class="nav">
        <a href="/" class="nav-logo" style="cursor:pointer;text-decoration:none">node<span>flow</span></a>
    </nav>

    <!-- Blog content area -->
    <div class="blog-page-content">
        <div class="blog-post-inner" id="blog-post-content">
            <div class="blog-post-main">
              <div class="blog-post-tag-row">
                <!-- Tags could go here if added to postData -->
              </div>
              <h1 class="blog-post-title">${escapeHtml(postData.title)}</h1>
              ${displayExcerpt ? `<p class="blog-post-description">${escapeHtml(displayExcerpt)}</p>` : ''}
              
              <div class="blog-post-meta">
                <span>${postDate}</span>
                <span style="color:var(--ink5)">·</span>
                <span class="blog-post-attribution">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span>By</span>
                  <a href="https://nodeflow.ai" target="_blank" rel="noopener">nodeflow.ai</a>
                </span>
                <button class="wf-btn wf-btn-outline" style="margin-left:auto" onclick="sharePost('${shareTitle}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>

              
              <div class="blog-hero-wrap">
                  <img class="blog-hero-img" src="${imageUrl}" alt="${escapeHtml(postData.title)}">
              </div>
              
              <div class="blog-post-prose" style="margin-top:18px">
                ${htmlBody}
              </div>
            </div>

            <!-- FAQs dynamically generated -->
            ${seoData.faqs && seoData.faqs.length > 0 ? `
            <div class="blog-post-faq">
              <h2>Frequently Asked Questions</h2>
              ${seoData.faqs.map(faq => `
              <details>
                <summary>${escapeHtml(faq.question)}</summary>
                <p>${escapeHtml(faq.answer)}</p>
              </details>
              `).join('')}
            </div>
            ` : ''}

            <div class="blog-post-sidebar">
              <div class="ad-placeholder-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                <span>Advertisement</span>
              </div>
              ${workflowUrl ? `
              <div style="background: #fff; border-radius: var(--card-radius); padding: 24px; margin-top: 18px; text-align: center; border: 1px solid var(--border);">
                  <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: var(--ink);">Get this workflow</h3>
                  <p style="font-size: 13px; color: var(--ink3); margin-bottom: 20px;">Download the JSON file to instantly import this automation into your n8n instance.</p>
                  <a href="${workflowUrl}?dl=workflow.json" class="wf-btn wf-btn-primary" style="display:inline-flex; width: 100%; justify-content: center; align-items:center; gap:8px; padding: 12px 24px; background: var(--green); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid var(--green); transition: opacity 0.2s;">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download JSON
                  </a>
              </div>` : ''}
              ${recommendHTML}
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="global-footer">
    <div class="footer-inner">
        <div class="footer-brand">
            <div class="footer-logo">node<span>flow</span></div>
            <p class="footer-desc">The ultimate library for n8n workflows and automations. Discover, share, and automate.</p>
        </div>
        
                <div class="footer-nav-grid">
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
        </div>
    </div>
    <div class="footer-bottom">
        <div class="footer-bottom-inner">
            <div class="footer-copyright">
                &copy; ${new Date().getFullYear()} NodeFlow.ai. All rights reserved.
            </div>
            <div class="footer-socials">
                <a href="#" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                </a>
                <a href="#" aria-label="GitHub">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                </a>
            </div>
        </div>
    </div>
</footer>
</div>

<script>
    function sharePost(title) {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => {
                const toast = document.createElement('div');
                toast.innerText = 'Link copied to clipboard';
                toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            });
        }
    }

    // Announcement Bar
    const megaphoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
    const rawAnnouncements = ${JSON.stringify(announcements || [])};
    const mappedAnnouncements = rawAnnouncements.map(a => ({ icon: megaphoneIcon, text: a.text }));
    
    if (mappedAnnouncements.length === 0) {
        const bar = document.getElementById('announce-bar');
        if (bar) bar.style.display = 'none';
    }
    let announceIdx = 0;
    let isAnnouncing = false;

    function cycleAnnouncement() {
        if (isAnnouncing) return;
        isAnnouncing = true;
        const el = document.getElementById('announce-text');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => {
            announceIdx = (announceIdx + 1) % mappedAnnouncements.length;
            el.innerHTML = mappedAnnouncements[announceIdx].icon + ' <span>' + mappedAnnouncements[announceIdx].text + '</span>';
            el.style.opacity = '1';
            isAnnouncing = false;
        }, 400);
    }

    (function initAnnounce() {
        const el = document.getElementById('announce-text');
        if (el && mappedAnnouncements.length > 0) {
            el.innerHTML = mappedAnnouncements[0].icon + ' <span>' + mappedAnnouncements[0].text + '</span>';
            if (mappedAnnouncements.length > 1) {
                setInterval(cycleAnnouncement, 4500);
            }
        }
    })();
</script>
</body>
</html>`;
}
