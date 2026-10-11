// BookSmart Companion - Background Service Worker
// Enables serverless, 100% CORS-free bookmark health checks

const DEFAULT_TIMEOUT_MS = 8000;
const BATCH_SIZE = 6;

/**
 * Validates whether a URL resolves to a private, loopback, or local IP/hostname
 * to prevent SSRF and internal port scanning.
 */
function isPrivateOrLoopbackUrl(urlStr) {
    try {
        const parsed = new URL(urlStr);
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
            return true;
        }
        const parts = hostname.split('.');
        if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
            const num0 = parseInt(parts[0], 10);
            const num1 = parseInt(parts[1], 10);
            if (num0 === 10) return true;
            if (num0 === 127) return true;
            if (num0 === 169 && num1 === 254) return true;
            if (num0 === 172 && num1 >= 16 && num1 <= 31) return true;
            if (num0 === 192 && num1 === 168) return true;
            if (num0 === 0) return true;
        }
        return false;
    } catch {
        return true;
    }
}

/**
 * Checks a single URL without CORS restrictions.
 * Tries HEAD first for performance; falls back to GET (with Range) if HEAD is rejected.
 */
async function checkUrlDirect(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        return { url, status: 'dead', error: 'invalid_url' };
    }

    const cleanUrl = url.trim();
    if (isPrivateOrLoopbackUrl(cleanUrl)) {
        return { url: cleanUrl, status: 'dead', error: 'restricted_private_network' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        let res;
        try {
            res = await fetch(cleanUrl, {
                method: 'HEAD',
                redirect: 'follow',
                signal: controller.signal
            });
        } catch (headErr) {
            if (headErr.name === 'AbortError') {
                throw headErr;
            }
            res = null;
        }

        // If server refused HEAD (405 Method Not Allowed or 403 Forbidden on HEAD), try GET with minimal byte range
        if (!res || res.status === 405 || res.status === 403) {
            const getController = new AbortController();
            const getTimer = setTimeout(() => getController.abort(), timeoutMs);
            try {
                res = await fetch(cleanUrl, {
                    method: 'GET',
                    headers: { 'Range': 'bytes=0-10' },
                    redirect: 'follow',
                    signal: getController.signal
                });
            } finally {
                clearTimeout(getTimer);
            }
        }

        clearTimeout(timer);

        // Status code < 400 is considered alive (2xx Success, 3xx Redirect)
        const isAlive = res.status < 400;
        return {
            url: cleanUrl,
            status: isAlive ? 'alive' : 'dead',
            statusCode: res.status,
            statusText: res.statusText || ''
        };
    } catch (err) {
        clearTimeout(timer);
        return {
            url: cleanUrl,
            status: 'dead',
            error: err.name === 'AbortError' ? 'timeout' : 'unreachable'
        };
    }
}

// --- Browser Bookmarks API & Two-Way Sync Helpers ---

function normalizeBookmarkUrl(url) {
    if (!url || typeof url !== 'string') return '';
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
        return url.trim().replace(/\/+$/, '');
    }
}

function generateBookmarkId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

const SYSTEM_ROOT_FOLDER_IDS = new Set(['0', '1', '2', '3', 'toolbar_____', 'menu________', 'unfiled_____', 'mobile______']);

/**
 * Recursively flattens a chrome.bookmarks tree into BookSmart bookmark format.
 * Ignores invalid/non-web schemes (e.g. javascript:, place:, chrome:, about:).
 */
function flattenBookmarkTree(nodes, currentPath = '') {
    const results = [];
    if (!Array.isArray(nodes)) return results;

    for (const node of nodes) {
        if (node.url) {
            const trimmedUrl = (node.url || '').trim();
            // Filter non-web and dangerous schemes
            if (!/^(https?|ftp|file):\/\//i.test(trimmedUrl)) {
                continue;
            }
            const addDate = node.dateAdded
                ? Math.floor(node.dateAdded / 1000)
                : Math.floor(Date.now() / 1000);
            const folder = currentPath || 'Root';
            results.push({
                id: generateBookmarkId(),
                browserId: node.id,
                title: node.title || node.url,
                url: trimmedUrl,
                addDate,
                tags: [],
                originalFolder: folder,
                newFolder: folder,
                note: '',
                status: 'unchanged'
            });
        } else if (node.children) {
            let folderName = (node.title || '').trim();
            let nextPath = currentPath;
            if (!SYSTEM_ROOT_FOLDER_IDS.has(node.id) && folderName) {
                nextPath = currentPath ? `${currentPath} > ${folderName}` : folderName;
            }
            results.push(...flattenBookmarkTree(node.children, nextPath));
        }
    }
    return results;
}

