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

/**
 * Decodes basic HTML entities like &amp;, &quot;, &#39;, &lt;, &gt;
 */
function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
            try { return String.fromCharCode(parseInt(hex, 16)); } catch { return ''; }
        })
        .replace(/&#(\d+);/g, (_, dec) => {
            try { return String.fromCharCode(parseInt(dec, 10)); } catch { return ''; }
        })
        .trim();
}

/**
 * Resolves a potentially relative URL against a base URL safely.
 */
function toAbsoluteUrl(relativeUrl, baseUrl) {
    if (!relativeUrl || typeof relativeUrl !== 'string') return null;
    const trimmed = relativeUrl.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return null;
    try {
        const parsed = new URL(trimmed, baseUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.href;
    } catch {
        return null;
    }
}

/**
 * Fetches page HTML and extracts OpenGraph / Twitter / standard metadata
 * including title, description, cover image, site name, and favicon.
 */
async function fetchOgMetadata(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        return { success: false, error: 'invalid_url', url };
    }

    const cleanUrl = url.trim();
    if (isPrivateOrLoopbackUrl(cleanUrl)) {
        return { success: false, error: 'restricted_private_network', url: cleanUrl };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(cleanUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                error: `HTTP ${response.status}`,
                url: cleanUrl
            };
        }

        // Only read up to first ~300KB of HTML to save memory and parse rapidly
        const rawText = await response.text();
        const html = rawText.slice(0, 300000);
        const finalUrl = response.url || cleanUrl;

        // 1. Title: og:title -> twitter:title -> <title>
        let title = '';
        const ogTitleMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']*)["']/i) ||
                             html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:title|twitter:title)["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
            title = decodeHtmlEntities(ogTitleMatch[1]);
        } else {
            const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            if (titleTagMatch && titleTagMatch[1]) {
                title = decodeHtmlEntities(titleTagMatch[1]);
            }
        }

        // 2. Description: og:description -> twitter:description -> meta description
        let description = '';
        const ogDescMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|twitter:description|description)["'][^>]+content=["']([^"']*)["']/i) ||
                            html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:description|twitter:description|description)["']/i);
        if (ogDescMatch && ogDescMatch[1]) {
            description = decodeHtmlEntities(ogDescMatch[1]);
        }

        // 3. Image: og:image -> twitter:image
        let image = null;
        const ogImgMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']*)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["']/i);
        if (ogImgMatch && ogImgMatch[1]) {
            image = toAbsoluteUrl(decodeHtmlEntities(ogImgMatch[1]), finalUrl);
        }

        // 4. Site Name: og:site_name
        let siteName = '';
        const ogSiteMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:site_name)["'][^>]+content=["']([^"']*)["']/i) ||
                            html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:site_name)["']/i);
        if (ogSiteMatch && ogSiteMatch[1]) {
            siteName = decodeHtmlEntities(ogSiteMatch[1]);
        } else {
            try {
                siteName = new URL(finalUrl).hostname.replace(/^www\./, '');
            } catch {
                siteName = '';
            }
        }

        // 5. Favicon: apple-touch-icon -> icon -> shortcut icon
        let favicon = null;
        const iconMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon(?:-precomposed)?|icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i) ||
                          html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:apple-touch-icon(?:-precomposed)?|icon|shortcut icon)["']/i);
        if (iconMatch && iconMatch[1]) {
            favicon = toAbsoluteUrl(decodeHtmlEntities(iconMatch[1]), finalUrl);
        }

        return {
            success: true,
            metadata: {
                url: cleanUrl,
                finalUrl,
                title,
                description,
                image,
                siteName,
                favicon
            }
        };
    } catch (err) {
        clearTimeout(timer);
        return {
            success: false,
            error: err.name === 'AbortError' ? 'timeout' : (err.message || 'fetch_failed'),
            url: cleanUrl
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

    let targetUrl = options.url;
    let targetTitle = options.title;

    if (!targetUrl) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            throw new Error('No active tab found');
        }
        const currentTab = tabs[0];
        targetUrl = currentTab.url;
        targetTitle = currentTab.title;
    }

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        throw new Error('Cannot bookmark non-web page (e.g. browser internal page)');
    }

    const folderName = options.folderName || 'BookSmart';
    const note = (options.note || '').trim();
    const { folderId } = await getOrCreateTargetFolder(folderName);

    const norm = normalizeBookmarkUrl(targetUrl);
    const existingChildren = await chrome.bookmarks.getChildren(folderId);
    const existing = existingChildren.find(c => c.url && normalizeBookmarkUrl(c.url) === norm);
    const dupCheck = await checkUrlDuplicate(targetUrl);

    let bookmarkResult;
    if (existing || dupCheck.isDuplicate) {
        const resolvedFolder = (dupCheck.isDuplicate ? dupCheck.folder : null) || folderName;
        bookmarkResult = {
            id: generateBookmarkId(),
            browserId: existing?.id,
            title: existing?.title || dupCheck.title || targetTitle || targetUrl,
            url: targetUrl,
            addDate: Math.floor(Date.now() / 1000),
            originalFolder: resolvedFolder,
            newFolder: resolvedFolder,
            folder: resolvedFolder,
            tags: [],
            note: note,
            status: 'unchanged',
            alreadyExisted: true
        };
    } else {
        const created = await chrome.bookmarks.create({
            parentId: folderId,
            title: targetTitle || targetUrl,
            url: targetUrl
        });

        bookmarkResult = {
            id: generateBookmarkId(),
            browserId: created.id,
            title: created.title,
            url: created.url,
            addDate: Math.floor(Date.now() / 1000),
            originalFolder: folderName,
            newFolder: folderName,
            folder: folderName,
            tags: [],
            note: note,
            status: 'unchanged',
            alreadyExisted: false
        };
    }

    // Broadcast to open BookSmart tabs to sync real-time
    try {
        const BOOKSMART_TAB_PATTERNS = [
            '*://localhost/*',
            '*://127.0.0.1/*',
            '*://booksmart.app/*',
            '*://*.booksmart.app/*',
            '*://ghostkozak.github.io/booksmart/*'
        ];
        chrome.tabs.query({ url: BOOKSMART_TAB_PATTERNS }, (openTabs) => {
            if (openTabs && openTabs.length > 0) {
                for (const t of openTabs) {
                    try {
                        const sendPromise = chrome.tabs.sendMessage(t.id, {
                            action: 'BOOKSMART_TAB_CAPTURED',
                            bookmark: bookmarkResult
                        });
                        if (sendPromise && typeof sendPromise.catch === 'function') {
                            sendPromise.catch(() => {});
                        }
                    } catch {
                        // Ignored if tab closed or content script not present
                    }
                }
            }
        });
    } catch {
        // Ignored
    }

    return bookmarkResult;
}

