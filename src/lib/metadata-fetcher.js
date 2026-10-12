import { db } from '../db';
import { isExtensionConnected, fetchOgMetadataWithExtension } from './extension-client';
import { getStoredCorsProxy } from './key-vault';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, useCallback } from 'react';

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const pendingFetches = new Map();

/**
 * Normalizes a URL for consistent cache indexing.
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrlForPreview(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const parsed = new URL(url.trim());
        parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
        parsed.protocol = parsed.protocol.toLowerCase();
        if ((parsed.protocol === 'http:' && parsed.port === '80') ||
            (parsed.protocol === 'https:' && parsed.port === '443')) {
            parsed.port = '';
        }
        let normalized = parsed.href;
        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
        return normalized;
    } catch {
        return url.trim().replace(/\/+$/, '');
    }
}

/**
 * Extracts OpenGraph / standard metadata via public API fallback when companion extension is not available.
 * @param {string} url
 * @param {string|null} corsProxy
 * @returns {Promise<{ title?: string, description?: string, image?: string, siteName?: string, favicon?: string }>}
 */
async function fetchMetadataViaHttpFallback(url, corsProxy = null) {
    // 1. Try CORS Proxy if user configured one
    if (corsProxy) {
        try {
            const proxyTarget = `${corsProxy.replace(/\/+$/, '')}/${encodeURIComponent(url)}`;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(proxyTarget, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
                const text = await res.text();
                const preview = parseHtmlMetadata(text, url);
                if (preview && (preview.image || preview.description || preview.title)) {
                    return preview;
                }
            }
        } catch {
            // Fall through to next fallback
        }
    }

    // 2. Try Microlink public metadata API
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&filter=data.title,data.description,data.image,data.logo,data.publisher`;
        const res = await fetch(microlinkUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (res.ok) {
            const json = await res.json();
            if (json?.status === 'success' && json.data) {
                const d = json.data;
                const hostname = (() => {
                    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
                })();

                return {
                    title: d.title || '',
                    description: d.description || '',
                    image: d.image?.url || null,
                    siteName: d.publisher || hostname,
                    favicon: d.logo?.url || null
                };
            }
        }
    } catch {
        // Fall through to synthetic fallback
    }

    // 3. Synthetic fallback: WordPress mshots screenshot + standard favicon
    let hostname = '';
    try {
        hostname = new URL(url).hostname.replace(/^www\./, '');
    } catch {
        // Ignore
    }

    return {
        title: '',
        description: '',
        image: `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=600&h=338`,
        siteName: hostname,
        favicon: hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128` : null,
        isFallback: true
    };
}

/**
 * Parses basic OpenGraph tags from raw HTML string.
 */
function parseHtmlMetadata(html, baseUrl) {
    if (!html || typeof html !== 'string') return null;
    const slice = html.slice(0, 250000);

    const getMeta = (propName) => {
        const match = slice.match(new RegExp(`<meta[^>]+(?:property|name)=["']${propName}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
                      slice.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${propName}["']`, 'i'));
        return match ? match[1].trim() : '';
    };

    const title = getMeta('og:title') || getMeta('twitter:title') || (() => {
        const m = slice.match(/<title[^>]*>([^<]*)<\/title>/i);
        return m ? m[1].trim() : '';
    })();

    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
    let image = getMeta('og:image') || getMeta('twitter:image');
    let siteName = getMeta('og:site_name');

    if (image && baseUrl) {
        try { image = new URL(image, baseUrl).href; } catch { image = null; }
    }

    if (!siteName && baseUrl) {
        try { siteName = new URL(baseUrl).hostname.replace(/^www\./, ''); } catch { siteName = ''; }
    }

    let favicon = null;
    const iconMatch = slice.match(/<link[^>]+rel=["'](?:apple-touch-icon(?:-precomposed)?|icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i) ||
                      slice.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:apple-touch-icon(?:-precomposed)?|icon|shortcut icon)["']/i);
    if (iconMatch && iconMatch[1] && baseUrl) {
        try { favicon = new URL(iconMatch[1].trim(), baseUrl).href; } catch { favicon = null; }
    }

    return { title, description, image, siteName, favicon };
}

/**
 * Fetches OpenGraph / favicon preview for a URL and stores it in IndexedDB.
 * Deduplicates in-flight fetches for identical URLs.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<{ url: string, title?: string, description?: string, image?: string, siteName?: string, favicon?: string }>}
 */
export async function fetchMetadataForUrl(url, { forceRefresh = false } = {}) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        return null;
    }

    const normUrl = normalizeUrlForPreview(url);

    // 1. Check Dexie IndexedDB cache first
    if (!forceRefresh && db?.previews) {
        try {
            const cached = await db.previews.get(normUrl);
            if (cached && (Date.now() - (cached.updatedAt || 0) < CACHE_TTL_MS)) {
                return cached;
            }
        } catch {
            // DB access error fallback
        }
    }

    // 2. In-flight promise deduplication
    if (pendingFetches.has(normUrl)) {
        return pendingFetches.get(normUrl);
    }

    const fetchPromise = (async () => {
        let metadata = null;

        // Try companion extension if connected
        if (isExtensionConnected()) {
            try {
                metadata = await fetchOgMetadataWithExtension(url, 7000);
            } catch {
                metadata = null;
            }
        }

        // Fallback to HTTP / Microlink / proxy
        if (!metadata || (!metadata.image && !metadata.description)) {
            const corsProxy = getStoredCorsProxy();
            const fallback = await fetchMetadataViaHttpFallback(url, corsProxy);
            metadata = { ...fallback, ...(metadata || {}) };
        }

        const previewRecord = {
            url: normUrl,
            rawUrl: url,
            title: metadata?.title || '',
            description: metadata?.description || '',
            image: metadata?.image || null,
            siteName: metadata?.siteName || '',
            favicon: metadata?.favicon || null,
            updatedAt: Date.now(),
            status: 'success'
        };

        // Cache in Dexie
        if (db?.previews) {
            try {
                await db.previews.put(previewRecord);
            } catch (err) {
                console.warn('Failed to save preview to IndexedDB:', err);
            }
        }

        return previewRecord;
    })().finally(() => {
        pendingFetches.delete(normUrl);
    });

    pendingFetches.set(normUrl, fetchPromise);
    return fetchPromise;
}