/**
 * Retrieves all browser bookmarks.
 */
async function getBrowserBookmarks() {
    if (!chrome.bookmarks) {
        throw new Error('Bookmarks API not available');
    }
    const tree = await chrome.bookmarks.getTree();
    return flattenBookmarkTree(tree);
}

/**
 * Finds or creates a designated target folder in Bookmarks Bar or Root.
 */
async function getOrCreateTargetFolder(folderName = 'BookSmart') {
    const tree = await chrome.bookmarks.getTree();
    const root = tree[0];
    const bar = root.children?.find(c => c.id === '1' || c.id === 'toolbar_____') || root.children?.[0] || root;
    const parentId = bar.id;

    const existing = bar.children?.find(c => c.title === folderName && !c.url);
    if (existing) {
        return { parentId, folderId: existing.id, isNew: false };
    }
    const created = await chrome.bookmarks.create({ parentId, title: folderName });
    return { parentId, folderId: created.id, isNew: true };
}

/**
 * Pushes BookSmart bookmarks into the browser under a designated folder.
 */
async function pushBookmarksToBrowser(bookmarks, { targetFolderName = 'BookSmart', clean = false } = {}) {
    if (!chrome.bookmarks) {
        throw new Error('Bookmarks API not available');
    }
    const { folderId } = await getOrCreateTargetFolder(targetFolderName);

    if (clean) {
        const subTree = await chrome.bookmarks.getSubTree(folderId);
        if (subTree[0]?.children && subTree[0]?.title === targetFolderName) {
            for (const child of subTree[0].children) {
                await chrome.bookmarks.removeTree(child.id);
            }
        }
    }

    const folderCache = new Map();
    folderCache.set('', folderId);
    folderCache.set('Root', folderId);

    const folderChildrenCache = new Map();

    async function getExistingUrlsInFolder(parentId) {
        if (folderChildrenCache.has(parentId)) {
            return folderChildrenCache.get(parentId);
        }
        const children = await chrome.bookmarks.getChildren(parentId);
        const urlSet = new Set(
            children
                .filter(c => c.url)
                .map(c => normalizeBookmarkUrl(c.url))
                .filter(Boolean)
        );
        folderChildrenCache.set(parentId, urlSet);
        return urlSet;
    }

    async function ensureFolderPath(path) {
        if (!path || path === 'Root') return folderId;
        if (folderCache.has(path)) return folderCache.get(path);

        const segments = path.split(' > ').map(s => s.trim()).filter(Boolean);
        let currentParent = folderId;
        let cumulative = '';

        for (const segment of segments) {
            cumulative = cumulative ? `${cumulative} > ${segment}` : segment;
            if (folderCache.has(cumulative)) {
                currentParent = folderCache.get(cumulative);
                continue;
            }

            const children = await chrome.bookmarks.getChildren(currentParent);
            const found = children.find(c => c.title === segment && !c.url);
            if (found) {
                currentParent = found.id;
            } else {
                const created = await chrome.bookmarks.create({ parentId: currentParent, title: segment });
                currentParent = created.id;
            }
            folderCache.set(cumulative, currentParent);
        }
        return currentParent;
    }

    let createdCount = 0;
    for (const b of (bookmarks || [])) {
        if (!b.url) continue;
        const norm = normalizeBookmarkUrl(b.url);
        if (!norm) continue;

        try {
            const targetParentId = await ensureFolderPath(b.newFolder || b.originalFolder);
            const existingUrls = await getExistingUrlsInFolder(targetParentId);

            if (existingUrls.has(norm)) {
                // Prevent duplicate bookmark creation in target folder
                continue;
            }

            await chrome.bookmarks.create({
                parentId: targetParentId,
                title: b.title || b.url,
                url: b.url
            });
            existingUrls.add(norm);
            createdCount++;
        } catch (err) {
            console.warn('Failed to push bookmark to browser:', b.url, err);
        }
    }

    return {
        success: true,
        count: createdCount,
        folder: targetFolderName
    };
}