/**
 * Recursively searches bookmark tree nodes to find matching URL.
 */
function findBookmarkInTree(nodes, normUrl, parentTitle = 'Root') {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
        if (node.url && normalizeBookmarkUrl(node.url) === normUrl) {
            return {
                found: true,
                title: node.title || '',
                url: node.url,
                folder: parentTitle || 'Root',
                id: node.id
            };
        }
        if (node.children) {
            let nextParent = node.title || parentTitle;
            if (SYSTEM_ROOT_FOLDER_IDS.has(String(node.id))) {
                nextParent = 'Bookmarks Bar';
            }
            const found = findBookmarkInTree(node.children, normUrl, nextParent);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Checks if a URL already exists in either browser bookmarks or BookSmart app cache.
 */
async function checkUrlDuplicate(url) {
    if (!url || typeof url !== 'string') {
        return { isDuplicate: false };
    }
    const norm = normalizeBookmarkUrl(url);
    if (!norm) return { isDuplicate: false };

    // 1. Check in Browser bookmarks
    if (typeof chrome !== 'undefined' && chrome.bookmarks?.getTree) {
        try {
            const tree = await chrome.bookmarks.getTree();
            const match = findBookmarkInTree(tree, norm);
            if (match) {
                return {
                    isDuplicate: true,
                    folder: match.folder || 'Bookmarks Bar',
                    title: match.title,
                    source: 'browser'
                };
            }
        } catch {
            // Ignored
        }
    }

    // 2. Check in appBookmarksCache (synced from BookSmart app)
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
            const data = await chrome.storage.local.get(['appBookmarksCache']);
            const cache = data?.appBookmarksCache;
            if (cache && typeof cache === 'object' && cache[norm]) {
                const item = cache[norm];
                return {
                    isDuplicate: true,
                    folder: item.folder || item.newFolder || item.originalFolder || 'BookSmart',
                    title: item.title,
                    source: 'booksmart'
                };
            }
        } catch {
            // Ignored
        }
    }

    return { isDuplicate: false };
}