/**
 * React Hook to access and auto-load OpenGraph preview metadata for a bookmark.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]
 * @returns {{ preview: Object|null, isLoading: boolean, refresh: Function }}
 */
export function useBookmarkPreview(url, { enabled = true } = {}) {
    const normUrl = normalizeUrlForPreview(url);
    const [isLoading, setIsLoading] = useState(false);
    const hasTriggeredRef = useRef(false);

    // Reactively read from IndexedDB
    const preview = useLiveQuery(
        () => (normUrl && db?.previews ? db.previews.get(normUrl) : null),
        [normUrl]
    );

    useEffect(() => {
        if (!enabled || !url || preview || hasTriggeredRef.current) return;

        hasTriggeredRef.current = true;
        let isMounted = true;
        setIsLoading(true);

        fetchMetadataForUrl(url)
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [url, enabled, preview]);

    const refresh = useCallback(async () => {
        if (!url) return;
        setIsLoading(true);
        try {
            await fetchMetadataForUrl(url, { forceRefresh: true });
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    return {
        preview: preview || null,
        isLoading,
        refresh
    };
}

/**
 * Batch enriches a list of bookmarks with OpenGraph metadata with concurrency control.
 *
 * @param {Array<{ id: string|number, url: string }>} bookmarks
 * @param {Object} [options]
 * @param {number} [options.concurrency=3]
 * @param {Function} [options.onProgress] - ({ processed, total, successCount, currentUrl }) => void
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ processed: number, total: number, successCount: number }>}
 */
export async function batchEnrichBookmarks(bookmarks, {
    concurrency = 3,
    onProgress,
    signal
} = {}) {
    if (!bookmarks || bookmarks.length === 0) {
        return { processed: 0, total: 0, successCount: 0 };
    }

    const validBookmarks = bookmarks.filter(b => b.url && /^https?:\/\//i.test(b.url.trim()));
    const total = validBookmarks.length;
    let processed = 0;
    let successCount = 0;

    const queue = [...validBookmarks];

    const worker = async () => {
        while (queue.length > 0) {
            if (signal?.aborted) break;

            const item = queue.shift();
            if (!item) break;

            try {
                const result = await fetchMetadataForUrl(item.url);
                if (result && (result.image || result.description || result.title)) {
                    successCount++;
                }
            } catch {
                // Ignore single item failures in batch
            } finally {
                processed++;
                onProgress?.({
                    processed,
                    total,
                    successCount,
                    currentUrl: item.url
                });
            }
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    return { processed, total, successCount };
}

/**
 * Clears the preview metadata cache.
 */
export async function clearPreviewCache() {
    pendingFetches.clear();
    if (db?.previews) {
        await db.previews.clear();
    }
}
