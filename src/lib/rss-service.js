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
 * Parses pubDate string or timestamp to epoch seconds / ms.
 */
export function parsePubDate(dateStr) {
    if (!dateStr) return Date.now();
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Parses RSS 2.0, Atom 1.0, or RDF XML into a normalized feed object.
 */
export function parseFeedXml(xmlStr, feedUrl = '') {
    if (!xmlStr || typeof xmlStr !== 'string') {
        throw new Error('Invalid XML content');
    }

    const parser = new DOMParser();
    let doc = parser.parseFromString(xmlStr, 'application/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        // Fallback: try parsing as text/html for lenient XML
        const htmlDoc = parser.parseFromString(xmlStr, 'text/html');
        if (htmlDoc.querySelector('rss, feed, channel')) {
            doc = htmlDoc;
        } else {
            throw new Error('Failed to parse feed XML: ' + parserError.textContent.slice(0, 100));
        }
    }

    const isAtom = !!doc.querySelector('feed');
    const isRss = !!doc.querySelector('rss, channel, RDF');

    if (!isAtom && !isRss) {
        throw new Error('Unrecognized feed format (neither RSS nor Atom)');
    }

    if (isAtom) {
        return parseAtomFeed(doc, feedUrl);
    } else {
        return parseRssFeed(doc, feedUrl);
    }
}

function parseRssFeed(doc, feedUrl) {
    const channel = doc.querySelector('channel') || doc;
    const feedTitle = channel.querySelector('title')?.textContent?.trim() || 'Untitled Feed';
    const feedDescription = channel.querySelector('description')?.textContent?.trim() || '';
    let siteUrl = channel.querySelector('link')?.textContent?.trim() || '';

    // If channel link is a node or relative
    if (!siteUrl && feedUrl) {
        try {
            siteUrl = new URL(feedUrl).origin;
        } catch {
            siteUrl = feedUrl;
        }
    }

    const itemNodes = Array.from(doc.querySelectorAll('item'));
    const items = itemNodes.map(item => {
        const title = item.querySelector('title')?.textContent?.trim() || 'Untitled Post';
        const link = item.querySelector('link')?.textContent?.trim() || '';
        const guid = item.querySelector('guid')?.textContent?.trim() || link || title;
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
    const linkElems = Array.from(feed.querySelectorAll('link'));
    const altLink = linkElems.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'));
    if (altLink) {
        siteUrl = altLink.getAttribute('href') || '';
    }
    if (!siteUrl && feedUrl) {
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
        const entryLinks = Array.from(entry.querySelectorAll('link'));
        const entryAlt = entryLinks.find(l => l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel'));
        if (entryAlt) {
            link = entryAlt.getAttribute('href') || '';
        } else if (entryLinks.length > 0) {
            link = entryLinks[0].getAttribute('href') || '';
        }

        const id = entry.querySelector('id')?.textContent?.trim() || link || title;
        const rawDate = entry.querySelector('published, updated, issueDate')?.textContent?.trim() || '';
        const rawSummary = entry.querySelector('summary, content')?.textContent || '';
        const summary = cleanHtmlText(rawSummary).slice(0, 300);
        const author = entry.querySelector('author > name, author')?.textContent?.trim() || '';

        return {
            title,
            link: link || siteUrl,
            guid: id,
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
 * Attempts to autodiscover an RSS/Atom feed URL from a webpage URL or HTML.
 */
export function discoverFeedUrlFromHtml(htmlStr, baseUrl) {
    if (!htmlStr || typeof htmlStr !== 'string') return null;

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlStr, 'text/html');
        const linkNodes = Array.from(doc.querySelectorAll('link[rel~="alternate"]'));

        for (const link of linkNodes) {
            const type = (link.getAttribute('type') || '').toLowerCase();
            const href = link.getAttribute('href');
            if (!href) continue;

            if (type.includes('rss+xml') || type.includes('atom+xml') || type.includes('application/xml')) {
                try {
                    return new URL(href, baseUrl).href;
                } catch {
                    return href;
                }
            }
        }
    } catch {
        // Fallback regex scan
        const match = htmlStr.match(/<link[^>]+type=["'](application\/(rss\+xml|atom\+xml))["'][^>]+href=["']([^"']+)["']/i) ||
            htmlStr.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["'](application\/(rss\+xml|atom\+xml))["']/i);
        if (match) {
            const href = match[3] || match[1];
            try {
                return new URL(href, baseUrl).href;
            } catch {
                return href;
            }
        }
    }

    return null;
}

/**
 * Generates candidate feed URLs for common platforms (Substack, Medium, WordPress, GitHub, etc.)
 */
export function getCandidateFeedUrls(siteUrl) {
    if (!siteUrl) return [];
    try {
        const urlObj = new URL(siteUrl);
        const origin = urlObj.origin;
        const pathname = urlObj.pathname.replace(/\/+$/, '');

        const candidates = [];

        // Direct feed patterns
        if (/\.(rss|atom|xml)$/i.test(pathname) || pathname.endsWith('/feed')) {
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

        // GitHub Releases/Commits
        if (urlObj.hostname === 'github.com') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                candidates.push(`https://github.com/${parts[0]}/${parts[1]}/releases.atom`);
                candidates.push(`https://github.com/${parts[0]}/${parts[1]}/commits.atom`);
            }
        }

        // Standard CMS probes
        if (pathname && pathname !== '/') {
            candidates.push(`${origin}${pathname}/feed/`);
            candidates.push(`${origin}${pathname}/rss.xml`);
            candidates.push(`${origin}${pathname}/atom.xml`);
        }
        candidates.push(`${origin}/feed/`);
        candidates.push(`${origin}/feed`);
        candidates.push(`${origin}/rss.xml`);
        candidates.push(`${origin}/atom.xml`);
        candidates.push(`${origin}/index.xml`);
        candidates.push(`${origin}/rss`);

        return Array.from(new Set(candidates));
    } catch {
        return [];
    }
}

/**
 * Fetches feed XML text bypassing CORS using companion extension or fallback proxies.
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

    // 2. Direct fetch (many feeds have CORS headers enabled e.g. Substack, GitHub)
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(normalizedUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*'
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

    // 3. Configured CORS Proxy or fallback proxy pool
    const userProxy = getStoredCorsProxy();
    const proxyEndpoints = [];
    if (userProxy) {
        proxyEndpoints.push(`${userProxy.replace(/\/+$/, '')}/${normalizedUrl}`);
    }
    proxyEndpoints.push(`https://corsproxy.io/?url=${encodeURIComponent(normalizedUrl)}`);
    proxyEndpoints.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`);
    proxyEndpoints.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(normalizedUrl)}`);

    let lastError = null;
    for (const endpoint of proxyEndpoints) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(endpoint, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim().length > 0) {
                    return text;
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

    // Probe candidate URLs concurrently
    const candidates = getCandidateFeedUrls(normalizedUrl).filter(c => c !== normalizedUrl);
    if (candidates.length > 0) {
        try {
            const result = await Promise.any(
                candidates.map(async (candidate) => {
                    const candidateXml = await fetchFeedXmlRaw(candidate, 4000);
                    const parsed = parseFeedXml(candidateXml, candidate);
                    if (parsed && parsed.items) {
                        return { feedUrl: candidate, parsed };
                    }
                    throw new Error('Not a feed');
                })
            );
            if (result) return result;
        } catch {
            // All candidates failed
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

    const feedRecord = {
        feedUrl,
        bookmarkId: bookmark?.id || null,
        title: parsed.title || bookmark?.title || 'Feed',
        description: parsed.description || '',
        siteUrl: parsed.siteUrl || bookmark?.url || feedUrl,
        lastChecked: now,
        itemCount: parsed.items.length,
        unreadCount: parsed.items.length
    };

    // Save Feed record
    await db.feeds.put(feedRecord);

    // Save Items (avoiding duplicates based on link)
    const itemsToInsert = parsed.items.map(it => ({
        feedUrl,
        bookmarkId: bookmark?.id || null,
        title: it.title,
        link: it.link,
        guid: it.guid,
        pubDate: it.pubDate,
        summary: it.summary,
        author: it.author || '',
        read: 0
    }));

    if (itemsToInsert.length > 0) {
        const existingItems = await db.feedItems.where('feedUrl').equals(feedUrl).toArray();
        const existingLinks = new Set(existingItems.map(i => i.link));
        const newItems = itemsToInsert.filter(it => !existingLinks.has(it.link));
        if (newItems.length > 0) {
            await db.feedItems.bulkAdd(newItems);
        }
    }

    // Link feedUrl to bookmark
    if (bookmark?.id) {
        await db.bookmarks.update(bookmark.id, { feedUrl });
    }

    return { feed: feedRecord, items: itemsToInsert };
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
 */
export async function refreshAllFeeds() {
    const feeds = await db.feeds.toArray();
    if (feeds.length === 0) {
        return { totalFeeds: 0, newItemsTotal: 0 };
    }

    let newItemsTotal = 0;
    const newArticles = [];

    for (const feed of feeds) {
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
    }

    if (newItemsTotal > 0) {
        const headline = newArticles[0]?.title || '';
        const msg = newItemsTotal === 1
            ? `Yeni yazı: "${headline.slice(0, 50)}"`
            : `${newItemsTotal} yeni yazı yayımlandı!`;

        toast.info(msg);

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
 */
export async function markAllFeedItemsRead(feedUrl = null) {
    if (feedUrl) {
        const items = await db.feedItems.where('feedUrl').equals(feedUrl).toArray();
        for (const it of items) {
            await db.feedItems.update(it.id, { read: 1 });
        }
        await db.feeds.update(feedUrl, { unreadCount: 0 });
    } else {
        const allItems = await db.feedItems.toArray();
        for (const it of allItems) {
            await db.feedItems.update(it.id, { read: 1 });
        }
        const feeds = await db.feeds.toArray();
        for (const f of feeds) {
            await db.feeds.update(f.feedUrl, { unreadCount: 0 });
        }
    }
}

/**
 * Adds an article from a feed into the BookSmart bookmarks library.
 */
export async function addFeedItemToBookmarks(feedItem, targetFolder = 'Okuma Listesi') {
    if (!feedItem || !feedItem.link) return null;

    const newBookmark = {
        title: feedItem.title || 'RSS Article',
        url: feedItem.link,
        originalFolder: targetFolder,
        newFolder: targetFolder,
        tags: ['rss', 'newsletter'],
        ruleTags: [],
        addDate: Math.floor(Date.now() / 1000),
        note: feedItem.summary ? `RSS Özeti: ${feedItem.summary}` : '',
        status: 'unchanged'
    };

    const id = await db.bookmarks.add(newBookmark);
    newBookmark.id = id;

    // Mark as read
    if (feedItem.id) {
        await markFeedItemRead(feedItem.id, 1);
    }

    return newBookmark;
}
