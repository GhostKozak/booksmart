import Fuse from 'fuse.js'

// --- Security Helpers ---

/**
 * Validate URL scheme - blocks dangerous protocols like javascript: and data:
 * @param {string} url - URL to check.
 * @returns {boolean} - true if URL has a safe scheme.
 */
function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    // Block javascript:, data:, vbscript: and other dangerous schemes
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
    return true;
}

/**
 * Safely compile a regex from user input, with length limits and fallback.
 * Prevents ReDoS by limiting pattern length.
 * @param {string} pattern - User-supplied pattern.
 * @returns {RegExp|null} - Compiled regex or null if invalid/dangerous.
 */
function safeRegex(pattern) {
    if (!pattern || pattern.length > 200) return null;
    try {
        return new RegExp(pattern, 'i');
    } catch {
        return null;
    }
}

// --- Utility Functions ---

function isDoc(url) {
    url = (url || '').toLowerCase();
    return url.endsWith('.pdf') ||
        url.endsWith('.doc') || url.endsWith('.docx') ||
        url.endsWith('.xls') || url.endsWith('.xlsx') ||
        url.endsWith('.ppt') || url.endsWith('.pptx') ||
        // Simple check for Google Docs
        url.includes('docs.google.com');
}

const MEDIA_DOMAINS = [
    'youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'dailymotion.com',
    'netflix.com', 'disneyplus.com', 'hulu.com', 'spotify.com', 'soundcloud.com',
    'podcasts.apple.com', 'music.apple.com', 'bandcamp.com', 'tiktok.com'
];

const SOCIAL_DOMAINS = [
    'twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'mastodon.social', 'threads.net', 'bsky.app',
    'discord.com', 'discord.gg', 'telegram.org', 't.me', 'pinterest.com'
];

const SHOPPING_DOMAINS = [
    'amazon.com', 'amazon.co', 'amazon.de', 'amazon.co.uk', 'amazon.com.tr',
    'ebay.com', 'etsy.com', 'aliexpress.com', 'walmart.com', 'target.com',
    'trendyol.com', 'hepsiburada.com', 'n11.com', 'gittigidiyor.com',
    'shopify.com', 'bestbuy.com', 'newegg.com', 'banggood.com'
];

const NEWS_DOMAINS = [
    'medium.com', 'substack.com', 'dev.to', 'hashnode.dev', 'hackernoon.com',
    'techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com',
    'bbc.com', 'bbc.co.uk', 'cnn.com', 'reuters.com', 'nytimes.com',
    'theguardian.com', 'washingtonpost.com', 'hurriyet.com.tr', 'sozcu.com.tr'
];

function normalizeUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
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
        return url.trim().toLowerCase().replace(/\/+$/, '');
    }
}

function domainMatch(url, domains) {
    url = (url || '').toLowerCase();
    return domains.some(d => {
        // Match domain exactly or as subdomain
        return url.includes('://' + d) || url.includes('.' + d);
    });
}

// --- Main Processing Logic ---

