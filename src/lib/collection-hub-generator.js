/**
 * BookSmart - Public Link Hub / Bento Page Generator
 * Generates standalone, self-contained HTML portfolio & linktree pages from collections.
 * Zero external CDN dependencies - 100% portable for GitHub Pages, Vercel, Netlify, or local hosting.
 */

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeHref(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
        return escapeHtml(trimmed);
    }
    return '#';
}

function getDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/**
 * Generates a full standalone HTML string for a collection.
 *
 * @param {object} collection Collection metadata { id, name, icon, color }
 * @param {Array<object>} bookmarks Array of bookmark objects
 * @param {object} [options]
 * @param {'bento'|'linktree'|'cards'} [options.layout='bento'] Layout type
 * @param {string} [options.accentColor] Custom accent color
 * @param {string} [options.bio] Header bio or subtitle
 * @param {string} [options.author] Author name or handle
 * @param {boolean} [options.includeSearch=true] Whether to include the client-side search bar
 * @param {'dark'|'light'|'auto'} [options.defaultTheme='auto'] Default theme mode
 * @returns {string} Standalone HTML document
 */
export function generateCollectionHubHtml(collection, bookmarks = [], options = {}) {
    const layout = options.layout || 'bento';
    const name = escapeHtml(collection?.name || 'Bookmarks Collection');
    const icon = collection?.icon || '📚';
    const accentColor = options.accentColor || collection?.color || '#6366f1';
    const bio = escapeHtml(options.bio || '');
    const author = escapeHtml(options.author || '');
    const includeSearch = options.includeSearch !== false;
    const defaultTheme = options.defaultTheme || 'auto';
    const bookmarkCount = bookmarks.length;
    const exportDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en" data-theme="${defaultTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${icon} ${name}</title>
  <meta name="description" content="${bio || `${name} - Curated collection of ${bookmarkCount} links`}" />
  <meta property="og:title" content="${icon} ${name}" />
  <meta property="og:description" content="${bio || `Curated collection of ${bookmarkCount} links`}" />
  <meta property="og:type" content="website" />
  <meta name="generator" content="BookSmart" />
  <style>
    :root {
      --accent: ${accentColor};
      --accent-glow: ${accentColor}33;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    [data-theme="light"], :root:not([data-theme="dark"]) {
      --bg: #f8fafc;
      --card-bg: rgba(255, 255, 255, 0.85);
      --card-border: rgba(226, 232, 240, 0.9);
      --card-hover: rgba(255, 255, 255, 1);
      --text: #0f172a;
      --text-muted: #64748b;
      --tag-bg: rgba(99, 102, 241, 0.08);
      --tag-text: #4f46e5;
      --input-bg: #ffffff;
      --input-border: #cbd5e1;
      --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      --shadow-hover: 0 12px 28px -4px rgba(0, 0, 0, 0.1);
    }

    @media (prefers-color-scheme: dark) {
      :root[data-theme="auto"] {
        --bg: #090d16;
        --card-bg: rgba(17, 24, 39, 0.75);
        --card-border: rgba(255, 255, 255, 0.08);
        --card-hover: rgba(30, 41, 59, 0.9);
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --tag-bg: rgba(99, 102, 241, 0.18);
        --tag-text: #a5b4fc;
        --input-bg: rgba(17, 24, 39, 0.9);
        --input-border: rgba(255, 255, 255, 0.15);
        --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
        --shadow-hover: 0 12px 32px -4px rgba(0, 0, 0, 0.5);
      }
    }

    [data-theme="dark"] {
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(30, 41, 59, 0.9);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --tag-bg: rgba(99, 102, 241, 0.18);
      --tag-text: #a5b4fc;
      --input-bg: rgba(17, 24, 39, 0.9);
      --input-border: rgba(255, 255, 255, 0.15);
      --shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
      --shadow-hover: 0 12px 32px -4px rgba(0, 0, 0, 0.5);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 32px 16px;
      line-height: 1.5;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    /* Ambient background glowing orbs */
    .ambient-bg {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 350px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      opacity: 0.8;
      filter: blur(40px);
    }

    .container {
      width: 100%;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      ${layout === 'linktree' ? 'max-width: 620px;' : 'max-width: 1080px;'}
    }

    /* Top navigation / Theme toggle */
    .top-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 24px;
    }
    .theme-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    }
    .theme-btn:hover {
      transform: scale(1.05);
      border-color: var(--accent);
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 36px;
    }
    .header-icon {
      font-size: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--shadow);
      margin-bottom: 16px;
      backdrop-filter: blur(8px);
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .header .bio {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 560px;
      margin: 0 auto 12px;
    }
    .header-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--card-bg);
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid var(--card-border);
    }

    /* Search Bar */
    .search-box {
      margin-bottom: 28px;
      position: relative;
    }
    .search-box input {
      width: 100%;
      padding: 12px 18px 12px 42px;
      border-radius: 14px;
      border: 1px solid var(--input-border);
      background: var(--input-bg);
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
      box-shadow: var(--shadow);
    }
    .search-box input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      fill: none;
      stroke: var(--text-muted);
      stroke-width: 2;
    }

    /* Links Grid: Bento Style */
    ${layout === 'bento' ? `
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .link-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .link-card:hover {
      transform: translateY(-3px);
      background: var(--card-hover);
      border-color: var(--accent);
      box-shadow: var(--shadow-hover);
    }
    .card-top {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .card-favicon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(128, 128, 128, 0.1);
      padding: 4px;
      flex-shrink: 0;
      object-fit: contain;
    }
    .card-title {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-domain {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .card-note {
      font-size: 12.5px;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: auto;
    }
    ` : ''}

    /* Links Grid: Linktree / Minimal Style */
    ${layout === 'linktree' ? `
    .links-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .link-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 9999px;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    }
    .link-card:hover {
      transform: scale(1.015);
      background: var(--card-hover);
      border-color: var(--accent);
      box-shadow: var(--shadow-hover);
    }
    .card-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1;
    }
    .card-favicon {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .card-title {
      font-size: 14.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arrow-icon {
      width: 16px;
      height: 16px;
      stroke: var(--text-muted);
      stroke-width: 2;
      fill: none;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    .link-card:hover .arrow-icon {
      stroke: var(--accent);
      transform: translateX(3px);
    }
    ` : ''}

    /* Links Grid: Cards Style */
    ${layout === 'cards' ? `
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .link-card {
      display: flex;
      flex-direction: column;
      padding: 22px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
      transition: all 0.25s ease;
    }
    .link-card:hover {
      transform: translateY(-4px);
      background: var(--card-hover);
      border-color: var(--accent);
      box-shadow: var(--shadow-hover);
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .card-favicon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }
    .card-domain {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .card-note {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 14px;
      flex: 1;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    ` : ''}

    .tag-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--tag-bg);
      color: var(--tag-text);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--text-muted);
      font-size: 14px;
      display: none;
    }

    /* Footer */
    .footer {
      margin-top: auto;
      padding-top: 48px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
    .footer a {
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="ambient-bg"></div>

  <div class="container">
    <div class="top-bar">
      <button class="theme-btn" id="theme-toggle" title="Toggle dark/light mode" aria-label="Toggle dark/light mode">
        <svg id="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        <svg id="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      </button>
    </div>

    <header class="header">
      <div class="header-icon">${icon}</div>
      <h1>${name}</h1>
      ${bio ? `<p class="bio">${bio}</p>` : ''}
      <div class="header-meta">
        <span id="link-count">${bookmarkCount} links</span>
        ${author ? `<span>• by ${author}</span>` : ''}
        <span>• ${exportDate}</span>
      </div>
    </header>

    ${includeSearch ? `
    <div class="search-box">
      <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="search" id="hub-search" placeholder="Search links or tags..." autocomplete="off" />
    </div>
    ` : ''}

    <main class="links-grid layout-${layout}" data-layout="${layout}" id="links-container">
      ${bookmarks.map(b => {
        const title = escapeHtml(b.title || b.url);
        const url = sanitizeHref(b.url);
        const domain = escapeHtml(getDomain(b.url));
        const note = escapeHtml(b.note || '');
        const tags = Array.isArray(b.tags) ? b.tags : [];
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

        if (layout === 'linktree') {
            return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-card" data-title="${title.toLowerCase()}" data-domain="${domain.toLowerCase()}" data-tags="${tags.join(' ').toLowerCase()}">
        <div class="card-left">
          <img src="${faviconUrl}" alt="" class="card-favicon" loading="lazy" onerror="this.style.display='none'" />
          <div class="card-title">${title}</div>
        </div>
        <svg class="arrow-icon" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </a>`;
        }

        if (layout === 'cards') {
            return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-card" data-title="${title.toLowerCase()}" data-domain="${domain.toLowerCase()}" data-tags="${tags.join(' ').toLowerCase()}" data-note="${note.toLowerCase()}">
        <div class="card-top">
          <img src="${faviconUrl}" alt="" class="card-favicon" loading="lazy" onerror="this.style.display='none'" />
          <span class="card-domain">${domain}</span>
        </div>
        <h3 class="card-title">${title}</h3>
        ${note ? `<p class="card-note">${note}</p>` : ''}
        ${tags.length > 0 ? `<div class="card-tags">${tags.map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </a>`;
        }

        // Default 'bento' layout
        return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-card" data-title="${title.toLowerCase()}" data-domain="${domain.toLowerCase()}" data-tags="${tags.join(' ').toLowerCase()}" data-note="${note.toLowerCase()}">
        <div>
          <div class="card-top">
            <img src="${faviconUrl}" alt="" class="card-favicon" loading="lazy" onerror="this.style.display='none'" />
            <div>
              <div class="card-title">${title}</div>
              <div class="card-domain">${domain}</div>
            </div>
          </div>
          ${note ? `<div class="card-note">${note}</div>` : ''}
        </div>
        ${tags.length > 0 ? `<div class="card-tags">${tags.map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </a>`;
    }).join('\n')}
    </main>

    <div class="empty-state" id="empty-state">
      No matching links found.
    </div>

    <footer class="footer">
      <p>Curated with <a href="https://github.com/GhostKozak/booksmart" target="_blank" rel="noopener noreferrer">BookSmart</a></p>
    </footer>
  </div>

  <script>
    // Theme toggle
    const root = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    function updateIcons(isDark) {
      if (sunIcon && moonIcon) {
        sunIcon.style.display = isDark ? 'block' : 'none';
        moonIcon.style.display = isDark ? 'none' : 'block';
      }
    }

    const savedTheme = localStorage.getItem('hub-theme');
    if (savedTheme) {
      root.setAttribute('data-theme', savedTheme);
      updateIcons(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      updateIcons(prefersDark);
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('hub-theme', next);
        updateIcons(next === 'dark');
      });
    }

    // Client-side instant search
    const searchInput = document.getElementById('hub-search');
    const cards = Array.from(document.querySelectorAll('.link-card'));
    const emptyState = document.getElementById('empty-state');
    const linkCountBadge = document.getElementById('link-count');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        cards.forEach(card => {
          const title = card.getAttribute('data-title') || '';
          const domain = card.getAttribute('data-domain') || '';
          const tags = card.getAttribute('data-tags') || '';
          const note = card.getAttribute('data-note') || '';

          const match = !q || title.includes(q) || domain.includes(q) || tags.includes(q) || note.includes(q);
          card.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });

        if (emptyState) {
          emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        }
        if (linkCountBadge) {
          linkCountBadge.textContent = visibleCount + ' links';
        }
      });
    }
  </script>
</body>
</html>`;
}
