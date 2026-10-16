/**
 * BookSmart Companion Extension Client Bridge
 * Communicates with the companion browser extension for serverless, CORS-free health checks.
 */

let extensionState = {
    available: false,
    version: null,
    lastChecked: null
};

const listeners = new Set();

function notifyListeners() {
    listeners.forEach(cb => {
        try {
            cb({ ...extensionState });
        } catch (e) {
            console.error('Error notifying extension listener:', e);
        }
    });
}

/**
 * Resets internal state for unit testing.
 */
export function _resetExtensionStateForTesting() {
    extensionState = {
        available: false,
        version: null,
        lastChecked: null
    };
    bridgeInitialized = false;
    listeners.clear();
}

/**
 * Initializes the window message listener to detect the extension.
 */
let bridgeInitialized = false;
export function initExtensionBridge() {
    if (bridgeInitialized || typeof window === 'undefined') return;
    bridgeInitialized = true;

    window.addEventListener('message', (event) => {
        if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') {
            return;
        }
        if (event.source && event.source !== window) {
            return;
        }

        const { type, version } = event.data;

        if (type === 'BOOKSMART_EXTENSION_READY' || type === 'BOOKSMART_PONG') {
            extensionState = {
                available: true,
                version: version || '1.1.0',
                lastChecked: Date.now()
            };
            notifyListeners();
        }
    });

    // Send initial ping, with graceful retry intervals if extension or page was just loaded
    const tryPing = (timeout) => pingExtension(timeout).catch(() => {});
    tryPing(1500);
    setTimeout(() => {
        if (!extensionState.available) tryPing(2000);
    }, 800);
    setTimeout(() => {
        if (!extensionState.available) tryPing(3000);
    }, 2500);
}

/**
 * Subscribes to extension connection state changes.
 * @param {Function} callback - ({ available, version }) => void
 * @returns {Function} Unsubscribe function
 */
export function subscribeExtensionStatus(callback) {
    listeners.add(callback);
    // Notify immediately with current state
    callback({ ...extensionState });
    return () => {
        listeners.delete(callback);
    };
}

/**
 * Synchronous check of the last known extension availability.
 */
export function isExtensionConnected() {
    return extensionState.available;
}

/**
 * Get current extension state.
 */
export function getExtensionState() {
    return { ...extensionState };
}

/**
 * Pings the extension via window.postMessage with a timeout.
 * @param {number} timeoutMs
 * @returns {Promise<{ available: boolean, version: string|null }>}
 */
export function pingExtension(timeoutMs = 1500) {
    if (typeof window === 'undefined') {
        return Promise.resolve({ available: false, version: null });
    }

    return new Promise((resolve) => {
        const requestId = 'ping_' + Math.random().toString(36).slice(2, 9);
        let resolved = false;

        const onMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') {
                return;
            }
            if (event.source && event.source !== window) {
                return;
            }

            if (event.data.type === 'BOOKSMART_PONG' && (!event.data.requestId || event.data.requestId === requestId)) {
                resolved = true;
                window.removeEventListener('message', onMessage);
                extensionState = {
                    available: true,
                    version: event.data.version || '1.0.0',
                    lastChecked: Date.now()
                };
                notifyListeners();
                resolve({ available: true, version: extensionState.version });
            }
        };

        window.addEventListener('message', onMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_PING',
            requestId
        }, '*');

        setTimeout(() => {
            if (!resolved) {
                window.removeEventListener('message', onMessage);
                // If we haven't confirmed, don't immediately overwrite if already confirmed recently
                if (Date.now() - (extensionState.lastChecked || 0) > 10000) {
                    extensionState.available = false;
                    notifyListeners();
                }
                resolve({ available: extensionState.available, version: extensionState.version });
            }
        }, timeoutMs);
    });
}

/**
 * Checks a batch of URLs using the companion extension.
 * Completely serverless and bypasses CORS restrictions with accurate HTTP status codes.
 *
 * @param {string[]} urls
 * @param {Object} options
 * @param {Function} [options.onProgress] - (results, processed, total) => void
 * @param {Function} [options.onComplete] - () => void
 * @param {Function} [options.onError] - (error) => void
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.batchSize]
 * @returns {Promise<Array<{ url: string, status: 'alive'|'dead', statusCode?: number }>>}
 */
