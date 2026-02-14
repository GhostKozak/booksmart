import Fuse from 'fuse.js'

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

// --- Main Processing Logic ---

const processData = ({
    bookmarks,
    rules,
    searchQuery,
    searchMode,
    activeTag,
    activeFolder,
    smartFilter,
    dateFilter,
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
            try {
                const regex = new RegExp(searchQuery, 'i');
                filtered = filtered.filter(b =>
                    regex.test(b.title || '') ||
                    regex.test(b.url || '') ||
                    (b.tags || []).some(t => regex.test(t))
                );
            } catch {
                // Fallback to simple contains
                filtered = filtered.filter(b =>
                    (b.title || '').toLowerCase().includes(query) ||
                    (b.url || '').toLowerCase().includes(query)
                );
            }
        } else {
            // Simple Mode
            filtered = filtered.filter(b =>
                (b.title || '').toLowerCase().includes(query) ||
                (b.url || '').toLowerCase().includes(query) ||
                (b.tags || []).some(t => t.toLowerCase().includes(query))
            );
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

    // 4. Folder Filter
    if (activeFolder) {
        // Note: We need to filter based on the *processed* folder (newFolder), 
        // but at this stage we haven't applied rules yet if we do it in this order.
        // However, the original code applied filters then rules.
        // Wait, the original code applied filters *before* rule processing logic?
        // Let's check App.jsx:
        // It filters `rawBookmarks` into `filtered`.
        // Then it maps `filtered` to `processed`.
        // Inside `processed`, it determines `newFolder`.
        // BUT the original filter logic (lines 258-260) checked:
        // `if (activeFolder) filtered = filtered.filter(b => (b.newFolder || b.originalFolder) === activeFolder)`
        // This implies `newFolder` might already be there? No, `rawBookmarks` usually don't have `newFolder` unless persisted.
        // If the intention is to filter by the *resulting* folder, we should apply rules first?
        // In `App.jsx`, the "Folder Filter" (0.55) runs on `filtered` which comes from `rawBookmarks`.
        // `rawBookmarks` are from `db.bookmarks`.
        // If `db.bookmarks` stores `newFolder`, then it's fine.
        // If `newFolder` is purely derived at runtime from rules, then filtering before rules means we filter based on *persisted* newFolder.
        // Let's assume the standard behavior: Filter based on current state.
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
    }

    // 6. Duplicate Detection Setup
    const urlMap = new Map();
    filtered.forEach(b => {
        const u = b.url;
        if (!urlMap.has(u)) {
            urlMap.set(u, []);
        }
        urlMap.get(u).push({ id: b.id, folder: b.originalFolder });
    });

    // 7. Rule Application & Processing
    const processed = filtered.map(b => {
        let matchedRule = null;
        let newFolder = b.originalFolder;
        let ruleTags = [];

        // Check duplicate status
        const siblings = urlMap.get(b.url);
        const isMulti = siblings && siblings.length > 1;
        const indexInSiblings = siblings ? siblings.findIndex(s => s.id === b.id) : 0;
        const isDuplicate = isMulti && indexInSiblings > 0;
        const hasDuplicate = isMulti && indexInSiblings === 0;

        const otherLocations = isMulti
            ? siblings.filter(s => s.id !== b.id).map(s => s.folder)
            : [];

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
                matchedRule = rule;
                if (rule.targetFolder) {
                    newFolder = rule.targetFolder;
                }
                if (rule.tags) {
                    ruleTags = rule.tags.split(',').map(t => t.trim()).filter(Boolean);
                }
                break;
            }
        }

        const existingTags = b.tags || [];
        const allTags = Array.from(new Set([...existingTags, ...ruleTags]));

        return {
            ...b,
            newFolder: matchedRule ? newFolder : b.originalFolder,
            tags: allTags,
            ruleTags: ruleTags,
            status: matchedRule ? 'matched' : 'unchanged',
            isDuplicate,
            hasDuplicate,
            otherLocations
        };
    });

    // 8. Sorting
    processed.sort((a, b) => {
        const aDup = a.isDuplicate || a.hasDuplicate;
        const bDup = b.isDuplicate || b.hasDuplicate;

        if (aDup && !bDup) return -1;
        if (!aDup && bDup) return 1;

        if (a.status === 'matched' && b.status !== 'matched') return -1;
        if (a.status !== 'matched' && b.status === 'matched') return 1;

        if (aDup && bDup) {
            if (a.hasDuplicate && b.isDuplicate) return -1;
            if (a.isDuplicate && b.hasDuplicate) return 1;
        }

        return 0;
    });

    // 9. Statistics Calculation (on original full dataset or filtered? 
    // App.jsx calculated these on `rawBookmarks` (all of them), 
    // separate from the filtered view. 
    // Should we pass ALL bookmarks for stats, and FILTERED for view?
    // The worker receives `bookmarks` (all).
    // `processed` is the result of filtering.
    // We need to calculate stats on `bookmarks` to match App.jsx behavior.

    // Unique Tags
    const tagsMap = new Map();
    bookmarks.forEach(b => {
        if (b.tags && b.tags.length > 0) {
            b.tags.forEach(t => {
                const count = tagsMap.get(t) || 0;
                tagsMap.set(t, count + 1);
            });
        }
    });
    const uniqueTags = Array.from(tagsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    // Smart Counts
    const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);
    let old = 0;
    let http = 0;
    let untitled = 0;
    let docs = 0;

    bookmarks.forEach(b => {
        if (b.addDate) {
            const date = parseInt(b.addDate) * 1000;
            if (date < fiveYearsAgo) old++;
        }

        if (b.url && b.url.startsWith('http://')) http++;

        const title = (b.title || '').trim().toLowerCase();
        const url = (b.url || '').trim().toLowerCase();
        if (!title || title === 'untitled' || title === 'page' || title === url || url.includes(title)) {
            untitled++;
        }

        if (isDoc(url)) {
            docs++;
        }
    });
    const smartCounts = { old, http, untitled, docs };

    // Duplicate Count
    const urls = new Set();
    let duplicateCount = 0;
    bookmarks.forEach(b => {
        if (urls.has(b.url)) {
            duplicateCount++;
        } else {
            urls.add(b.url);
        }
    });

    return {
        processedBookmarks: processed,
        uniqueTags,
        smartCounts,
        duplicateCount
    };
};

const checkLink = async (url) => {
    try {
        // Mode 'no-cors' allows us to send request without CORS errors blocking the JS,
        // but we can't read status. However, if it doesn't throw, it's likely alive (DNS/TCP ok).
        // If it throws (NetworkError), it's dead.
        await fetch(url, { mode: 'no-cors', method: 'HEAD' });
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
        const { urls } = payload;
        // Process in batches to avoid overwhelming network
        const batchSize = 5;

        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(url => checkLink(url)));

            // Send incremental updates
            self.postMessage({ type: 'LINK_STATUS_UPDATE', payload: results });
        }

        self.postMessage({ type: 'LINKS_CHECKED_COMPLETE' });
    }
};
