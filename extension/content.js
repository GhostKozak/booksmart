// BookSmart Companion - Content Script Bridge
// Relays messages between BookSmart web app and extension background script

(function () {
    const EXTENSION_VERSION = '1.0.0';

    // Broadcast readiness to the page
    function announceReady() {
        window.postMessage({
            source: 'BOOKSMART_EXTENSION',
            type: 'BOOKSMART_EXTENSION_READY',
            version: EXTENSION_VERSION
        }, '*');
    }

    // Announce immediately and shortly after page load
    announceReady();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', announceReady);
    }

    let activeCheckPort = null;

    // Listen to messages from BookSmart web application
    window.addEventListener('message', (event) => {
        // Only accept messages from the same window and intended for BookSmart Extension
        if (event.source !== window || !event.data || event.data.source !== 'BOOKSMART_PAGE') {
            return;
        }

        const { type, payload, requestId } = event.data;

        // 1. Health check ping
        if (type === 'BOOKSMART_PING') {
            try {
                chrome.runtime.sendMessage({ action: 'PING' }, (response) => {
                    if (chrome.runtime.lastError) {
                        return;
                    }
                    window.postMessage({
                        source: 'BOOKSMART_EXTENSION',
                        type: 'BOOKSMART_PONG',
                        requestId,
                        version: response?.version || EXTENSION_VERSION
                    }, '*');
                });
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

        // 5. Push bookmarks to browser
        if (type === 'BOOKSMART_PUSH_BROWSER_BOOKMARKS') {
            try {
                chrome.runtime.sendMessage({
                    action: 'PUSH_BROWSER_BOOKMARKS',
                    bookmarks: payload?.bookmarks || [],
                    options: payload?.options || {}
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
                    bookmarks: payload?.bookmarks || [],
                    options: payload?.options || {}
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
                    options: payload?.options || {}
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
        }
    });
})();
