        // ══════════════════════════════════════════════════════════
        // SANITY CMS — Read-only client
        // Fetches public data from Sanity API. Falls back to
        // empty arrays when dataset is empty or unreachable.
        // ══════════════════════════════════════════════════════════
        const SANITY_PROJECT_ID = 'si810ffl';
        const SANITY_DATASET    = 'posts-1';
        const SANITY_API_VER    = '2024-01-01';
        const SANITY_API        = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;

        /**
         * Execute a GROQ query against the Sanity API.
         * Returns the result array, or null on failure.
         */
        async function sanityFetch(query) {
            try {
                const url = `${SANITY_API}?query=${encodeURIComponent(query)}`;
                const res = await fetch(url);
                if (!res.ok) { console.warn('[Sanity] HTTP', res.status, res.statusText); return null; }
                const json = await res.json();
                return json.result ?? null;
            } catch (e) {
                console.warn('[Sanity] Fetch failed:', e.message);
                return null;
            }
        }

        /**
         * Format an ISO date string or timestamp into display format.
         */
        function formatSanityDate(isoDate) {
            if (!isoDate) return '';
            const d = new Date(isoDate);
            if (isNaN(d.getTime())) return isoDate;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        /**
         * Convert a Sanity Portable Text (block array) into HTML.
         * Handles basic block types: normal, h1-h6, blockquote,
         * bulleted/numbered lists, code blocks, and inline marks.
         * If content is already an HTML string, returns it as-is.
         */
        function portableTextToHtml(blocks) {
            if (!blocks) return '';
            if (typeof blocks === 'string') return blocks;
            if (!Array.isArray(blocks)) return '';

            let html = '';
            let listType = null;

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];

                // Close previous list if style changed
                if (listType && (!block.listItem || block.listItem !== listType)) {
                    html += listType === 'bullet' ? '</ul>' : '</ol>';
                    listType = null;
                }

                if (block._type === 'block') {
                    const text = renderSpans(block.children || []);
                    const style = block.style || 'normal';

                    if (block.listItem) {
                        if (!listType || listType !== block.listItem) {
                            listType = block.listItem;
                            html += listType === 'bullet' ? '<ul>' : '<ol>';
                        }
                        html += `<li>${text}</li>`;
                    } else if (style === 'normal') {
                        html += `<p>${text}</p>`;
                    } else if (/^h[1-6]$/.test(style)) {
                        html += `<${style}>${text}</${style}>`;
                    } else if (style === 'blockquote') {
                        html += `<blockquote>${text}</blockquote>`;
                    } else {
                        html += `<p>${text}</p>`;
                    }
                } else if (block._type === 'code') {
                    html += `<pre><code>${escapeHtml(block.code || '')}</code></pre>`;
                }
            }

            // Close trailing list
            if (listType) {
                html += listType === 'bullet' ? '</ul>' : '</ol>';
            }
            return html;
        }

        function renderSpans(children) {
            return children.map(child => {
                if (child._type !== 'span') return '';
                let text = escapeHtml(child.text || '');
                const marks = child.marks || [];
                marks.forEach(m => {
                    if (m === 'strong') text = `<strong>${text}</strong>`;
                    else if (m === 'em') text = `<em>${text}</em>`;
                    else if (m === 'code') text = `<code>${text}</code>`;
                    else if (m === 'underline') text = `<u>${text}</u>`;
                    else if (m === 'strike-through') text = `<s>${text}</s>`;
                });
                return text;
            }).join('');
        }

        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // SVG icons as strings for workflow node display
        const NODE_ICONS = {
            schedule: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
            gmail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
            filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
            ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>`,
            format: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
            slack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="2" width="3" height="8" rx="1.5"/><path d="M19 8.5C19 10 17.88 11 16.5 11S14 10 14 8.5V5a1.5 1.5 0 0 1 3 0v3.5z"/><rect x="8" y="13" width="3" height="8" rx="1.5"/><path d="M5 15.5C5 14 6.12 13 7.5 13S10 14 10 15.5V19a1.5 1.5 0 0 1-3 0v-3.5z"/><rect x="2" y="8" width="8" height="3" rx="1.5"/><path d="M8.5 5C10 5 11 6.12 11 7.5S10 10 8.5 10H5a1.5 1.5 0 0 1 0-3h3.5z"/><rect x="13" y="13" width="8" height="3" rx="1.5"/><path d="M15.5 19C14 19 13 17.88 13 16.5S14 14 15.5 14H19a1.5 1.5 0 0 1 0 3h-3.5z"/></svg>`,
            webhook: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 0 0 3-3 3 3 0 0 0-3-3 3 3 0 0 0-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9a3 3 0 0 0-3 3 3 3 0 0 0 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>`,
            notion: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M8 10h8M8 14h5"/></svg>`,
            code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
            vector: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v8"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`,
            telegram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>`,
            airtable: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
            sheets: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
            drive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
            embed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
            rss: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`,
            globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
            diff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
            form: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,
        };

        // Convert Sanity image asset ref → CDN URL (with crop & hotspot support)
        function sanityImageUrl(thumbnail, width) {
            if (!thumbnail || !thumbnail.asset || !thumbnail.asset._ref) return '';
            const ref = thumbnail.asset._ref;
            const parts = ref.replace('image-', '').split('-');
            const ext = parts.pop();
            const dimensions = parts.pop();
            const hash = parts.join('-');
            let url = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${hash}-${dimensions}.${ext}`;
            const params = [];
            if (width) params.push(`w=${width}`);
            params.push('fit=crop', 'auto=format');

            // Apply crop rect from Studio crop tool
            const crop = thumbnail.crop;
            if (crop && (crop.top || crop.bottom || crop.left || crop.right)) {
                const [origW, origH] = dimensions.split('x').map(Number);
                const left = Math.round((crop.left || 0) * origW);
                const top = Math.round((crop.top || 0) * origH);
                const w = Math.round((1 - (crop.left || 0) - (crop.right || 0)) * origW);
                const h = Math.round((1 - (crop.top || 0) - (crop.bottom || 0)) * origH);
                params.push(`rect=${left},${top},${w},${h}`);
            }

            // Apply hotspot focal point
            const hotspot = thumbnail.hotspot;
            if (hotspot && hotspot.x != null && hotspot.y != null) {
                params.push(`fp-x=${hotspot.x}`, `fp-y=${hotspot.y}`);
            }

            url += '?' + params.join('&');
            return url;
        }

        // ── Posts (populated from Sanity CMS) ──
        let posts = [];

        function clearHomeSearch(refocus = true) {
            const input = document.getElementById('home-search-input');
            const resultsPanel = document.getElementById('home-search-results');
            const clearBtn = document.getElementById('search-clear-x');
            input.value = '';
            resultsPanel.style.display = 'none';
            resultsPanel.innerHTML = '';
            if (clearBtn) clearBtn.style.display = 'none';
            document.getElementById('home-blog-section').style.display = '';
            if (refocus) input.focus();
        }

        function imgPlaceholder(thumbnail) {
            const thumbUrl = thumbnail ? sanityImageUrl(thumbnail, 300) : '';
            if (thumbUrl) {
                return `<img class="blog-card-thumb-img" src="${thumbUrl}" alt="" loading="lazy">`;
            }
            return `<div class="img-placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  </div>`;
        }

        function handleHomeSearch(query) {
            const resultsPanel = document.getElementById('home-search-results');
            const clearBtn = document.getElementById('search-clear-x');
            const blogSection = document.getElementById('home-blog-section');

            if (clearBtn) clearBtn.style.display = query.trim() ? 'flex' : 'none';

            if (!query.trim()) {
                resultsPanel.style.display = 'none';
                resultsPanel.innerHTML = '';
                blogSection.style.display = '';
                return;
            }

            blogSection.style.display = 'none';
            resultsPanel.style.display = 'block';

            const q = query.toLowerCase();
            const matched = posts.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.tags.some(t => t.toLowerCase().includes(q)) ||
                p.excerpt.toLowerCase().includes(q)
            );

            if (matched.length === 0) {
                resultsPanel.innerHTML =
                    `<div style="padding:24px 16px;font-size:13px;color:var(--ink4);font-weight:400;max-width:var(--max-w);margin:0 auto">No results for "${query}"</div>`;
                return;
            }

            resultsPanel.innerHTML = `<div class="feed" style="padding-top:8px">` + matched.map(p => {
                return `<div class="blog-card" onclick="window.location.href='/blog/'+encodeURIComponent('${p.slug}')">
      <div class="blog-card-left">
        <div class="blog-card-title">${p.title}</div>
        <div class="blog-card-excerpt">${(p.excerpt || p.content || '').replace(/<[^>]+>/g, '').substring(0, 600)}</div>
        <div class="blog-card-meta">
          <span>${p.date}</span>
        </div>
      </div>
      <div class="blog-card-thumb">
        ${imgPlaceholder(p.thumbnail)}
      </div>
    </div>`;
            }).join('') + `</div>`;
        }

        function goBack() {
            showPage(prevPage || 'home-page');
        }

        // Navigate to the standalone blog page
        function showPost(slug) {
            window.location.href = '/blog/' + encodeURIComponent(slug);
        }

        function sharePost(title) {
            const url = window.location.href;
            if (navigator.share) {
                navigator.share({ title: title, url: url }).catch(() => {});
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    const toast = document.createElement('div');
                    toast.innerText = 'Link copied to clipboard';
                    toast.style.cssText =
                        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:999;';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                });
            }
        }

        // popstate: go home if no specific state
        window.addEventListener('popstate', () => {
            showPage('home-page');
        });

        // ── Featured Widget: always shows the 4 most recent posts ──────────
        function getFeaturedIndices() {
            const count = Math.min(4, posts.length);
            return Array.from({ length: count }, (_, i) => i);
        }

        let blogCarouselCurrent = 0;
        let blogCarouselTimer = null;

        function buildBlogCarousel() {
            const track = document.getElementById('blog-carousel-track');
            const dotsEl = document.getElementById('blog-carousel-dots');
            if (!track || !dotsEl) return;

            const featuredIndices = getFeaturedIndices();

            track.innerHTML = featuredIndices.map(idx => {
                const p = posts[idx];
                return `<div class="blog-carousel-slide" onclick="window.location.href='/blog/'+encodeURIComponent('${p.slug}')">
      <div class="blog-card-left">
        <div class="blog-card-title">${p.title}</div>
        <div class="blog-card-excerpt">${p.content.replace(/<[^>]+>/g, '').substring(0, 600)}</div>
        <div class="blog-card-meta">
          <span>${p.date}</span>
        </div>
      </div>
      <div class="blog-card-thumb">
        ${imgPlaceholder(p.thumbnail)}
      </div>
    </div>`;
            }).join('');

            dotsEl.innerHTML = featuredIndices.map((_, i) =>
                `<div class="blog-carousel-dot${i === 0 ? ' active' : ''}" onclick="goToBlogCarousel(${i})"></div>`
            ).join('');

            // Ensure the current index is within bounds
            blogCarouselCurrent = 0;
            goToBlogCarousel(0);
            startBlogCarouselTimer();
        }

        function goToBlogCarousel(idx) {
            const track = document.getElementById('blog-carousel-track');
            const featuredCount = getFeaturedIndices().length;
            if (!track || featuredCount === 0) return;
            idx = ((idx % featuredCount) + featuredCount) % featuredCount; // wrap
            blogCarouselCurrent = idx;
            track.style.transform = `translateX(-${idx * 100}%)`;
            document.querySelectorAll('.blog-carousel-dot').forEach((d, i) => {
                d.classList.toggle('active', i === idx);
            });
        }

        function startBlogCarouselTimer() {
            if (blogCarouselTimer) clearInterval(blogCarouselTimer);
            // No auto-rotation on desktop — all slides visible as rows
            const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
            if (isDesktop) return;
            const featuredCount = getFeaturedIndices().length;
            if (featuredCount <= 1) return;
            blogCarouselTimer = setInterval(() => {
                const next = (blogCarouselCurrent + 1) % featuredCount;
                goToBlogCarousel(next);
            }, 4000);
        }

        // ── Touch / Swipe Support for Blog Carousel ──────────────────────────
        function initBlogCarouselTouch() {
            const carousel = document.querySelector('.blog-featured-carousel');
            if (!carousel) return;
            let startX = 0,
                startY = 0;
            carousel.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });
            carousel.addEventListener('touchend', (e) => {
                const deltaX = e.changedTouches[0].clientX - startX;
                const deltaY = e.changedTouches[0].clientY - startY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    const dir = deltaX < 0 ? 1 : -1;
                    const featuredCount = getFeaturedIndices().length;
                    const next = (blogCarouselCurrent + dir + featuredCount) % featuredCount;
                    goToBlogCarousel(next);
                    startBlogCarouselTimer();
                }
            });
        }

        // ── For You section: displays ALL posts ────────────────────────────
        function buildRecentArticles() {
            const container = document.getElementById('blog-recent-list');
            if (!container) return;

            const items = [];
            let cardCount = 0;

            const maybeInsertAd = () => {
                cardCount++;
                if (cardCount % 4 === 0 && cardCount !== posts.length) {
                    items.push(`<div class="ad-placeholder-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span>Advertisement</span>
      </div>`);
                }
            };

            posts.forEach(p => {
                items.push(`<div class="blog-card" onclick="window.location.href='/blog/'+encodeURIComponent('${p.slug}')">
      <div class="blog-card-left">
        <div class="blog-card-title">${p.title}</div>
        <div class="blog-card-excerpt">${p.content.replace(/<[^>]+>/g, '').substring(0, 600)}</div>
        <div class="blog-card-meta">
          <span>${p.date}</span>
        </div>
      </div>
      <div class="blog-card-thumb">
        ${imgPlaceholder(p.thumbnail)}
      </div>
    </div>`);
                maybeInsertAd();
            });

            container.innerHTML = items.join('');
        }

        // ── Announcement Bar ──────────────────────────────────────────────────
        let announcements = [];
        let announceIdx = 0;
        let announceTimer = null;
        let isAnnouncing = false;

        function cycleAnnouncement() {
            if (isAnnouncing || announcements.length === 0) return;
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

        function startAnnounceTimer() {
            if (announceTimer) clearInterval(announceTimer);
            if (announcements.length > 1) {
                announceTimer = setInterval(cycleAnnouncement, 4500);
            }
        }

        // Real-time Notifications Builder
        function buildNotifications() {
            const notifList = document.querySelector('.notif-list');
            const notifDot = document.querySelector('.notif-dot');
            if (!notifList) return;
            
            notifList.innerHTML = '';
            
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            
            const recentPosts = posts.filter(p => {
                const postDate = new Date(p.date).getTime();
                return (now - postDate) <= oneDayMs;
            });
            
            if (recentPosts.length === 0) {
                notifList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--ink4); font-size: 13px;">No new notifications</div>';
                if (notifDot) notifDot.style.display = 'none';
                return;
            }
            
            if (notifDot) notifDot.style.display = 'block';

            recentPosts.slice(0, 5).forEach(post => {
                const diff = Math.floor((now - new Date(post.date).getTime()) / 3600000);
                const timeText = diff <= 0 ? 'Just now' : diff + ' hours ago';
                
                const notifHTML = `
                <a href="/blog/${post.slug}" class="notif-item unread" style="text-decoration: none; color: inherit; display: flex;">
                    <div class="notif-icon workflow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                    </div>
                    <div class="notif-text">
                        <p><strong>New post published:</strong> ${post.title}</p>
                        <time>${timeText}</time>
                    </div>
                    <div class="notif-unread-dot"></div>
                </a>`;
                notifList.insertAdjacentHTML('beforeend', notifHTML);
            });
        }

        // ── Search toggle ─────────────────────────────────────────────────────
        function toggleHomeSearch() {
            const wrap = document.getElementById('home-search-wrap');
            const btn = document.getElementById('home-search-toggle');
            const input = document.getElementById('home-search-input');
            const isOpen = wrap.classList.contains('search-open');

            if (isOpen) {
                clearHomeSearch(false);
                wrap.classList.remove('search-open');
                btn.classList.remove('active');
            } else {
                wrap.classList.add('search-open');
                btn.classList.add('active');
                setTimeout(() => input.focus(), 220);
            }
        }

        // ── Blog navigation ───────────────────────────────────────────────────
        function goBackBlog() {
            showPage('home-page');
        }


        // ── Sanity → UI data transformer ─────────────────────────────────────
        function mapSanityPosts(docs) {
            return docs.map(doc => ({
                slug: (doc.slug && doc.slug.current) || doc.slug || '',
                tags: doc.tags || [],
                title: doc.title || '',
                date: formatSanityDate(doc._createdAt) || '',
                content: window.DOMPurify ? DOMPurify.sanitize(portableTextToHtml(doc.content)) : portableTextToHtml(doc.content),
                thumbnail: doc.thumbnail || null
            }));
        }

        // ── Init (async — fetches from Sanity) ──────────────────────────────
        document.addEventListener('DOMContentLoaded', async () => {
            const blogSection = document.getElementById('home-blog-section');
            if (blogSection) blogSection.classList.add('loading');

            try {
                const sanityPosts = await sanityFetch(
                    '*[_type == "post" && (publishMode == "instant" || !defined(publishMode) || (publishMode == "schedule" && scheduledDate <= now()))] | order(_createdAt desc) { slug, title, tags, _createdAt, content, thumbnail }'
                );

                if (sanityPosts && sanityPosts.length > 0) {
                    posts = mapSanityPosts(sanityPosts);
                    console.log(`[Sanity] Loaded ${posts.length} posts`);
                } else {
                    console.log('[Sanity] No posts found');
                }
                
                // Fetch dynamic announcements
                const sanityAnnouncements = await sanityFetch('*[_type == "announcement" && isActive == true]');
                if (sanityAnnouncements && sanityAnnouncements.length > 0) {
                    const megaphoneIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                    announcements = sanityAnnouncements.map(a => ({
                        icon: megaphoneIcon,
                        text: a.text
                    }));
                } else {
                    document.getElementById('announce-bar').style.display = 'none';
                }
                
                if (announcements.length > 0) {
                    document.getElementById('announce-text').innerHTML = announcements[0].icon + ' <span>' + announcements[0].text + '</span>';
                }

            } catch (e) {
                console.warn('[Sanity] Init error:', e.message);
            }

            if (blogSection) blogSection.classList.remove('loading');
            buildBlogCarousel();
            buildRecentArticles();
            buildNotifications();
            initBlogCarouselTouch();
            startAnnounceTimer();

            // Handle direct slug URL on page load
            const path = window.location.pathname;
            // Removed client-side redirection for /blog/ because they are now served statically
        });

        // ── Rebuild on viewport change (desktop ↔ mobile) ────────────────────
        let _lastDesktop = window.matchMedia('(min-width: 1024px)').matches;
        window.addEventListener('resize', (() => {
            let timer;
            return () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    const nowDesktop = window.matchMedia('(min-width: 1024px)').matches;
                    if (nowDesktop !== _lastDesktop) {
                        _lastDesktop = nowDesktop;
                        buildBlogCarousel();
                    }
                }, 200);
            };
        })());
