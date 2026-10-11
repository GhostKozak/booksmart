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
                    activeCheckPort = null;
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
        }
    });
})();