/**
 * Formats default session folder/collection name like "Araştırma - 12 Ekim".
 */
function getDefaultSessionName() {
    const now = new Date();
    const day = now.getDate();
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const month = monthNames[now.getMonth()] || (now.getMonth() + 1);
    return `Araştırma - ${day} ${month}`;
}

const TRUSTED_ORIGIN_PATTERNS = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/\[::1\](:\d+)?$/,
    /^https:\/\/.*booksmart\.app$/,
    /^https:\/\/ghostkozak\.github\.io$/
];

/**
 * Saves all open tabs in current window into a dated session collection/folder (OneTab style).
 */
async function saveActiveTabsSession(options = {}) {
    if (!chrome.tabs) {
        throw new Error('Tabs API not available');
    }

    const sessionName = (options.sessionName || getDefaultSessionName()).trim();
    const closeTabs = Boolean(options.closeTabs);

    const tabs = await chrome.tabs.query({ currentWindow: true });
    if (!tabs || tabs.length === 0) {
        return { success: false, error: 'no_tabs_found', count: 0, sessionName };
    }

    // Filter valid web tabs (ignore internal schemes like chrome://, moz-extension://, etc.)
    const validTabs = tabs.filter(t => {
        if (!t.url) return false;
        const u = t.url.toLowerCase();
        if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
        try {
            const origin = new URL(t.url).origin;
            if (TRUSTED_ORIGIN_PATTERNS.some(p => p.test(origin))) {
                return false;
            }
        } catch {
            return false;
        }
        return true;
    });

    if (validTabs.length === 0) {
        return { success: false, error: 'no_valid_web_tabs', count: 0, sessionName };
    }

    // Save bookmarks to browser under BookSmart / sessionName
    if (chrome.bookmarks) {
        const rootFolder = await getOrCreateTargetFolder('BookSmart');
        const sessionFolder = await chrome.bookmarks.create({
            parentId: rootFolder.folderId,
            title: sessionName
        });

        for (const t of validTabs) {
            try {
                await chrome.bookmarks.create({
                    parentId: sessionFolder.id,
                    title: t.title || t.url,
                    url: t.url
                });
            } catch {
                // Ignore single bookmark failure
            }
        }
    }

    const sessionBookmarks = validTabs.map(t => ({
        id: generateBookmarkId(),
        title: t.title || t.url,
        url: t.url,
        addDate: Math.floor(Date.now() / 1000),
        originalFolder: sessionName,
        newFolder: sessionName,
        collections: [sessionName],
        tags: ['session'],
        note: '',
        status: 'unchanged'
    }));

    // Broadcast BOOKSMART_SESSION_SAVED to open BookSmart tabs
    const booksmartTabs = tabs.filter(t => {
        if (!t.url) return false;
        try {
            const origin = new URL(t.url).origin;
            return TRUSTED_ORIGIN_PATTERNS.some(p => p.test(origin));
        } catch {
            return false;
        }
    });

    for (const bTab of booksmartTabs) {
        try {
            const sendPromise = chrome.tabs.sendMessage(bTab.id, {
                action: 'BOOKSMART_SESSION_SAVED',
                sessionName,
                bookmarks: sessionBookmarks
            });
            if (sendPromise && typeof sendPromise.catch === 'function') {
                sendPromise.catch(() => {});
            }
        } catch {
            // Ignored
        }
    }

    // If closeTabs is true, close the saved tabs
    if (closeTabs) {
        if (booksmartTabs.length === 0 && chrome.storage?.local) {
            try {
                const stored = await chrome.storage.local.get(['lastBooksmartUrl']);
                const appUrl = stored?.lastBooksmartUrl || 'http://localhost:5173';
                await chrome.tabs.create({ url: appUrl });
            } catch {
                // Ignored
            }
        }

        const tabIdsToClose = validTabs.map(t => t.id).filter(id => id !== undefined && id !== null);
        if (tabIdsToClose.length > 0) {
            try {
                await chrome.tabs.remove(tabIdsToClose);
            } catch {
                // Ignored
            }
        }
    }

    return {
        success: true,
        count: sessionBookmarks.length,
        sessionName,
        bookmarks: sessionBookmarks
    };
}

