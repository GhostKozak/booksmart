import { db } from '../db/schema';
import { isExtensionConnected, fetchFeedXmlWithExtension } from './extension-client';
import { getStoredCorsProxy } from './key-vault';
import { toast } from 'sonner';

import {
    normalizeFeedInputUrl,
    resolveAbsoluteUrl,
    cleanHtmlText,
    parsePubDate,
    parseFeedXml,
    discoverFeedUrlFromHtml,
    getCandidateFeedUrls
} from './rss/rss-parser';

import {
    exportFeedsToOpml,
    importFeedsFromOpml as runImportFeedsFromOpml
} from './rss/opml-manager';

// Re-export parser and OPML utilities for callers
export {
    normalizeFeedInputUrl,
    resolveAbsoluteUrl,
    cleanHtmlText,
    parsePubDate,
    parseFeedXml,
    discoverFeedUrlFromHtml,
    getCandidateFeedUrls,
    exportFeedsToOpml
};

export async function importFeedsFromOpml(opmlStr) {
    return runImportFeedsFromOpml(opmlStr, subscribeToFeed);
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
