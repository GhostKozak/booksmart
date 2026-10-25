import { cleanUrl } from './url-cleaner';

/**
 * Strips common website brand suffixes, punctuation, and extra whitespace
 * to allow accurate title comparison.
 */
export function cleanTitleForComparison(title = '') {
    if (!title || typeof title !== 'string') return '';

    let cleaned = title.trim().toLowerCase();

    // Remove common branding suffixes: e.g. "Article Title | GitHub", "Tutorial - YouTube"
    cleaned = cleaned.replace(/\s*[-|–—•·:]\s*(github|youtube|medium|wikipedia|reddit|twitter|x|dev\.to|stackoverflow|npm|notion|substack|docs|official site|home|blog|guide|documentation|overview|api)\s*$/i, '');

    // Remove special punctuation and symbols
    cleaned = cleaned.replace(/[^\p{L}\p{N}\s]/gu, ' ');

    // Collapse multiple whitespaces
    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Computes Sørensen–Dice similarity coefficient for two strings.
 * Fast O(N) string similarity algorithm using character bigrams.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Value between 0.0 (completely distinct) and 1.0 (identical)
 */
export function computeStringSimilarity(a = '', b = '') {
    if (!a && !b) return 1.0;
    if (!a || !b) return 0.0;
    if (a === b) return 1.0;

    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1.0;

    if (s1.length < 2 || s2.length < 2) {
        return s1 === s2 ? 1.0 : 0.0;
    }

    const bigrams1 = new Map();
    for (let i = 0; i < s1.length - 1; i++) {
        const bigram = s1.substring(i, i + 2);
        bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        const count = bigrams1.get(bigram) || 0;
        if (count > 0) {
            bigrams1.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    const totalBigrams = (s1.length - 1) + (s2.length - 1);
    return Number(((2.0 * intersectionSize) / totalBigrams).toFixed(3));
}

/**
 * Deeply normalizes a URL by stripping tracking parameters, normalizing protocol,
 * removing www/mobile subdomains, trailing slashes, index files, and sorting query params.
 *
 * @param {string} rawUrl
 * @returns {string}
 */
export function normalizeUrlDeep(rawUrl = '') {
    if (!rawUrl || typeof rawUrl !== 'string') return '';

    try {
        // First run through URL cleaner for known tracking parameters
        const urlStr = cleanUrl(rawUrl).cleaned || rawUrl;
        const parsed = new URL(urlStr);

        // Normalize protocol to https
        parsed.protocol = 'https:';

        // Normalize hostname: lowercase and strip www., m., mobile.
        let hostname = parsed.hostname.toLowerCase();
        hostname = hostname.replace(/^(www\.|m\.|mobile\.)/, '');
        parsed.hostname = hostname;

        // Normalize path: strip trailing slash, index.html, index.php
        let pathname = parsed.pathname.replace(/\/+$/, '');
        pathname = pathname.replace(/\/(index|default)\.(html?|php|asp|jsp)$/i, '');
        if (!pathname) pathname = '/';
        parsed.pathname = pathname;

        // Sort query parameters so parameter order does not cause false negatives
        const params = new URLSearchParams(parsed.search);
        const sortedParams = new URLSearchParams();
        const keys = Array.from(params.keys()).sort();
        keys.forEach(k => {
            // Strip any remaining tracking keys
            if (!/^(utm_|fbclid|gclid|ref|source|mc_cid|mc_eid)/i.test(k)) {
                sortedParams.append(k, params.get(k));
            }
        });
        parsed.search = sortedParams.toString() ? `?${sortedParams.toString()}` : '';

        // Remove hash fragments (unless it looks like a client-side route #!/ or #/)
        if (parsed.hash && !parsed.hash.startsWith('#/') && !parsed.hash.startsWith('#!/')) {
            parsed.hash = '';
        }

        let result = parsed.toString();
        if (result.endsWith('/')) {
            result = result.slice(0, -1);
        }
        return result;
    } catch {
        // Fallback for non-standard or malformed URLs
        return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
    }
}

/**
 * Extracts a normalized domain identifier for grouping.
 */
function getBaseDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^(www\.|m\.|mobile\.)/, '').toLowerCase();
    } catch {
        return '';
    }
}

/**
 * Builds merged metadata preview for a group of candidate duplicates.
 */