/**
 * Displays a native browser/OS desktop notification.
 */
function showNotification(title, message, isWarning = false) {
    if (typeof chrome === 'undefined' || !chrome.notifications?.create) return;
    try {
        const notifId = 'booksmart_' + Date.now();
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: title || 'BookSmart',
            message: message || '',
            priority: isWarning ? 2 : 1
        }, () => {
            if (chrome.runtime?.lastError) {
                // Ignore notification error
            }
        });
    } catch {
        // Ignored
    }
}

/**
 * Injects a floating in-page feedback pill on the active tab for immediate visual feedback.
 */
function showInPageToast(tabId, { title = 'BookSmart', message = '', isWarning = false } = {}) {
    if (!tabId || typeof chrome === 'undefined') return;

    if (chrome.scripting?.executeScript) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: (t, m, isWarn) => {
                try {
                    const existing = document.getElementById('booksmart-inpage-toast');
                    if (existing) existing.remove();

                    const toast = document.createElement('div');
                    toast.id = 'booksmart-inpage-toast';
                    const bg = isWarn ? '#1e293b' : '#0f172a';
                    const border = isWarn ? '#f59e0b' : '#10b981';
                    const titleColor = isWarn ? '#fbbf24' : '#34d399';
                    const icon = isWarn ? '⚠️' : '✓';

                    toast.style.cssText = [
                        'position: fixed !important',
                        'top: 20px !important',
                        'right: 20px !important',
                        'z-index: 2147483647 !important',
                        'display: flex !important',
                        'align-items: flex-start !important',
                        'gap: 10px !important',
                        'padding: 12px 16px !important',
                        'border-radius: 10px !important',
                        'background: ' + bg + ' !important',
                        'border: 1.5px solid ' + border + ' !important',
                        'color: #f8fafc !important',
                        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
                        'font-size: 13px !important',
                        'line-height: 1.4 !important',
                        'box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important',
                        'transition: all 0.25s ease !important',
                        'max-width: 360px !important',
                        'cursor: pointer !important'
                    ].join(';');

                    toast.innerHTML = '<span style="font-size: 16px; line-height: 1;">' + icon + '</span>' +
                        '<div><strong style="display:block; font-weight:600; color:' + titleColor + ';">' + t + '</strong>' +
                        '<span style="font-size:12px; color:#cbd5e1;">' + m + '</span></div>';

                    toast.onclick = () => toast.remove();
                    document.body.appendChild(toast);

                    setTimeout(() => {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateY(-8px)';
                        setTimeout(() => toast.remove(), 300);
                    }, 4000);
                } catch {
                    // Ignored on restricted internal pages
                }
            },
            args: [title, message, isWarning]
        }).catch(() => {});
    }
}

