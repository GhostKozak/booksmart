import { db } from '../db/schema';
import { isExtensionConnected, fetchFeedXmlWithExtension } from './extension-client';
import { getStoredCorsProxy } from './key-vault';
import { toast } from 'sonner';

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

function parseJsonFeed(json, feedUrl) {
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

function parseRssFeed(doc, feedUrl) {
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

function parseAtomFeed(doc, feedUrl) {
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

/**
 * Fetches feed XML or JSON text bypassing CORS using companion extension or fallback proxies.
 */
export async function fetchFeedXmlRaw(url, timeoutMs = 9000) {
    if (!url) throw new Error('No URL specified');
    const normalizedUrl = normalizeFeedInputUrl(url);

    // 1. Try Extension (100% CORS-free and fastest)
    if (isExtensionConnected()) {
        try {
            const xml = await fetchFeedXmlWithExtension(normalizedUrl, timeoutMs);
            if (xml) return xml;
        } catch (extErr) {
            console.warn('[RSS] Extension fetch failed, trying direct/proxy fallback:', extErr.message);
        }
    }

    // 2. Local dev server proxy (available when running BookSmart locally on Vite)
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const devProxyUrl = `/booksmart/api/feed-proxy?url=${encodeURIComponent(normalizedUrl)}`;
            const res = await fetch(devProxyUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim().length > 0) {
                    return text;
                }
            }
        } catch {
            // Local dev proxy unavailable or failed, fall through to direct/public proxies
        }
    }

    // 3. Direct fetch (many feeds have CORS headers enabled e.g. Substack, GitHub)
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(normalizedUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, text/html, */*'
            },
            signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
            return await res.text();
        }
    } catch {
        // Direct fetch blocked by CORS or network error
    }

    // 4. Configured CORS Proxy or fallback proxy pool
    const userProxy = getStoredCorsProxy();
    const proxyEndpoints = [];
    if (userProxy) {
        const cleanProxy = userProxy.replace(/\/+$/, '');
        proxyEndpoints.push({ url: `${cleanProxy}/${normalizedUrl}`, type: 'raw' });
        proxyEndpoints.push({ url: `${cleanProxy}/${encodeURIComponent(normalizedUrl)}`, type: 'raw' });
    }

    // Resilient public proxies pool
    proxyEndpoints.push({ url: `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`, type: 'raw' });
    proxyEndpoints.push({ url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(normalizedUrl)}`, type: 'raw' });
    proxyEndpoints.push({ url: `https://api.allorigins.win/get?url=${encodeURIComponent(normalizedUrl)}`, type: 'json' });
    proxyEndpoints.push({ url: `https://corsproxy.io/?${encodeURIComponent(normalizedUrl)}`, type: 'raw' });

    let lastError = null;
    for (const endpoint of proxyEndpoints) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(endpoint.url, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
                if (endpoint.type === 'json') {
                    const data = await res.json();
                    if (data && typeof data.contents === 'string' && data.contents.trim().length > 0) {
                        return data.contents;
                    }
                } else {
                    const text = await res.text();
                    if (text && text.trim().length > 0) {
                        return text;
                    }
                }
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(lastError ? `Failed to fetch feed from ${normalizedUrl}: ${lastError.message}` : `Feed request returned non-OK status from ${normalizedUrl}`);
}

/**
 * Resolves a valid feed URL for a site by testing candidate URLs or parsing page HTML.
 */
export async function discoverFeed(siteUrl) {
    if (!siteUrl) return null;
    const normalizedUrl = normalizeFeedInputUrl(siteUrl);

    let raw = null;
    // Check if normalizedUrl itself is an active feed
    try {
        raw = await fetchFeedXmlRaw(normalizedUrl, 6000);
        const parsed = parseFeedXml(raw, normalizedUrl);
        if (parsed.items) {
            return { feedUrl: normalizedUrl, parsed };
        }
    } catch {
        // Not a direct feed, continue autodiscovery with candidate URLs or HTML
    }

    // Try parsing already fetched raw text as HTML to find <link rel="alternate">
    if (raw) {
        const discovered = discoverFeedUrlFromHtml(raw, normalizedUrl);
        if (discovered) {
            try {
                const feedXml = await fetchFeedXmlRaw(discovered, 6000);
                const parsed = parseFeedXml(feedXml, discovered);
                if (parsed.items) {
                    return { feedUrl: discovered, parsed };
                }
            } catch {
                // Discovered link failed, continue to candidate probing
            }
        }
    }

    // Probe candidate URLs in throttled small batches of 2 to avoid hammering CORS proxies
    const candidates = getCandidateFeedUrls(normalizedUrl).filter(c => c !== normalizedUrl);
    if (candidates.length > 0) {
        for (let i = 0; i < candidates.length; i += 2) {
            const batch = candidates.slice(i, i + 2);
            try {
                const result = await Promise.any(
                    batch.map(async (candidate) => {
                        const candidateXml = await fetchFeedXmlRaw(candidate, 5000);
                        const parsed = parseFeedXml(candidateXml, candidate);
                        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                            return { feedUrl: candidate, parsed };
                        }
                        throw new Error('Not a feed');
                    })
                );
                if (result) return result;
            } catch {
                // Batch failed, continue to next pair of candidates
            }
        }
    }

    return null;
}

/**
 * Subscribes to a feed and stores initial posts into IndexedDB.
 */
export async function subscribeToFeed(bookmark = null, customFeedUrl = null) {
    const rawTarget = customFeedUrl || bookmark?.url;
    if (!rawTarget) throw new Error('No bookmark or feed URL provided');
    const targetUrl = normalizeFeedInputUrl(rawTarget);

    const feedInfo = await discoverFeed(targetUrl);

    if (!feedInfo || !feedInfo.parsed) {
        throw new Error('No valid RSS/Atom feed could be found for this site.');
    }

    const { feedUrl, parsed } = feedInfo;
    const now = Date.now();

    // Check if feed already exists in database
    const existingFeed = await db.feeds.get(feedUrl);
    const existingItems = await db.feedItems.where('feedUrl').equals(feedUrl).toArray();
    const existingLinks = new Set(existingItems.map(i => i.link));

    // Save Items (avoiding duplicates based on link)
    const itemsToInsert = parsed.items.map(it => ({
        feedUrl,
        bookmarkId: bookmark?.id || existingFeed?.bookmarkId || null,
        title: it.title,
        link: it.link,
        guid: it.guid,
        pubDate: it.pubDate,
        summary: it.summary,
        author: it.author || '',
        read: 0
    }));

    const newItems = itemsToInsert.filter(it => !existingLinks.has(it.link));
    if (newItems.length > 0) {
        await db.feedItems.bulkAdd(newItems);
    }

    // Accurate count of total and unread items
    const unreadCount = await db.feedItems.where('feedUrl').equals(feedUrl).and(i => !i.read).count();
    const totalCount = await db.feedItems.where('feedUrl').equals(feedUrl).count();

    const feedRecord = {
        feedUrl,
        bookmarkId: bookmark?.id || existingFeed?.bookmarkId || null,
        title: parsed.title || bookmark?.title || existingFeed?.title || 'Feed',
        description: parsed.description || existingFeed?.description || '',
        siteUrl: parsed.siteUrl || bookmark?.url || existingFeed?.siteUrl || feedUrl,
        lastChecked: now,
        itemCount: totalCount,
        unreadCount
    };

    // Save Feed record
    await db.feeds.put(feedRecord);

    // Link feedUrl to bookmark if bookmark was passed
    if (bookmark?.id) {
        await db.bookmarks.update(bookmark.id, { feedUrl });
    }

    return { feed: feedRecord, items: itemsToInsert, isExisting: !!existingFeed };
}

/**
 * Unsubscribes from a feed and removes its cached items.
 */
export async function unsubscribeFeed(feedUrl) {
    if (!feedUrl) return;

    await db.transaction('rw', [db.feeds, db.feedItems, db.bookmarks], async () => {
        await db.feeds.delete(feedUrl);
        await db.feedItems.where('feedUrl').equals(feedUrl).delete();

        // Remove feedUrl pointer from any associated bookmarks
        const associated = await db.bookmarks.where('feedUrl').equals(feedUrl).toArray();
        for (const b of associated) {
            await db.bookmarks.update(b.id, { feedUrl: null });
        }
    });
}

/**
 * Refreshes all subscribed feeds, detects new articles, and notifies user.
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] If true, suppresses toast notification
 */
export async function refreshAllFeeds({ silent = false } = {}) {
    const feeds = await db.feeds.toArray();
    if (feeds.length === 0) {
        return { totalFeeds: 0, newItemsTotal: 0 };
    }

    let newItemsTotal = 0;
    const newArticles = [];

    // Process feeds in concurrent chunks of 4 for speed
    const CHUNK_SIZE = 4;
    for (let i = 0; i < feeds.length; i += CHUNK_SIZE) {
        const chunk = feeds.slice(i, i + CHUNK_SIZE);
        await Promise.allSettled(chunk.map(async (feed) => {
            try {
                const raw = await fetchFeedXmlRaw(feed.feedUrl, 8000);
                const parsed = parseFeedXml(raw, feed.feedUrl);

                // Fetch existing links for this feed to prevent duplicate entries
                const existingItems = await db.feedItems.where('feedUrl').equals(feed.feedUrl).toArray();
                const existingLinks = new Set(existingItems.map(i => i.link));

                const newItems = parsed.items.filter(it => !existingLinks.has(it.link));

                if (newItems.length > 0) {
                    const toAdd = newItems.map(it => ({
                        feedUrl: feed.feedUrl,
                        bookmarkId: feed.bookmarkId || null,
                        title: it.title,
                        link: it.link,
                        guid: it.guid,
                        pubDate: it.pubDate,
                        summary: it.summary,
                        author: it.author || '',
                        read: 0
                    }));
                    await db.feedItems.bulkAdd(toAdd);
                    newItemsTotal += toAdd.length;
                    newArticles.push(...toAdd.slice(0, 3));
                }

                const unreadCount = await db.feedItems.where('feedUrl').equals(feed.feedUrl).and(i => !i.read).count();
                const totalCount = await db.feedItems.where('feedUrl').equals(feed.feedUrl).count();

                await db.feeds.update(feed.feedUrl, {
                    title: parsed.title || feed.title,
                    lastChecked: Date.now(),
                    unreadCount,
                    itemCount: totalCount
                });
            } catch (feedErr) {
                console.warn(`[RSS] Failed refreshing feed ${feed.feedUrl}:`, feedErr.message);
            }
        }));
    }

    if (newItemsTotal > 0) {
        const headline = newArticles[0]?.title || '';
        const msg = newItemsTotal === 1
            ? `Yeni yazı: "${headline.slice(0, 50)}"`
            : `${newItemsTotal} yeni yazı yayımlandı!`;

        if (!silent) {
            toast.info(msg);
        }

        // Native notification if supported
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('BookSmart - Yeni RSS Yazıları', {
                    body: msg,
                    icon: '/favicon.ico'
                });
            } catch {
                // Ignored
            }
        }
    }

    return { totalFeeds: feeds.length, newItemsTotal };
}