/**
 * Performs bidirectional synchronization between BookSmart and Browser.
 */
async function syncBrowserBookmarks(appBookmarks = [], options = {}) {
    if (!chrome.bookmarks) {
        throw new Error('Bookmarks API not available');
    }

    const browserBookmarks = await getBrowserBookmarks();
    const appUrlMap = new Map();
    for (const b of appBookmarks) {
        const norm = normalizeBookmarkUrl(b.url);
        if (norm) appUrlMap.set(norm, b);
    }

    const browserUrlMap = new Map();
    for (const b of browserBookmarks) {
        const norm = normalizeBookmarkUrl(b.url);
        if (norm) browserUrlMap.set(norm, b);
    }

    // 1. Missing in App (present in Browser, missing in App)
    const importedBookmarks = [];
    for (const b of browserBookmarks) {
        const norm = normalizeBookmarkUrl(b.url);
        if (norm && !appUrlMap.has(norm)) {
            importedBookmarks.push(b);
        }
    }

    // 2. Missing in Browser (present in App, missing in Browser)
    const toPushToBrowser = [];
    for (const b of appBookmarks) {
        const norm = normalizeBookmarkUrl(b.url);
        if (norm && !browserUrlMap.has(norm)) {
            toPushToBrowser.push(b);
        }
    }

    let exportedCount = 0;
    if (toPushToBrowser.length > 0) {
        const pushResult = await pushBookmarksToBrowser(toPushToBrowser, {
            targetFolderName: options.targetFolderName || 'BookSmart',
            clean: false
        });
        exportedCount = pushResult.count;
    }

    return {
        success: true,
        importedBookmarks,
        exportedCount,
        totalInBrowser: browserBookmarks.length + exportedCount,
        totalInApp: appBookmarks.length + importedBookmarks.length
    };
}

/**
 * Captures currently active tab to browser bookmarks.
 * Prevents duplicates and notifies open BookSmart tabs in real-time.
 */
async function captureCurrentTab(options = {}) {
    if (!chrome.tabs || !chrome.bookmarks) {
        throw new Error('Tabs or Bookmarks API not available');
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
        throw new Error('No active tab found');
    }
    const currentTab = tabs[0];
    if (!currentTab.url || !/^https?:\/\//i.test(currentTab.url)) {
        throw new Error('Cannot bookmark non-web page (e.g. browser internal page)');
    }

    const folderName = options.folderName || 'BookSmart';
    const { folderId } = await getOrCreateTargetFolder(folderName);

    const norm = normalizeBookmarkUrl(currentTab.url);
    const existingChildren = await chrome.bookmarks.getChildren(folderId);
    const existing = existingChildren.find(c => c.url && normalizeBookmarkUrl(c.url) === norm);

    let bookmarkResult;
    if (existing) {
        bookmarkResult = {
            id: generateBookmarkId(),
            browserId: existing.id,
            title: existing.title || currentTab.title,
            url: existing.url,
            addDate: Math.floor(Date.now() / 1000),
            originalFolder: folderName,
            newFolder: folderName,
            tags: [],
            note: '',
            status: 'unchanged',
            alreadyExisted: true
        };
    } else {
        const created = await chrome.bookmarks.create({
            parentId: folderId,
            title: currentTab.title || currentTab.url,
            url: currentTab.url
        });

        bookmarkResult = {
            id: generateBookmarkId(),
            browserId: created.id,
            title: created.title,
            url: created.url,
            addDate: Math.floor(Date.now() / 1000),
            originalFolder: folderName,
            newFolder: folderName,
            tags: [],
            note: '',
            status: 'unchanged'
        };
    }

    // Broadcast to open BookSmart tabs to sync real-time
    try {
        chrome.tabs.query({ url: ['*://localhost/*', '*://127.0.0.1/*', '*://*/*booksmart*'] }, (openTabs) => {
            if (openTabs && openTabs.length > 0) {
                for (const t of openTabs) {
                    chrome.tabs.sendMessage(t.id, {
                        action: 'BOOKSMART_TAB_CAPTURED',
                        bookmark: bookmarkResult
                    }).catch(() => {});
                }
            }
        });
    } catch {
        // Ignored
    }

    return bookmarkResult;
}