/**
 * Displays a temporary badge feedback on the extension action icon.
 */
function showBadge(text, color = '#10b981', durationMs = 3000) {
    if (typeof chrome === 'undefined' || !chrome.action?.setBadgeText) return;
    try {
        chrome.action.setBadgeText({ text });
        if (chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color });
        }
        if (durationMs > 0) {
            setTimeout(() => {
                try {
                    chrome.action.setBadgeText({ text: '' });
                } catch {
                    // Ignored
                }
            }, durationMs);
        }
    } catch {
        // Ignored
    }
}

const CONTEXT_MENU_FOLDERS = [
    { id: 'booksmart_folder_reading', title: 'Okuma Listesi' },
    { id: 'booksmart_folder_dev', title: 'Yazılım' },
    { id: 'booksmart_folder_research', title: 'Araştırma' },
    { id: 'booksmart_folder_inspiration', title: 'İlham' },
    { id: 'booksmart_folder_tools', title: 'Araçlar' }
];

function setupContextMenus() {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

    try {
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime?.lastError) {
                // Ignore remove error
            }

            // 1. Direct Save: "BookSmart'a Kaydet"
            chrome.contextMenus.create({
                id: 'booksmart_save_direct',
                title: "BookSmart'a Kaydet",
                contexts: ['page', 'link', 'selection']
            }, () => void chrome.runtime?.lastError);

            // 2. Folder Submenu Parent: "Klasör Seçerek Kaydet"
            chrome.contextMenus.create({
                id: 'booksmart_save_to_folder_root',
                title: "Klasör Seçerek Kaydet",
                contexts: ['page', 'link', 'selection']
            }, () => void chrome.runtime?.lastError);

            // Submenu folders
            for (const item of CONTEXT_MENU_FOLDERS) {
                chrome.contextMenus.create({
                    id: item.id,
                    parentId: 'booksmart_save_to_folder_root',
                    title: item.title,
                    contexts: ['page', 'link', 'selection']
                }, () => void chrome.runtime?.lastError);
            }

            // 3. Save all tabs session
            chrome.contextMenus.create({
                id: 'booksmart_save_all_tabs_session',
                title: "Açık Sekmeleri Koleksiyon Yap (OneTab)",
                contexts: ['page']
            }, () => void chrome.runtime?.lastError);
        });
    } catch {
        // Ignored
    }
}