export function checkLinksWithExtension(urls, {
    onProgress,
    onComplete,
    onError,
    signal,
    batchSize = 6
} = {}) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    if (!urls || urls.length === 0) {
        onComplete?.();
        return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
        const requestId = 'check_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const accumulatedResults = [];
        let activityTimer = null;
        const INACTIVITY_TIMEOUT_MS = 25000;

        const resetTimer = () => {
            if (activityTimer) clearTimeout(activityTimer);
            activityTimer = setTimeout(() => {
                cleanup();
                const err = new Error('Companion extension timed out during link check');
                onError?.(err);
                reject(err);
            }, INACTIVITY_TIMEOUT_MS);
        };

        const cleanup = () => {
            if (activityTimer) clearTimeout(activityTimer);
            window.removeEventListener('message', handleMessage);
            if (signal) {
                signal.removeEventListener('abort', handleAbort);
            }
        };

        const handleAbort = () => {
            window.postMessage({
                source: 'BOOKSMART_PAGE',
                type: 'BOOKSMART_CANCEL_CHECK',
                requestId
            }, '*');
            cleanup();
            reject(new Error('Link check cancelled by user'));
        };

        if (signal) {
            if (signal.aborted) {
                return reject(new Error('Link check aborted'));
            }
            signal.addEventListener('abort', handleAbort);
        }

        resetTimer();

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') {
                return;
            }
            if (event.source && event.source !== window) {
                return;
            }

            if (event.data.requestId !== requestId) {
                return;
            }

            if (event.data.type === 'BOOKSMART_LINK_STATUS_UPDATE') {
                resetTimer();
                const batch = event.data.results || [];
                accumulatedResults.push(...batch);
                onProgress?.(batch, event.data.processed, event.data.total);
            } else if (event.data.type === 'BOOKSMART_LINKS_CHECKED_COMPLETE') {
                cleanup();
                onComplete?.();
                resolve(accumulatedResults);
            } else if (event.data.type === 'BOOKSMART_LINKS_CHECKED_ERROR') {
                cleanup();
                const err = new Error(event.data.error || 'Extension link check failed');
                onError?.(err);
                reject(err);
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_CHECK_LINKS',
            requestId,
            payload: {
                urls,
                batchSize
            }
        }, '*');
    });
}

/**
 * Fetches all bookmarks directly from the browser via the companion extension.
 * @param {number} timeoutMs
 * @returns {Promise<Array<Object>>}
 */
export function getBrowserBookmarks(timeoutMs = 12000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    return new Promise((resolve, reject) => {
        const requestId = 'get_bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out waiting for browser bookmarks from extension'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_BROWSER_BOOKMARKS_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success) {
                    resolve(event.data.bookmarks || []);
                } else {
                    reject(new Error(event.data.error || 'Failed to fetch browser bookmarks'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_GET_BROWSER_BOOKMARKS',
            requestId
        }, '*');
    });
}

function isDomEvent(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return (
        'nativeEvent' in obj ||
        typeof obj.preventDefault === 'function' ||
        typeof obj.stopPropagation === 'function' ||
        (typeof Event !== 'undefined' && obj instanceof Event)
    );
}

function sanitizeSerializableOptions(options) {
    if (!options || typeof options !== 'object' || isDomEvent(options)) {
        return {};
    }
    const safe = {};
    for (const [key, value] of Object.entries(options)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            safe[key] = value;
        }
    }
    return safe;
}

function sanitizeBookmarksList(bookmarks) {
    if (!Array.isArray(bookmarks) || isDomEvent(bookmarks)) {
        return [];
    }
    return bookmarks
        .filter(b => b && typeof b === 'object' && !isDomEvent(b))
        .map(b => ({
            id: b.id != null ? String(b.id) : undefined,
            browserId: b.browserId != null ? String(b.browserId) : undefined,
            title: b.title != null ? String(b.title) : '',
            url: b.url != null ? String(b.url) : '',
            originalFolder: b.originalFolder != null ? String(b.originalFolder) : '',
            newFolder: b.newFolder != null ? String(b.newFolder) : '',
            tags: Array.isArray(b.tags) ? b.tags.map(String) : [],
            note: b.note != null ? String(b.note) : '',
            dateAdded: typeof b.dateAdded === 'number' ? b.dateAdded : undefined
        }));
}

/**
 * Pushes BookSmart bookmarks into the browser under a designated folder.
 * @param {Array<Object>} bookmarks
 * @param {Object} [options]
 * @param {string} [options.targetFolderName]
 * @param {boolean} [options.clean]
 * @param {number} [timeoutMs]
 * @returns {Promise<{ count: number, folder: string }>}
 */
export function pushBookmarksToBrowser(bookmarks, options = {}, timeoutMs = 25000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    const safeBookmarks = sanitizeBookmarksList(bookmarks);
    const safeOptions = sanitizeSerializableOptions(options);

    return new Promise((resolve, reject) => {
        const requestId = 'push_bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out waiting for extension to push bookmarks'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_BROWSER_PUSH_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success) {
                    resolve({
                        count: event.data.count || 0,
                        folder: event.data.folder || safeOptions.targetFolderName || 'BookSmart'
                    });
                } else {
                    reject(new Error(event.data.error || 'Failed to push bookmarks to browser'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_PUSH_BROWSER_BOOKMARKS',
            requestId,
            payload: {
                bookmarks: safeBookmarks,
                options: safeOptions
            }
        }, '*');
    });
}