export function buildMergedPreview(items) {
    if (!items || items.length === 0) return null;

    // Sort items by priority: richer notes/title and older creation date
    const sorted = [...items].sort((a, b) => {
        const scoreA = (a.note ? 2 : 0) + (a.description ? 1 : 0) + (a.tags?.length || 0);
        const scoreB = (b.note ? 2 : 0) + (b.description ? 1 : 0) + (b.tags?.length || 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (parseInt(a.addDate) || 0) - (parseInt(b.addDate) || 0);
    });

    const primary = sorted[0];

    // Combine all unique tags
    const allTags = new Set();
    items.forEach(b => {
        const tags = Array.isArray(b.tags)
            ? b.tags
            : (typeof b.tags === 'string' && b.tags ? b.tags.split(',').map(t => t.trim()) : []);
        tags.filter(Boolean).forEach(t => allTags.add(t));
    });

    // Combine all unique collections
    const allCollections = new Set();
    items.forEach(b => {
        if (Array.isArray(b.collections)) {
            b.collections.forEach(c => allCollections.add(c));
        }
    });

    // Merge notes
    const notes = items
        .map(b => (b.note || '').trim())
        .filter(Boolean);
    const uniqueNotes = Array.from(new Set(notes));
    const mergedNote = uniqueNotes.join('\n\n---\n\n');

    return {
        primaryId: primary.id,
        title: primary.title || items.find(i => i.title)?.title || 'Untitled',
        url: primary.url || items[0].url,
        folder: primary.newFolder || primary.originalFolder || '',
        tags: Array.from(allTags),
        collections: Array.from(allCollections),
        note: mergedNote,
        description: primary.description || items.find(i => i.description)?.description || ''
    };
}

/**
 * Finds duplicate and similar content clusters within the given bookmarks list.
 *
 * @param {Array<Object>} bookmarks
 * @param {Object} [options]
 * @param {number} [options.titleThreshold=0.80] - Minimum string similarity threshold for titles
 * @returns {Array<Object>} List of duplicate clusters
 */
export function findSimilarBookmarkGroups(bookmarks = [], {
    titleThreshold = 0.80
} = {}) {
    if (!Array.isArray(bookmarks) || bookmarks.length < 2) {
        return [];
    }

    const clusters = [];
    const assignedIds = new Set();

    // 1. Pass: Deep Normalized URL Match (Exact & URL Variations)
    const urlGroups = new Map();
    bookmarks.forEach(bm => {
        if (!bm || !bm.url) return;
        const deepUrl = normalizeUrlDeep(bm.url);
        if (!deepUrl) return;

        if (!urlGroups.has(deepUrl)) {
            urlGroups.set(deepUrl, []);
        }
        urlGroups.get(deepUrl).push(bm);
    });

    for (const [deepUrl, items] of urlGroups.entries()) {
        if (items.length > 1) {
            const hasExactUrls = items.every(i => i.url === items[0].url);
            items.forEach(i => assignedIds.add(i.id));

            clusters.push({
                id: 'cluster_url_' + Math.random().toString(36).slice(2, 9),
                type: hasExactUrls ? 'exact_url' : 'url_variation',
                label: hasExactUrls ? 'Exact URL Match' : 'URL / Parameter Variation',
                similarityScore: hasExactUrls ? 1.0 : 0.95,
                deepUrl,
                bookmarks: items,
                mergedPreview: buildMergedPreview(items)
            });
        }
    }

    // 2. Pass: Same Domain & High Title/Content Similarity
    // Group remaining unassigned bookmarks by base domain
    const remainingBookmarks = bookmarks.filter(b => b && (b.id !== undefined && b.id !== null) && !assignedIds.has(b.id));
    const domainGroups = new Map();

    remainingBookmarks.forEach(bm => {
        const domain = getBaseDomain(bm.url);
        if (!domain) return;
        if (!domainGroups.has(domain)) {
            domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(bm);
    });

    for (const [, domainItems] of domainGroups.entries()) {
        if (domainItems.length < 2) continue;

        const visitedInDomain = new Set();

        for (let i = 0; i < domainItems.length; i++) {
            const bm1 = domainItems[i];
            if (visitedInDomain.has(bm1.id)) continue;

            const title1 = cleanTitleForComparison(bm1.title);
            if (!title1 || title1.length < 5) continue;

            const similarGroup = [bm1];

            for (let j = i + 1; j < domainItems.length; j++) {
                const bm2 = domainItems[j];
                if (visitedInDomain.has(bm2.id)) continue;

                const title2 = cleanTitleForComparison(bm2.title);
                if (!title2 || title2.length < 5) continue;

                const score = computeStringSimilarity(title1, title2);

                if (score >= titleThreshold) {
                    similarGroup.push(bm2);
                    visitedInDomain.add(bm2.id);
                }
            }

            if (similarGroup.length > 1) {
                visitedInDomain.add(bm1.id);
                similarGroup.forEach(b => assignedIds.add(b.id));

                const score = computeStringSimilarity(
                    cleanTitleForComparison(similarGroup[0].title),
                    cleanTitleForComparison(similarGroup[1].title)
                );

                clusters.push({
                    id: 'cluster_title_' + Math.random().toString(36).slice(2, 9),
                    type: 'similar_title',
                    label: `Similar Title & Content (${Math.round(score * 100)}% Similarity)`,
                    similarityScore: score,
                    bookmarks: similarGroup,
                    mergedPreview: buildMergedPreview(similarGroup)
                });
            }
        }
    }

    // Sort clusters: exact URLs first, then by similarity score descending
    return clusters.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
}