async function handleContextMenuClick(info, tab) {
    if (!info) return;

    if (info.menuItemId === 'booksmart_save_all_tabs_session') {
        try {
            const res = await saveActiveTabsSession({ closeTabs: false });
            if (res && res.success) {
                showBadge('✓', '#10b981');
                showNotification(
                    'BookSmart - Sekmeler Kaydedildi',
                    `"${res.sessionName}" koleksiyonu oluşturuldu (${res.count} sekme).`,
                    false
                );
                showInPageToast(tab?.id, {
                    title: 'Sekmeler Kaydedildi',
                    message: `"${res.sessionName}" koleksiyonu (${res.count} sekme)`,
                    isWarning: false
                });
            } else {
                showBadge('!', '#ef4444');
                showNotification('BookSmart - Hata', res?.error || 'Sekmeler kaydedilemedi.', true);
            }
        } catch (err) {
            showBadge('!', '#ef4444');
            showNotification('BookSmart - Hata', err.message || 'Sekmeler kaydedilemedi.', true);
        }
        return;
    }

    const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        showBadge('!', '#ef4444');
        showNotification('BookSmart - Uyarı', 'Yalnızca web bağlantıları (http/https) kaydedilebilir.', true);
        showInPageToast(tab?.id, {
            title: 'Kaydedilemedi',
            message: 'Geçersiz web adresi.',
            isWarning: true
        });
        return;
    }

    let targetTitle = tab?.title || targetUrl;
    if (info.linkUrl && !info.pageUrl) {
        targetTitle = info.selectionText || info.linkUrl;
    }

    let targetFolder = 'BookSmart';
    const folderMatch = CONTEXT_MENU_FOLDERS.find(f => f.id === info.menuItemId);
    if (folderMatch) {
        targetFolder = folderMatch.title;
    }

    const note = (info.selectionText || '').trim();

    try {
        const result = await captureCurrentTab({
            folderName: targetFolder,
            url: targetUrl,
            title: targetTitle,
            note
        });

        const activeTabId = tab?.id;
        const displayTitle = (result.title || targetTitle || 'Bağlantı').slice(0, 45);

        if (result.alreadyExisted) {
            const existingFolder = result.folder || targetFolder;
            showBadge('VAR', '#f59e0b', 3500);
            showNotification(
                'BookSmart - Zaten Kayıtlı!',
                `"${displayTitle}" zaten "${existingFolder}" klasöründe kayıtlı.`,
                true
            );
            showInPageToast(activeTabId, {
                title: 'Zaten Kayıtlı!',
                message: `Bu link zaten "${existingFolder}" klasöründe mevcut.`,
                isWarning: true
            });
        } else {
            showBadge('✓', '#10b981', 3000);
            showNotification(
                'BookSmart - Kaydedildi',
                `"${displayTitle}" "${targetFolder}" klasörüne başarıyla kaydedildi.`,
                false
            );
            showInPageToast(activeTabId, {
                title: 'BookSmart\'a Kaydedildi',
                message: `"${displayTitle}" → ${targetFolder}`,
                isWarning: false
            });
        }
    } catch (err) {
        console.error('Error saving via context menu:', err);
        showBadge('!', '#ef4444', 3000);
        showNotification('BookSmart - Hata', err.message || 'Yer imi kaydedilemedi', true);
        showInPageToast(tab?.id, {
            title: 'Kaydedilemedi',
            message: err.message || 'Bir hata oluştu',
            isWarning: true
        });
    }
}

if (typeof chrome !== 'undefined') {
    if (chrome.contextMenus?.onClicked) {
        chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
    }
    if (chrome.runtime?.onInstalled) {
        chrome.runtime.onInstalled.addListener(() => {
            setupContextMenus();
        });
    }
    if (chrome.contextMenus) {
        setupContextMenus();
    }
}

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

        if (request.action === 'CHECK_URL_DUPLICATE') {
            checkUrlDuplicate(request.url)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ isDuplicate: false, error: err.message }));
            return true;
        }

        if (request.action === 'FETCH_OG_METADATA') {
            fetchOgMetadata(request.url, request.timeoutMs)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ success: false, error: err.message, url: request.url }));
            return true;
        }

        const SENSITIVE_ACTIONS = [
            'GET_BROWSER_BOOKMARKS',
            'PUSH_BROWSER_BOOKMARKS',
            'SYNC_BROWSER_BOOKMARKS',
            'CAPTURE_CURRENT_TAB',
            'SAVE_SESSION_TABS'
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

        if (request.action === 'SAVE_SESSION_TABS') {
            saveActiveTabsSession(request.options)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (request.action === 'SHOW_NOTIFICATION') {
            showNotification(request.title, request.message, request.isWarning);
            if (sender?.tab?.id) {
                showInPageToast(sender.tab.id, {
                    title: request.title,
                    message: request.message,
                    isWarning: request.isWarning
                });
            }
            sendResponse({ success: true });
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
        fetchOgMetadata,
        decodeHtmlEntities,
        toAbsoluteUrl,
        isSenderAuthorized,
        SYSTEM_ROOT_FOLDER_IDS,
        findBookmarkInTree,
        checkUrlDuplicate,
        getDefaultSessionName,
        saveActiveTabsSession,
        showBadge,
        showNotification,
        showInPageToast,
        CONTEXT_MENU_FOLDERS,
        setupContextMenus,
        handleContextMenuClick
    };
}
