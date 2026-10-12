// BookSmart Companion - Content Script Bridge
// Relays messages between BookSmart web app and extension background script

(function () {
    const EXTENSION_VERSION = '1.1.0';

    const TRUSTED_ORIGIN_PATTERNS = [
        /^https?:\/\/localhost(:\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        /^https?:\/\/\[::1\](:\d+)?$/,
        /^https:\/\/.*booksmart\.app$/,
        /^https:\/\/ghostkozak\.github\.io$/
    ];

    function isOriginAllowed() {
        try {
            const origin = window.location.origin;
            return TRUSTED_ORIGIN_PATTERNS.some(p => p.test(origin));
        } catch {
            return false;
        }
    }

    // Broadcast readiness to the page
    function announceReady() {
        window.postMessage({
            source: 'BOOKSMART_EXTENSION',
            type: 'BOOKSMART_EXTENSION_READY',
            version: EXTENSION_VERSION
        }, '*');
    }

    // Announce immediately, on load, and with staggered retries for async client hydration
    announceReady();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', announceReady);
    }
    window.addEventListener('load', announceReady);
    setTimeout(announceReady, 200);
    setTimeout(announceReady, 800);
    setTimeout(announceReady, 2000);

    // Persist last valid BookSmart URL so popup can open directly to user's deployment
    if (isOriginAllowed()) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ lastBooksmartUrl: window.location.href });
            }
        } catch {
            // Ignored
        }
    }

    let activeCheckPort = null;

    // Listen for messages from background/popup
    try {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.action === 'TRIGGER_TWO_WAY_SYNC') {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_TRIGGER_SYNC'
                }, '*');
                sendResponse({ success: true });
                return true;
            }
            if (msg.action === 'BOOKSMART_TAB_CAPTURED') {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_TAB_CAPTURED',
                    bookmark: msg.bookmark
                }, '*');
                sendResponse({ success: true });
                return true;
            }
            if (msg.action === 'BOOKSMART_SESSION_SAVED') {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_SESSION_SAVED',
                    sessionName: msg.sessionName,
                    bookmarks: msg.bookmarks
                }, '*');
                sendResponse({ success: true });
                return true;
            }
        });
    } catch {
        // Ignored if runtime not available
    }

    // Listen to messages from BookSmart web application
    window.addEventListener('message', (event) => {
        // Only accept messages from the same window and intended for BookSmart Extension
        if (event.source !== window || !event.data || event.data.source !== 'BOOKSMART_PAGE') {
            return;
        }

        const { type, payload, requestId } = event.data;

        // 1. Health check ping
        if (type === 'BOOKSMART_PING') {
            window.postMessage({
                source: 'BOOKSMART_EXTENSION',
                type: 'BOOKSMART_PONG',
                requestId,
                version: EXTENSION_VERSION
            }, '*');

            // Asynchronously warm up the background service worker
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ action: 'PING' }, () => {
                        void chrome.runtime?.lastError;
                    });
                }
            } catch {
                // Extension context invalidated or inactive
            }
            return;
        }

        // 2. Start checking batch of links
        if (type === 'BOOKSMART_CHECK_LINKS') {
            const urls = payload?.urls || [];
            if (activeCheckPort) {
                try {
                    activeCheckPort.disconnect();
                } catch {
                    // Ignore
                }
                activeCheckPort = null;
            }

            try {
                activeCheckPort = chrome.runtime.connect({ name: 'booksmart-link-check' });

                activeCheckPort.onMessage.addListener((msg) => {
                    if (msg.type === 'BATCH_UPDATE') {
                        window.postMessage({
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINK_STATUS_UPDATE',
                            requestId,
                            results: msg.results,
                            processed: msg.processed,
                            total: msg.total
                        }, '*');
                    } else if (msg.type === 'COMPLETE') {
                        window.postMessage({
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINKS_CHECKED_COMPLETE',
                            requestId
                        }, '*');
                        if (activeCheckPort) {
                            activeCheckPort.disconnect();
                            activeCheckPort = null;
                        }
                    }
                });

                activeCheckPort.onDisconnect.addListener(() => {
                    if (activeCheckPort) {
                        window.postMessage({
                            source: 'BOOKSMART_EXTENSION',
                            type: 'BOOKSMART_LINKS_CHECKED_ERROR',
                            requestId,
                            error: chrome.runtime.lastError?.message || 'Companion extension background disconnected'
                        }, '*');
                        activeCheckPort = null;
                    }
                });

                activeCheckPort.postMessage({
                    action: 'START_CHECK',
                    urls,
                    batchSize: payload?.batchSize || 6
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_LINKS_CHECKED_ERROR',
                    requestId,
                    error: err.message
                }, '*');
            }
            return;
        }

        // 3. Cancel link checking
        if (type === 'BOOKSMART_CANCEL_CHECK') {
            if (activeCheckPort) {
                try {
                    activeCheckPort.postMessage({ action: 'CANCEL_CHECK' });
                    activeCheckPort.disconnect();
                } catch {
                    // Ignore
                }
                activeCheckPort = null;
            }
            return;
        }

        // Guard sensitive bookmark APIs against untrusted origins
        const RESULT_TYPE_BY_ACTION = {
            BOOKSMART_GET_BROWSER_BOOKMARKS: 'BOOKSMART_BROWSER_BOOKMARKS_RESULT',
            BOOKSMART_PUSH_BROWSER_BOOKMARKS: 'BOOKSMART_BROWSER_PUSH_RESULT',
            BOOKSMART_SYNC_BROWSER_BOOKMARKS: 'BOOKSMART_BROWSER_SYNC_RESULT',
            BOOKSMART_CAPTURE_TAB: 'BOOKSMART_CAPTURE_TAB_RESULT'
        };

        if (RESULT_TYPE_BY_ACTION[type] && !isOriginAllowed()) {
            window.postMessage({
                source: 'BOOKSMART_EXTENSION',
                type: RESULT_TYPE_BY_ACTION[type],
                requestId,
                success: false,
                error: 'Access denied: Untrusted origin. Bookmarks access is restricted to BookSmart origins.'
            }, '*');
            return;
        }

        // 4. Get browser bookmarks
        if (type === 'BOOKSMART_GET_BROWSER_BOOKMARKS') {
            try {
                chrome.runtime.sendMessage({ action: 'GET_BROWSER_BOOKMARKS' }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_BROWSER_BOOKMARKS_RESULT',
                        requestId,
                        success: !err && response?.success,
                        bookmarks: response?.bookmarks || [],
                        error: err?.message || response?.error
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_BROWSER_BOOKMARKS_RESULT',
                    requestId,
                    success: false,
                    error: err.message
                }, '*');
            }
            return;
        }

        function sanitizeOptions(opts) {
            if (!opts || typeof opts !== 'object') return {};
            if ('nativeEvent' in opts || typeof opts.preventDefault === 'function') return {};
            const safe = {};
            for (const [k, v] of Object.entries(opts)) {
                if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                    safe[k] = v;
                }
            }
            return safe;
        }

        // 5. Push bookmarks to browser
        if (type === 'BOOKSMART_PUSH_BROWSER_BOOKMARKS') {
            try {
                chrome.runtime.sendMessage({
                    action: 'PUSH_BROWSER_BOOKMARKS',
                    bookmarks: Array.isArray(payload?.bookmarks) ? payload.bookmarks : [],
                    options: sanitizeOptions(payload?.options)
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_BROWSER_PUSH_RESULT',
                        requestId,
                        success: !err && response?.success,
                        count: response?.count || 0,
                        folder: response?.folder,
                        error: err?.message || response?.error
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_BROWSER_PUSH_RESULT',
                    requestId,
                    success: false,
                    error: err.message
                }, '*');
            }
            return;
        }

        // 6. Two-way sync with browser bookmarks
        if (type === 'BOOKSMART_SYNC_BROWSER_BOOKMARKS') {
            try {
                chrome.runtime.sendMessage({
                    action: 'SYNC_BROWSER_BOOKMARKS',
                    bookmarks: Array.isArray(payload?.bookmarks) ? payload.bookmarks : [],
                    options: sanitizeOptions(payload?.options)
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_BROWSER_SYNC_RESULT',
                        requestId,
                        success: !err && response?.success,
                        importedBookmarks: response?.importedBookmarks || [],
                        exportedCount: response?.exportedCount || 0,
                        totalInBrowser: response?.totalInBrowser || 0,
                        totalInApp: response?.totalInApp || 0,
                        error: err?.message || response?.error
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_BROWSER_SYNC_RESULT',
                    requestId,
                    success: false,
                    error: err.message
                }, '*');
            }
            return;
        }

        // 7. Capture active tab
        if (type === 'BOOKSMART_CAPTURE_TAB') {
            try {
                chrome.runtime.sendMessage({
                    action: 'CAPTURE_CURRENT_TAB',
                    options: sanitizeOptions(payload?.options)
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_CAPTURE_TAB_RESULT',
                        requestId,
                        success: !err && response?.success,
                        bookmark: response?.bookmark,
                        error: err?.message || response?.error
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_CAPTURE_TAB_RESULT',
                    requestId,
                    success: false,
                    error: err.message
                }, '*');
            }
            return;
        }

        // 8. Fetch OpenGraph / Favicon metadata
        if (type === 'BOOKSMART_FETCH_OG_METADATA') {
            try {
                chrome.runtime.sendMessage({
                    action: 'FETCH_OG_METADATA',
                    url: payload?.url,
                    timeoutMs: payload?.timeoutMs
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_FETCH_OG_METADATA_RESULT',
                        requestId,
                        success: !err && response?.success,
                        metadata: response?.metadata,
                        error: err?.message || response?.error,
                        url: payload?.url
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_FETCH_OG_METADATA_RESULT',
                    requestId,
                    success: false,
                    error: err.message,
                    url: payload?.url
                }, '*');
            }
            return;
        }

        // 8b. Fetch RSS/Atom Feed XML directly bypassing CORS
        if (type === 'BOOKSMART_FETCH_FEED_XML') {
            try {
                chrome.runtime.sendMessage({
                    action: 'FETCH_FEED_XML',
                    url: payload?.url,
                    timeoutMs: payload?.timeoutMs
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_FETCH_FEED_XML_RESULT',
                        requestId,
                        success: !err && response?.success,
                        xml: response?.xml,
                        statusCode: response?.statusCode,
                        error: err?.message || response?.error,
                        url: payload?.url
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_FETCH_FEED_XML_RESULT',
                    requestId,
                    success: false,
                    error: err.message,
                    url: payload?.url
                }, '*');
            }
            return;
        }

        // 9. Cache BookSmart bookmarks in extension local storage for fast duplicate checking
        if (type === 'BOOKSMART_CACHE_BOOKMARKS') {
            try {
                const bookmarks = Array.isArray(payload?.bookmarks) ? payload.bookmarks : [];
                const cache = {};
                for (const b of bookmarks) {
                    if (!b || !b.url) continue;
                    let norm = (b.url || '').trim().replace(/\/+$/, '');
                    try {
                        const parsed = new URL(b.url);
                        parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
                        parsed.protocol = parsed.protocol.toLowerCase();
                        if ((parsed.protocol === 'http:' && parsed.port === '80') ||
                            (parsed.protocol === 'https:' && parsed.port === '443')) {
                            parsed.port = '';
                        }
                        let normalized = parsed.href;
                        if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
                        norm = normalized;
                    } catch {
                        // ignore parsing error
                    }
                    cache[norm] = {
                        title: b.title,
                        folder: b.newFolder || b.originalFolder || 'BookSmart',
                        id: b.id
                    };
                }
                if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                    chrome.storage.local.set({ appBookmarksCache: cache });
                }
            } catch {
                // Ignored
            }
            return;
        }

        // 10. Save active tabs session
        if (type === 'BOOKSMART_SAVE_SESSION') {
            try {
                chrome.runtime.sendMessage({
                    action: 'SAVE_SESSION_TABS',
                    options: sanitizeOptions(payload?.options)
                }, (response) => {
                    const err = chrome.runtime.lastError;
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_SAVE_SESSION_RESULT',
                        requestId,
                        success: !err && response?.success,
                        count: response?.count,
                        sessionName: response?.sessionName,
                        error: err?.message || response?.error
                    }, '*');
                });
            } catch (err) {
                window.postMessage({
                    source: 'BOOKSMART_EXTENSION',
                    type: 'BOOKSMART_SAVE_SESSION_RESULT',
                    requestId,
                    success: false,
                    error: err.message
                }, '*');
            }
        }
    });
})();