/**
 * Marks a feed item as read or unread.
 */
export async function markFeedItemRead(itemId, read = 1) {
    if (!itemId) return;
    await db.feedItems.update(itemId, { read: read ? 1 : 0 });

    const item = await db.feedItems.get(itemId);
    if (item?.feedUrl) {
        const unreadCount = await db.feedItems.where('feedUrl').equals(item.feedUrl).and(i => !i.read).count();
        await db.feeds.update(item.feedUrl, { unreadCount });
    }
}

/**
 * Marks all items in a feed (or across all feeds) as read.
 * Uses Dexie batch modification for instantaneous execution.
 */
export async function markAllFeedItemsRead(feedUrl = null) {
    if (feedUrl) {
        await db.feedItems.where('feedUrl').equals(feedUrl).modify({ read: 1 });
        await db.feeds.update(feedUrl, { unreadCount: 0 });
    } else {
        await db.feedItems.toCollection().modify({ read: 1 });
        const feeds = await db.feeds.toArray();
        for (const f of feeds) {
            await db.feeds.update(f.feedUrl, { unreadCount: 0 });
        }
    }
}

/**
 * Adds an article from a feed into the BookSmart bookmarks library.
 * Performs duplicate detection and calculates estimated reading time.
 */
export async function addFeedItemToBookmarks(feedItem, targetFolder = 'Okuma Listesi') {
    if (!feedItem || !feedItem.link) return null;

    // Check if URL is already in bookmarks
    const existing = await db.bookmarks.where('url').equals(feedItem.link).first();
    if (existing) {
        if (feedItem.id) {
            await markFeedItemRead(feedItem.id, 1);
        }
        return { ...existing, isExisting: true };
    }

    const words = feedItem.summary ? feedItem.summary.trim().split(/\s+/).filter(Boolean).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    const newBookmark = {
        title: feedItem.title || 'RSS Article',
        url: feedItem.link,
        originalFolder: targetFolder,
        newFolder: targetFolder,
        tags: ['rss', 'newsletter'],
        ruleTags: [],
        readingTimeMinutes: readingTime,
        addDate: Math.floor(Date.now() / 1000),
        note: feedItem.summary ? `RSS Özeti: ${feedItem.summary}` : '',
        status: 'unchanged'
    };

    const id = await db.bookmarks.add(newBookmark);
    newBookmark.id = id;

    // Mark as read in feed
    if (feedItem.id) {
        await markFeedItemRead(feedItem.id, 1);
    }

    return newBookmark;
}