const processData = ({
    bookmarks,
    rules,
    resolvedConflicts,
    searchQuery,
    searchMode,
    activeTag,
    activeFolder,
    activeCollection,
    smartFilter,
    dateFilter,
    sortBy,
    fuseOptions
}) => {
    let filtered = bookmarks;

    // 1. Search Filter
    if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        if (searchMode === 'fuzzy') {
            const fuse = new Fuse(filtered, fuseOptions);
            const result = fuse.search(searchQuery);
            filtered = result.map(r => r.item);
        } else if (searchMode === 'regex') {
            const regex = safeRegex(searchQuery);
            if (regex) {
                filtered = filtered.filter(b => {
                    const bTags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? b.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                    return regex.test(b.title || '') ||
                        regex.test(b.url || '') ||
                        bTags.some(t => regex.test(t));
                });
            } else {
                // Fallback to simple contains for invalid regex
                filtered = filtered.filter(b =>
                    (b.title || '').toLowerCase().includes(query) ||
                    (b.url || '').toLowerCase().includes(query)
                );
            }
        } else {
            // Simple Mode
            filtered = filtered.filter(b => {
                const bTags = Array.isArray(b.tags) ? b.tags : (typeof b.tags === 'string' ? b.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
                return (b.title || '').toLowerCase().includes(query) ||
                    (b.url || '').toLowerCase().includes(query) ||
                    bTags.some(t => t.toLowerCase().includes(query));
            });
        }
    }

    // 2. Date Filter
    if (dateFilter.start || dateFilter.end) {
        filtered = filtered.filter(b => {
            if (!b.addDate) return false;
            const bookmarkDate = parseInt(b.addDate) * 1000;

            // Start Date
            if (dateFilter.start) {
                const start = new Date(dateFilter.start).getTime();
                if (bookmarkDate < start) return false;
            }

            // End Date
            if (dateFilter.end) {
                const end = new Date(dateFilter.end);
                end.setHours(23, 59, 59, 999);
                if (bookmarkDate > end.getTime()) return false;
            }

            return true;
        })
    }

    // 3. Tag Filter
    if (activeTag) {
        filtered = filtered.filter(b => b.tags && b.tags.includes(activeTag))
    }

    // 4. Folder Filter — Filters by persisted DB state (from previous rule/AI runs or manual moves)
    //
    // DESIGN DECISION: This filter only uses folder assignments already saved in IndexedDB
    // (i.e. b.newFolder or b.originalFolder).
    // Rule application (Step 8) calculates newFolder dynamically in memory and does NOT persist it.
    // Therefore, this step filters based on "already moved/persisted" folders, not "matching rules".
    // To persist rule actions, the user must explicitly apply the rules (saving them to DB via bulkPut).
    if (activeFolder) {
        filtered = filtered.filter(b => (b.newFolder || b.originalFolder) === activeFolder)
    }

    // 5. Smart Filters
    if (smartFilter === 'old') {
        const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(b => {
            if (!b.addDate) return false;
            const date = parseInt(b.addDate) * 1000;
            return date < fiveYearsAgo;
        });
    } else if (smartFilter === 'http') {
        filtered = filtered.filter(b => b.url && b.url.startsWith('http://'));
    } else if (smartFilter === 'untitled') {
        filtered = filtered.filter(b => {
            const title = (b.title || '').trim().toLowerCase();
            const url = (b.url || '').trim().toLowerCase();
            return !title || title === 'untitled' || title === 'page' || title === url || url.includes(title);
        });
    } else if (smartFilter === 'docs') {
        filtered = filtered.filter(b => isDoc(b.url));
    } else if (smartFilter === 'longurl') {
        filtered = filtered.filter(b => (b.url || '').length >= 200);
    } else if (smartFilter === 'media') {
        filtered = filtered.filter(b => domainMatch(b.url, MEDIA_DOMAINS));
    } else if (smartFilter === 'social') {
        filtered = filtered.filter(b => domainMatch(b.url, SOCIAL_DOMAINS));
    } else if (smartFilter === 'shopping') {
        filtered = filtered.filter(b => domainMatch(b.url, SHOPPING_DOMAINS));
    } else if (smartFilter === 'news') {
        filtered = filtered.filter(b => domainMatch(b.url, NEWS_DOMAINS));
    }

    // 6. Collection Filter
    if (activeCollection) {
        filtered = filtered.filter(b => b.collections && b.collections.includes(activeCollection))
    }

    // 7. Duplicate Detection Setup
    const urlMap = new Map();
    filtered.forEach(b => {
        const u = normalizeUrl(b.url);
        if (!urlMap.has(u)) {
            urlMap.set(u, []);
        }
        urlMap.get(u).push({ id: b.id, folder: b.originalFolder });
    });

    // 8. Rule Application & Processing
    const processed = filtered.map(b => {
        let matchedRules = [];
        let newFolder = b.newFolder || b.originalFolder;
        let ruleTags = [];
        let conflictingFolders = [];

        // Check duplicate status
        const siblings = urlMap.get(normalizeUrl(b.url));
        const isMulti = siblings && siblings.length > 1;
        const indexInSiblings = siblings ? siblings.findIndex(s => s.id === b.id) : 0;
        const isDuplicate = isMulti && indexInSiblings > 0;
        const hasDuplicate = isMulti && indexInSiblings === 0;

        const otherLocations = isMulti
            ? siblings.filter(s => s.id !== b.id).map(s => s.folder)
            : [];

        // Collect ALL matching rules (no break on first match)
        for (const rule of rules) {
            let match = false;
            const title = b.title || '';
            const url = b.url || '';
            const contentToCheck = (title + ' ' + url).toLowerCase();
            const rawRuleValue = (rule.value || '').toLowerCase();

            if (!rawRuleValue) continue;

            const ruleValues = rawRuleValue.split(',').map(v => v.trim()).filter(Boolean);

            for (const val of ruleValues) {
                if (rule.type === 'keyword' && contentToCheck.includes(val)) {
                    match = true;
                } else if (rule.type === 'domain' && url.toLowerCase().includes(val)) {
                    match = true;
                } else if (rule.type === 'exact' && title.toLowerCase() === val) {
                    match = true;
                }
                if (match) break;
            }

            if (match) {
                matchedRules.push(rule);
                // Merge tags from all matching rules
                if (rule.tags) {
                    const tags = rule.tags.split(',').map(t => t.trim()).filter(Boolean);
                    ruleTags.push(...tags);
                }
            }
        }

        // Deduplicate rule tags
        ruleTags = Array.from(new Set(ruleTags));

        // Detect folder conflicts
        const rulesWithFolders = matchedRules.filter(r => r.targetFolder);
        const uniqueFolderTargets = [...new Set(rulesWithFolders.map(r => r.targetFolder))];

        let isConflict = false;

        if (uniqueFolderTargets.length === 1) {
            // Only one folder target across all matching rules — no conflict
            newFolder = uniqueFolderTargets[0];
        } else if (uniqueFolderTargets.length > 1) {
            // Check if this conflict has been resolved by the user
            const resolvedFolder = resolvedConflicts && resolvedConflicts[b.id];
            if (resolvedFolder) {
                // User already resolved this conflict — use their choice
                newFolder = resolvedFolder;
            } else {
                // Unresolved conflict
                isConflict = true;
                conflictingFolders = rulesWithFolders.map(r => ({
                    folder: r.targetFolder,
                    ruleType: r.type,
                    ruleValue: r.value
                }));
            }
        }

        let existingTags = b.tags || [];
        if (typeof existingTags === 'string') {
            existingTags = existingTags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const hasMatch = matchedRules.length > 0;

        let finalStatus = hasMatch ? (isConflict ? 'conflict' : 'matched') : 'unchanged';
        let finalNewFolder = hasMatch ? newFolder : b.originalFolder;
        let finalRuleTags = ruleTags;

        // Preserve AI suggestion state if present in DB
        if (b.status === 'suggested' || b.status === 'ai-suggested') {
            finalStatus = b.status;
            finalNewFolder = b.newFolder || b.suggestedFolder || b.originalFolder;
            finalRuleTags = b.ruleTags && b.ruleTags.length > 0 ? b.ruleTags : ruleTags;
        }

        const allTags = Array.from(new Set([...existingTags, ...finalRuleTags]));

        return {
            ...b,
            newFolder: finalNewFolder,
            tags: allTags,
            ruleTags: finalRuleTags,
            matchedRules: matchedRules.map(r => ({ type: r.type, value: r.value, targetFolder: r.targetFolder, tags: r.tags })),
            conflictingFolders,
            status: finalStatus,
            isDuplicate,
            hasDuplicate,
            otherLocations
        };
    });

    // 9. Sorting
    processed.sort((a, b) => {
        const aDup = a.isDuplicate || a.hasDuplicate;
        const bDup = b.isDuplicate || b.hasDuplicate;

        if (aDup && !bDup) return -1;
        if (!aDup && bDup) return 1;

        const aRuleMatch = a.status === 'matched' || a.status === 'conflict';
        const bRuleMatch = b.status === 'matched' || b.status === 'conflict';
        if (aRuleMatch && !bRuleMatch) return -1;
        if (!aRuleMatch && bRuleMatch) return 1;

        if (aDup && bDup) {
            if (a.hasDuplicate && b.isDuplicate) return -1;
            if (a.isDuplicate && b.hasDuplicate) return 1;
        }

        return 0;
    });

    // 9b. User-requested Sorting
    if (sortBy && sortBy !== 'default') {
        const getDomain = (url) => {
            try { return new URL(url).hostname.replace('www.', ''); } catch { return url || ''; }
        };

        processed.sort((a, b) => {
            switch (sortBy) {
                case 'title-az':
                    return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
                case 'title-za':
                    return (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' });
                case 'date-new': {
                    const aDate = parseInt(a.addDate) || 0;
                    const bDate = parseInt(b.addDate) || 0;
                    return bDate - aDate;
                }
                case 'date-old': {
                    const aDate = parseInt(a.addDate) || 0;
                    const bDate = parseInt(b.addDate) || 0;
                    return aDate - bDate;
                }
                case 'domain':
                    return getDomain(a.url).localeCompare(getDomain(b.url));
                case 'folder':
                    return (a.newFolder || a.originalFolder || '').localeCompare(b.newFolder || b.originalFolder || '');
                default:
                    return 0;
            }
        });
    }

    // 10. Statistics Calculation (single pass over bookmarks)
    const tagsMap = new Map();
    const foldersMap = new Map();
    const seenUrls = new Set();
    const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);
    let old = 0, http = 0, untitled = 0, docs = 0, longurl = 0, media = 0, social = 0, shopping = 0, news = 0, duplicateCount = 0;

    bookmarks.forEach(b => {
        // Tags
        let tags = b.tags;
        if (typeof tags === 'string') {
            tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (Array.isArray(tags) && tags.length > 0) {
            for (let t = 0; t < tags.length; t++) {
                tagsMap.set(tags[t], (tagsMap.get(tags[t]) || 0) + 1);
            }
        }
        // Folders
        if (b.originalFolder) {
            foldersMap.set(b.originalFolder, (foldersMap.get(b.originalFolder) || 0) + 1);
        }
        if (b.newFolder && b.newFolder !== b.originalFolder) {
            foldersMap.set(b.newFolder, (foldersMap.get(b.newFolder) || 0) + 1);
        }
        // Smart counts
        if (b.addDate) {
            const date = parseInt(b.addDate) * 1000;
            if (date < fiveYearsAgo) old++;
        }
        if (b.url && b.url.startsWith('http://')) http++;
        const title = (b.title || '').trim().toLowerCase();
        const url = (b.url || '').trim().toLowerCase();
        if (!title || title === 'untitled' || title === 'page' || title === url || url.includes(title)) untitled++;
        if (isDoc(url)) docs++;
        if ((b.url || '').length >= 200) longurl++;
        if (domainMatch(b.url, MEDIA_DOMAINS)) media++;
        if (domainMatch(b.url, SOCIAL_DOMAINS)) social++;
        if (domainMatch(b.url, SHOPPING_DOMAINS)) shopping++;
        if (domainMatch(b.url, NEWS_DOMAINS)) news++;
        // Duplicate count
        const normalized = normalizeUrl(b.url);
        if (seenUrls.has(normalized)) {
            duplicateCount++;
        } else {
            seenUrls.add(normalized);
        }
    });

    const uniqueTags = Array.from(tagsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const uniqueFolders = Array.from(foldersMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const smartCounts = { old, http, untitled, docs, longurl, media, social, shopping, news };

    return {
        processedBookmarks: processed,
        uniqueTags,
        uniqueFolders, // New: Add unique folders
        smartCounts,
        duplicateCount
    };
};

function getProxiedUrl(url, corsProxy) {
    if (!corsProxy) return url;
    const cleanProxy = corsProxy.trim();
    if (!cleanProxy) return url;
    if (cleanProxy.includes('?url=')) {
        return `${cleanProxy}${encodeURIComponent(url)}`;
    }
    if (cleanProxy.endsWith('/')) {
        return `${cleanProxy}${url}`;
    }
    return `${cleanProxy}/${url}`;
}

const checkLink = async (url, corsProxy) => {
    try {
        const fetchUrl = corsProxy ? getProxiedUrl(url, corsProxy) : url;
        const fetchOptions = corsProxy ? {} : { mode: 'no-cors' };
        const res = await fetch(fetchUrl, {
            ...fetchOptions,
            method: corsProxy ? 'GET' : 'HEAD'
        });
        if (corsProxy) {
            return { url, status: res.status < 400 ? 'alive' : 'dead' };
        }
        return { url, status: 'alive' };
    } catch {
        return { url, status: 'dead' };
    }
};

// --- Worker Message Handler ---

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'PROCESS_DATA') {
        try {
            const result = processData(payload);
            self.postMessage({ type: 'DATA_PROCESSED', payload: result });
        } catch (error) {
            console.error('Worker processing error:', error);
            self.postMessage({ type: 'ERROR', payload: error.message });
        }
    } else if (type === 'CHECK_LINKS') {
        const { urls, corsProxy } = payload;
        // Process in batches to avoid overwhelming network
        const batchSize = 5;

        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(url => checkLink(url, corsProxy)));

            // Send incremental updates
            self.postMessage({ type: 'LINK_STATUS_UPDATE', payload: results });
        }

        self.postMessage({ type: 'LINKS_CHECKED_COMPLETE' });
    }
};
