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

export function generateStaticHtml(postData, seoData, imageUrl, workflowUrl, recommendedPosts = [], siteUrl = 'https://nodeflow.ai') {
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

              ${workflowUrl ? `<a href="${workflowUrl}?dl=workflow.json" class="wf-btn wf-btn-primary" style="display:inline-flex; align-items:center; gap:8px; margin-top: 20px; padding: 12px 24px; background: var(--green); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid var(--green); transition: opacity 0.2s;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download n8n Workflow</a>` : ''}
              
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
              ${recommendHTML}
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="global-footer">
        <div class="footer-inner">
            <div class="footer-logo">node<span>flow</span></div>
            <p class="footer-desc">The ultimate library for n8n workflows and automations.</p>
            <div class="footer-links">
                <a href="/">Home</a>
                <a href="#">About</a>
                <a href="#">Submit a Workflow</a>
                <a href="#">Terms</a>
                <a href="#">Privacy</a>
            </div>
            <div class="footer-copyright">
                &copy; ${new Date().getFullYear()} NodeFlow.ai. All rights reserved.
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
    const announcements = [
        { icon: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>\`, text: 'NodeFlow v2 is live — explore 50+ new n8n workflow templates' },
        { icon: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>\`, text: 'New blog post: Complete Guide to AI Agents with n8n in 2025' },
        { icon: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>\`, text: 'Most popular this week: RAG chatbot over Google Drive — 2.1K downloads' },
        { icon: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\`, text: 'New workflows added daily — bookmark nodeflow.ai and never miss a drop' },
    ];
    let announceIdx = 0;
    let isAnnouncing = false;

    function cycleAnnouncement() {
        if (isAnnouncing) return;
        isAnnouncing = true;
        const el = document.getElementById('announce-text');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => {
            announceIdx = (announceIdx + 1) % announcements.length;
            el.innerHTML = announcements[announceIdx].icon + ' <span>' + announcements[announceIdx].text + '</span>';
            el.style.opacity = '1';
            isAnnouncing = false;
        }, 400);
    }

    (function initAnnounce() {
        const el = document.getElementById('announce-text');
        if (el) {
            el.innerHTML = announcements[0].icon + ' <span>' + announcements[0].text + '</span>';
            setInterval(cycleAnnouncement, 4500);
        }
    })();
</script>
</body>
</html>`;
}