const TRUSTED_ORIGIN_PATTERNS = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https:\/\/booksmart\.app$/,
    /^https:\/\/ghostkozak\.github\.io$/
];

function isSenderAuthorized(sender) {
    if (!sender || !sender.url) return true; // Extension popup or internal service worker
    try {
        const url = new URL(sender.url);
        if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
            return true;
        }
        return TRUSTED_ORIGIN_PATTERNS.some(p => p.test(url.origin));
    } catch {
        return false;
    }
}

// 1. One-off Message Listener (Ping, Single Check, Bookmarks API)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'PING') {
            sendResponse({ success: true, version: '1.1.0', type: 'PONG' });
            return true;
        }

        if (request.action === 'CHECK_SINGLE_URL') {
            checkUrlDirect(request.url, request.timeoutMs)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ url: request.url, status: 'dead', error: err.message }));
            return true;
        }

        const SENSITIVE_ACTIONS = [
            'GET_BROWSER_BOOKMARKS',
            'PUSH_BROWSER_BOOKMARKS',
            'SYNC_BROWSER_BOOKMARKS',
            'CAPTURE_CURRENT_TAB'
        ];

        if (SENSITIVE_ACTIONS.includes(request.action) && !isSenderAuthorized(sender)) {
            sendResponse({ success: false, error: 'Unauthorized sender origin' });
            return true;
        }

        if (request.action === 'GET_BROWSER_BOOKMARKS') {
            getBrowserBookmarks()
                .then(bookmarks => sendResponse({ success: true, bookmarks }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.action === 'PUSH_BROWSER_BOOKMARKS') {
            pushBookmarksToBrowser(request.bookmarks, request.options)
                .then(result => sendResponse({ success: true, ...result }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.action === 'SYNC_BROWSER_BOOKMARKS') {
            syncBrowserBookmarks(request.bookmarks, request.options)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.action === 'CAPTURE_CURRENT_TAB') {
            captureCurrentTab(request.options)
                .then(bookmark => sendResponse({ success: true, bookmark }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }
    });
}

// 2. Long-lived Port Listener for Streaming Batch Link Checks
if (typeof chrome !== 'undefined' && chrome.runtime?.onConnect) {
    chrome.runtime.onConnect.addListener((port) => {
        if (port.name === 'booksmart-link-check') {
            let isCancelled = false;

            port.onDisconnect.addListener(() => {
                isCancelled = true;
            });

            port.onMessage.addListener(async (msg) => {
                if (msg.action === 'START_CHECK') {
                    const urls = Array.isArray(msg.urls) ? msg.urls : [];
                    const batchSize = Math.min(Math.max(1, msg.batchSize || BATCH_SIZE), 12);

                    for (let i = 0; i < urls.length; i += batchSize) {
                        if (isCancelled) break;

                        const batch = urls.slice(i, i + batchSize);
                        const results = await Promise.all(batch.map(url => checkUrlDirect(url)));

                        if (isCancelled) break;

                        try {
                            port.postMessage({
                                type: 'BATCH_UPDATE',
                                results,
                                processed: Math.min(i + batchSize, urls.length),
                                total: urls.length
                            });
                        } catch {
                            isCancelled = true;
                            break;
                        }
                    }

                    if (!isCancelled) {
                        try {
                            port.postMessage({ type: 'COMPLETE' });
                        } catch {
                            // Port already closed
                        }
                    }
                } else if (msg.action === 'CANCEL_CHECK') {
                    isCancelled = true;
                }
            });
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isPrivateOrLoopbackUrl,
        checkUrlDirect,
        normalizeBookmarkUrl,
        generateBookmarkId,
        flattenBookmarkTree,
        getOrCreateTargetFolder,
        pushBookmarksToBrowser,
        syncBrowserBookmarks,
        captureCurrentTab,
        isSenderAuthorized,
        SYSTEM_ROOT_FOLDER_IDS
    };
}
