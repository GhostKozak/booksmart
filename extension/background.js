// BookSmart Companion - Background Service Worker
// Enables serverless, 100% CORS-free bookmark health checks

const DEFAULT_TIMEOUT_MS = 8000;
const BATCH_SIZE = 6;

/**
 * Checks a single URL without CORS restrictions.
 * Tries HEAD first for performance; falls back to GET (with Range) if HEAD is rejected.
 */
async function checkUrlDirect(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        return { url, status: 'dead', error: 'invalid_url' };
    }

    const cleanUrl = url.trim();
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

// 1. One-off Message Listener (Ping, Single Check)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
        sendResponse({ success: true, version: '1.0.0', type: 'PONG' });
        return true;
    }

    if (request.action === 'CHECK_SINGLE_URL') {
        checkUrlDirect(request.url, request.timeoutMs)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ url: request.url, status: 'dead', error: err.message }));
        return true; // Keep message channel open for async response
    }
});

// 2. Long-lived Port Listener for Streaming Batch Link Checks
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'booksmart-link-check') {
        let isCancelled = false;

        port.onDisconnect.addListener(() => {
            isCancelled = true;
        });

        port.onMessage.addListener(async (msg) => {
            if (msg.action === 'START_CHECK') {
                const urls = Array.isArray(msg.urls) ? msg.urls : [];
                const batchSize = msg.batchSize || BATCH_SIZE;

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