/**
 * Exports all subscribed feeds to an OPML 2.0 XML string.
 */
export async function exportFeedsToOpml() {
    const feeds = await db.feeds.toArray();
    const dateStr = new Date().toUTCString();
    let opml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    opml += `<opml version="2.0">\n`;
    opml += `  <head>\n`;
    opml += `    <title>BookSmart RSS Subscriptions</title>\n`;
    opml += `    <dateCreated>${dateStr}</dateCreated>\n`;
    opml += `  </head>\n`;
    opml += `  <body>\n`;
    for (const feed of feeds) {
        const title = (feed.title || '').replace(/"/g, '&quot;');
        const feedUrl = (feed.feedUrl || '').replace(/"/g, '&quot;');
        const siteUrl = (feed.siteUrl || feed.feedUrl || '').replace(/"/g, '&quot;');
        opml += `    <outline type="rss" text="${title}" title="${title}" xmlUrl="${feedUrl}" htmlUrl="${siteUrl}"/>\n`;
    }
    opml += `  </body>\n`;
    opml += `</opml>`;
    return opml;
}

/**
 * Imports feeds from an OPML XML string.
 */
export async function importFeedsFromOpml(opmlStr) {
    if (!opmlStr || typeof opmlStr !== 'string') {
        throw new Error('Invalid OPML content');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(opmlStr, 'application/xml');
    const outlines = Array.from(doc.querySelectorAll('outline[xmlUrl], outline[xmlurl]'));

    let importedCount = 0;
    const errors = [];
    for (const outline of outlines) {
        const feedUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('xmlurl');
        if (!feedUrl) continue;
        try {
            await subscribeToFeed(null, feedUrl);
            importedCount++;
        } catch (err) {
            errors.push({ feedUrl, error: err.message });
        }
    }
    return { total: outlines.length, importedCount, errors };
}
