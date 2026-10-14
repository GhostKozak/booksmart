/**
 * Normalizes user-input URL for feeds (e.g. prepending https:// if missing).
 */
export function normalizeFeedInputUrl(input) {
    if (!input || typeof input !== 'string') return '';
    let trimmed = input.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

/**
 * Resolves a potentially relative URL against a base URL safely.
 */
export function resolveAbsoluteUrl(href, baseUrl) {
    if (!href || typeof href !== 'string') return '';
    const trimmed = href.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    try {
        return new URL(trimmed, baseUrl).href;
    } catch {
        return trimmed;
    }
}

/**
 * Strips HTML tags and normalizes whitespace for summaries.
 */
export function cleanHtmlText(htmlStr) {
    if (!htmlStr || typeof htmlStr !== 'string') return '';
    return htmlStr
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
            try { return String.fromCharCode(parseInt(hex, 16)); } catch { return ''; }
        })
        .replace(/&#(\d+);/g, (_, dec) => {
            try { return String.fromCharCode(parseInt(dec, 10)); } catch { return ''; }
        })
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses pubDate string or timestamp to epoch milliseconds.
 */
export function parsePubDate(dateStr) {
    if (!dateStr) return Date.now();
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Parses RSS 2.0, Atom 1.0, RDF, or JSON Feed into a normalized feed object.
 */
export function parseFeedXml(xmlStr, feedUrl = '') {
    if (!xmlStr || typeof xmlStr !== 'string') {
        throw new Error('Invalid XML or JSON content');
    }

    let cleanStr = xmlStr.trim();
    // Strip UTF-8 BOM if present
    if (cleanStr.charCodeAt(0) === 0xFEFF) {
        cleanStr = cleanStr.slice(1).trim();
    }

    // 1. JSON Feed Support (JSON Feed 1.1 specification)
    if (cleanStr.startsWith('{')) {
        try {
            const json = JSON.parse(cleanStr);
            if (json && (json.version?.includes('jsonfeed.org') || Array.isArray(json.items))) {
                return parseJsonFeed(json, feedUrl);
            }
        } catch {
            // Not valid JSON, continue with XML parsing
        }
    }

    // 2. XML Parsing (RSS 2.0 / Atom 1.0 / RDF)
    const parser = new DOMParser();
    let doc = parser.parseFromString(cleanStr, 'application/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        // Fallback: try parsing as text/html for lenient XML.
        // NOTE: In HTML5, `<link>` is a void element without children.
        // We replace `<link` with `<rsslink` so HTML5 DOM does not strip the link text URL!
        const preprocessed = cleanStr.replace(/<(\/?)link([\s>])/gi, '<$1rsslink$2');
        const htmlDoc = parser.parseFromString(preprocessed, 'text/html');
        if (htmlDoc.querySelector('rss, feed, channel, rdf')) {
            doc = htmlDoc;
        } else {
            throw new Error('Failed to parse feed XML: ' + parserError.textContent.slice(0, 100));
        }
    }

    const isAtom = !!doc.querySelector('feed');
    const isRss = !!doc.querySelector('rss, channel, rdf\\:RDF, RDF');

    if (!isAtom && !isRss) {
        throw new Error('Unrecognized feed format (neither RSS nor Atom)');
    }

    if (isAtom) {
        return parseAtomFeed(doc, feedUrl);
    } else {
        return parseRssFeed(doc, feedUrl);
    }
}

export function parseJsonFeed(json, feedUrl) {
    const feedTitle = json.title || 'Untitled Feed';
    const feedDescription = json.description || '';
    let siteUrl = json.home_page_url || '';
    if (!siteUrl && feedUrl) {
        try {
            siteUrl = new URL(feedUrl).origin;
        } catch {
            siteUrl = feedUrl;
        }
    }

    const items = (Array.isArray(json.items) ? json.items : []).map(item => {
        const title = item.title || 'Untitled Post';
        let link = item.url || siteUrl;
        link = resolveAbsoluteUrl(link, siteUrl || feedUrl);
        const guid = item.id ? String(item.id) : link || title;
        const rawDate = item.date_published || item.date_modified || '';
        const rawDesc = item.content_html || item.content_text || item.summary || '';
        const summary = cleanHtmlText(rawDesc).slice(0, 300);
        const author = item.authors?.[0]?.name || item.author?.name || '';

        return {
            title,
            link,
            guid,
            pubDate: parsePubDate(rawDate),
            summary,
            author,
            read: 0
        };
    });

    return {
        type: 'json',
        title: feedTitle,
        description: feedDescription,
        siteUrl,
        feedUrl,
        items
    };
}

export function parseRssFeed(doc, feedUrl) {
    const channel = doc.querySelector('channel') || doc;
    const feedTitle = channel.querySelector('title')?.textContent?.trim() || 'Untitled Feed';
    const feedDescription = channel.querySelector('description')?.textContent?.trim() || '';
    let siteUrl = channel.querySelector('rsslink')?.textContent?.trim() ||
                  channel.querySelector('link')?.textContent?.trim() ||
                  channel.querySelector('rsslink')?.getAttribute('href') ||
                  channel.querySelector('link')?.getAttribute('href') || '';

    // If channel link is relative or empty, resolve with feedUrl
    if (siteUrl && feedUrl) {
        siteUrl = resolveAbsoluteUrl(siteUrl, feedUrl);
    } else if (!siteUrl && feedUrl) {
        try {
            siteUrl = new URL(feedUrl).origin;
        } catch {
            siteUrl = feedUrl;
        }
    }

    const itemNodes = Array.from(doc.querySelectorAll('item'));
    const items = itemNodes.map(item => {
        const title = item.querySelector('title')?.textContent?.trim() || 'Untitled Post';
        
        // Extract link: check rsslink text (from HTML fallback), standard link text, or href attributes
        let link = item.querySelector('rsslink')?.textContent?.trim() ||
                   item.querySelector('link')?.textContent?.trim() ||
                   item.querySelector('rsslink')?.getAttribute('href') ||
                   item.querySelector('link')?.getAttribute('href') || '';

        const guidEl = item.querySelector('guid');
        const guidText = guidEl?.textContent?.trim() || '';

        if (!link && guidText && /^https?:\/\//i.test(guidText)) {
            link = guidText;
        }

        link = resolveAbsoluteUrl(link || siteUrl, siteUrl || feedUrl);
        const guid = guidText || link || title;

        const rawDate = item.querySelector('pubDate, dc\\:date, date')?.textContent?.trim() || '';
        const rawDesc = item.querySelector('description, content\\:encoded, encoded')?.textContent || '';
        const summary = cleanHtmlText(rawDesc).slice(0, 300);
        const author = item.querySelector('author, dc\\:creator, creator')?.textContent?.trim() || '';

        return {
            title,
            link: link || siteUrl,
            guid,
            pubDate: parsePubDate(rawDate),
            summary,
            author,
            read: 0
        };
    });

    return {
        type: 'rss',
        title: feedTitle,
        description: feedDescription,
        siteUrl,
        feedUrl,
        items
    };
}

export function parseAtomFeed(doc, feedUrl) {
    const feed = doc.querySelector('feed') || doc;
    const feedTitle = feed.querySelector('title')?.textContent?.trim() || 'Untitled Feed';
    const feedDescription = feed.querySelector('subtitle, tagline')?.textContent?.trim() || '';

    let siteUrl = '';
    const linkElems = Array.from(feed.querySelectorAll('rsslink, link'));
    const altLink = linkElems.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'));
    if (altLink) {
        siteUrl = altLink.getAttribute('href') || altLink.textContent?.trim() || '';
    }
    if (siteUrl && feedUrl) {
        siteUrl = resolveAbsoluteUrl(siteUrl, feedUrl);
    } else if (!siteUrl && feedUrl) {
        try {
            siteUrl = new URL(feedUrl).origin;
        } catch {
            siteUrl = feedUrl;
        }
    }

    const entryNodes = Array.from(doc.querySelectorAll('entry'));
    const items = entryNodes.map(entry => {
        const title = entry.querySelector('title')?.textContent?.trim() || 'Untitled Post';
        let link = '';
        const entryLinks = Array.from(entry.querySelectorAll('rsslink, link'));
        const entryAlt = entryLinks.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'));
        if (entryAlt) {
            link = entryAlt.getAttribute('href') || entryAlt.textContent?.trim() || '';
        } else if (entryLinks.length > 0) {
            link = entryLinks[0].getAttribute('href') || entryLinks[0].textContent?.trim() || '';
        }

        const id = entry.querySelector('id')?.textContent?.trim() || '';
        if (!link && id && /^https?:\/\//i.test(id)) {
            link = id;
        }

        link = resolveAbsoluteUrl(link || siteUrl, siteUrl || feedUrl);
        const guid = id || link || title;

        const rawDate = entry.querySelector('published, updated, issueDate')?.textContent?.trim() || '';
        const rawSummary = entry.querySelector('summary, content')?.textContent || '';
        const summary = cleanHtmlText(rawSummary).slice(0, 300);
        const author = entry.querySelector('author > name, author')?.textContent?.trim() || '';

        return {
            title,
            link: link || siteUrl,
            guid,
            pubDate: parsePubDate(rawDate),
            summary,
            author,
            read: 0
        };
    });

    return {
        type: 'atom',
        title: feedTitle,
        description: feedDescription,
        siteUrl,
        feedUrl,
        items
    };
}

/**
 * Attempts to autodiscover an RSS/Atom/JSON feed URL from a webpage URL or HTML.
 */
export function discoverFeedUrlFromHtml(htmlStr, baseUrl) {
    if (!htmlStr || typeof htmlStr !== 'string') return null;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');

        // Look for standard link tags (rel="alternate", rel="feed", or specific feed types)
        const linkNodes = Array.from(doc.querySelectorAll(
            'link[rel~="alternate"], link[rel~="feed"], link[type*="rss"], link[type*="atom"], link[type*="xml"], link[type*="json"]'
        ));

        for (const link of linkNodes) {
            const type = (link.getAttribute('type') || '').toLowerCase();
            const href = link.getAttribute('href');
            if (!href) continue;

            if (
                type.includes('rss+xml') ||
                type.includes('atom+xml') ||
                type.includes('application/xml') ||
                type.includes('feed+json') ||
                (type.includes('text/xml') && /\.(rss|atom|xml)$/i.test(href)) ||
                href.endsWith('/feed') ||
                href.endsWith('/rss')
            ) {
                return resolveAbsoluteUrl(href, baseUrl);
            }
        }

        // Also check anchor tags (<a href="/rss.xml">, <a href="/feed">)
        const feedAnchor = Array.from(doc.querySelectorAll('a[href]')).find(a => {
            const h = (a.getAttribute('href') || '').toLowerCase();
            const text = (a.textContent || '').toLowerCase();
            return (
                h.endsWith('/feed') ||
                h.endsWith('/rss') ||
                h.endsWith('/rss.xml') ||
                h.endsWith('/atom.xml') ||
                h.endsWith('/feed.xml') ||
                (text.includes('rss') && /\.(xml|rss|atom)$/i.test(h))
            );
        });

        if (feedAnchor) {
            const href = feedAnchor.getAttribute('href');
            if (href) return resolveAbsoluteUrl(href, baseUrl);
        }
    } catch {
        // Fallback regex scan
        const match = htmlStr.match(/<link[^>]+type=["'](application\/(rss\+xml|atom\+xml|feed\+json))["'][^>]+href=["']([^"']+)["']/i) ||
                      htmlStr.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["'](application\/(rss\+xml|atom\+xml|feed\+json))["']/i);
        if (match) {
            const href = match[3] || match[1];
            return resolveAbsoluteUrl(href, baseUrl);
        }
    }

    return null;
}

/**
 * Generates candidate feed URLs for common platforms (Substack, Medium, Reddit, YouTube, WordPress, GitHub, etc.)
 */
export function getCandidateFeedUrls(siteUrl) {
    if (!siteUrl) return [];
    try {
        const urlObj = new URL(siteUrl);
        const origin = urlObj.origin;
        const pathname = urlObj.pathname.replace(/\/+$/, '');

        const candidates = [];

        // Direct feed patterns
        if (/\.(rss|atom|xml|json)$/i.test(pathname) || pathname.endsWith('/feed')) {
            candidates.push(siteUrl);
        }

        // Substack (e.g. https://newsletter.substack.com -> /feed)
        if (urlObj.hostname.endsWith('substack.com')) {
            candidates.push(`${origin}/feed`);
        }

        // Medium (e.g. https://medium.com/@username -> /feed/@username)
        if (urlObj.hostname.includes('medium.com')) {
            if (pathname.startsWith('/@')) {
                candidates.push(`${origin}/feed${pathname}`);
            } else if (pathname.length > 1) {
                candidates.push(`${origin}/feed${pathname}`);
            } else {
                candidates.push(`${origin}/feed`);
            }
        }

        // Reddit (e.g. https://reddit.com/r/technology -> /.rss)
        if (urlObj.hostname.includes('reddit.com')) {
            if (pathname) {
                candidates.push(`${origin}${pathname}/.rss`);
                candidates.push(`${origin}${pathname}.rss`);
            }
        }

        // YouTube (e.g. channel or playlist)
        if (urlObj.hostname.includes('youtube.com')) {
            const channelMatch = pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
            if (channelMatch) {
                candidates.push(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`);
            }
            const playlistId = urlObj.searchParams.get('list');
            if (playlistId) {
                candidates.push(`https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`);
            }
        }

        // GitHub Releases/Commits
        if (urlObj.hostname === 'github.com') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                candidates.push(`https://github.com/${parts[0]}/${parts[1]}/releases.atom`);
                candidates.push(`https://github.com/${parts[0]}/${parts[1]}/commits.atom`);
            }
        }

        // Standard CMS probes (WordPress, Hugo, Ghost, Jekyll, Dev.to, Hashnode)
        if (pathname && pathname !== '/') {
            candidates.push(`${origin}${pathname}/feed/`);
            candidates.push(`${origin}${pathname}/feed`);
            candidates.push(`${origin}${pathname}/rss`);
            candidates.push(`${origin}${pathname}/rss.xml`);
            candidates.push(`${origin}${pathname}/atom.xml`);
        }
        candidates.push(`${origin}/feed`);
        candidates.push(`${origin}/rss`);
        candidates.push(`${origin}/feed/`);
        candidates.push(`${origin}/rss.xml`);
        candidates.push(`${origin}/atom.xml`);
        candidates.push(`${origin}/index.xml`);
        candidates.push(`${origin}/feed.json`);

        return Array.from(new Set(candidates));
    } catch {
        return [];
    }
}