/**
 * Performs a two-way synchronization between BookSmart and Browser bookmarks.
 * @param {Array<Object>} bookmarks - Current bookmarks in BookSmart
 * @param {Object} [options]
 * @param {number} [timeoutMs]
 * @returns {Promise<{ importedBookmarks: Array, exportedCount: number, totalInBrowser: number, totalInApp: number }>}
 */
export function syncBrowserBookmarks(bookmarks, options = {}, timeoutMs = 25000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    const safeBookmarks = sanitizeBookmarksList(bookmarks);
    const safeOptions = sanitizeSerializableOptions(options);

    return new Promise((resolve, reject) => {
        const requestId = 'sync_bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out waiting for extension two-way sync'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_BROWSER_SYNC_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success) {
                    resolve({
                        importedBookmarks: event.data.importedBookmarks || [],
                        exportedCount: event.data.exportedCount || 0,
                        updatedCount: event.data.updatedCount || 0,
                        totalInBrowser: event.data.totalInBrowser || 0,
                        totalInApp: event.data.totalInApp || 0
                    });
                } else {
                    reject(new Error(event.data.error || 'Two-way browser sync failed'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_SYNC_BROWSER_BOOKMARKS',
            requestId,
            payload: {
                bookmarks: safeBookmarks,
                options: safeOptions
            }
        }, '*');
    });
}

/**
 * Captures active browser tab and creates bookmark.
 * @param {Object} [options]
 * @param {number} [timeoutMs]
 * @returns {Promise<Object>}
 */
export function captureActiveTab(options = {}, timeoutMs = 6000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    const safeOptions = sanitizeSerializableOptions(options);

    return new Promise((resolve, reject) => {
        const requestId = 'cap_tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out capturing active tab'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_CAPTURE_TAB_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success) {
                    resolve(event.data.bookmark);
                } else {
                    reject(new Error(event.data.error || 'Failed to capture tab'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_CAPTURE_TAB',
            requestId,
            payload: { options: safeOptions }
        }, '*');
    });
}

/**
 * Fetches OpenGraph / Favicon metadata using the companion extension.
 * Completely serverless and bypasses CORS.
 *
 * @param {string} url
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<{ url: string, title?: string, description?: string, image?: string, siteName?: string, favicon?: string }>}
 */
export function fetchOgMetadataWithExtension(url, timeoutMs = 8000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    if (!url || !/^https?:\/\//i.test(url.trim())) {
        return Promise.reject(new Error('Invalid URL'));
    }

    return new Promise((resolve, reject) => {
        const requestId = 'og_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out fetching OpenGraph metadata from extension'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_FETCH_OG_METADATA_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success && event.data.metadata) {
                    resolve(event.data.metadata);
                } else {
                    reject(new Error(event.data.error || 'Failed to fetch OpenGraph metadata'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_FETCH_OG_METADATA',
            requestId,
            payload: { url: url.trim(), timeoutMs }
        }, '*');
    });
}

/**
 * Fetches RSS/Atom XML text content using the companion extension.
 * Serverless and bypasses CORS restrictions.
 *
 * @param {string} url
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<string>}
 */
export function fetchFeedXmlWithExtension(url, timeoutMs = 10000) {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Window environment not available'));
    }

    if (!url || !/^https?:\/\//i.test(url.trim())) {
        return Promise.reject(new Error('Invalid URL'));
    }

    return new Promise((resolve, reject) => {
        const requestId = 'feed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
        };

        const timer = setTimeout(() => {
            if (!resolved) {
                cleanup();
                reject(new Error('Timed out fetching RSS/Atom feed from extension'));
            }
        }, timeoutMs);

        const handleMessage = (event) => {
            if (!event.data || event.data.source !== 'BOOKSMART_EXTENSION') return;
            if (event.source && event.source !== window) return;
            if (event.data.requestId !== requestId) return;

            if (event.data.type === 'BOOKSMART_FETCH_FEED_XML_RESULT') {
                resolved = true;
                clearTimeout(timer);
                cleanup();
                if (event.data.success && event.data.xml) {
                    resolve(event.data.xml);
                } else {
                    reject(new Error(event.data.error || 'Failed to fetch RSS/Atom feed'));
                }
            }
        };

        window.addEventListener('message', handleMessage);

        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_FETCH_FEED_XML',
            requestId,
            payload: { url: url.trim(), timeoutMs }
        }, '*');
    });
}


