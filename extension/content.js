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

    function initBooksmartBridge() {

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
                        updatedCount: response?.updatedCount || 0,
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
                    const slimList = bookmarks.map(b => ({
                        url: b.url,
                        title: b.title || b.url,
                        originalFolder: b.originalFolder || '',
                        newFolder: b.newFolder || '',
                        tags: Array.isArray(b.tags) ? b.tags.join(', ') : (b.tags || ''),
                        note: b.note || b.notes || b.description || ''
                    }));
                    chrome.storage.local.set({
                        appBookmarksCache: cache,
                        booksmart_cached_bookmarks: slimList
                    });
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
    } // end initBooksmartBridge

    // ── Web Highlighter & Sticky Notes Engine (Runs on all URLs) ──
    const HIGHLIGHT_COLORS = {
        yellow: { hex: '#fef08a', bg: 'rgba(254, 240, 138, 0.7)', text: '#1e293b' },
        green: { hex: '#bbf7d0', bg: 'rgba(187, 247, 208, 0.7)', text: '#1e293b' },
        blue: { hex: '#bae6fd', bg: 'rgba(186, 230, 253, 0.7)', text: '#1e293b' },
        purple: { hex: '#e9d5ff', bg: 'rgba(233, 213, 255, 0.7)', text: '#1e293b' }
    };

    function cleanPageUrl(url) {
        try {
            const parsed = new URL(url || window.location.href);
            parsed.hash = '';
            let norm = parsed.href;
            if (norm.endsWith('/')) norm = norm.slice(0, -1);
            return norm;
        } catch {
            return (url || window.location.href).split('#')[0].replace(/\/+$/, '');
        }
    }

    function getStorageKey(url) {
        return 'highlights:' + cleanPageUrl(url);
    }

    function injectHighlighterStyles() {
        if (typeof document === 'undefined' || document.getElementById('booksmart-highlighter-styles')) return;

        const style = document.createElement('style');
        style.id = 'booksmart-highlighter-styles';
        style.textContent = `
            .bs-highlight {
                display: inline;
                border-radius: 3px;
                padding: 1px 2px;
                cursor: pointer;
                transition: filter 0.15s ease, background-color 0.15s ease;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
            }
            .bs-hl-yellow { background-color: #fef08a !important; color: #1e293b !important; }
            .bs-hl-green { background-color: #bbf7d0 !important; color: #1e293b !important; }
            .bs-hl-blue { background-color: #bae6fd !important; color: #1e293b !important; }
            .bs-hl-purple { background-color: #e9d5ff !important; color: #1e293b !important; }
            .bs-highlight:hover {
                filter: brightness(0.92);
                outline: 1px dashed rgba(0,0,0,0.3);
            }
            .bs-highlight[data-has-note="true"]::after {
                content: " 📝";
                font-size: 11px;
                vertical-align: super;
            }
            .bs-highlighter-popover {
                position: absolute;
                z-index: 2147483647;
                background: #ffffff;
                color: #0f172a;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1);
                padding: 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                width: 280px;
                line-height: 1.4;
            }
            .bs-hl-dark .bs-highlighter-popover {
                background: #1e293b;
                color: #f8fafc;
                border-color: #334155;
            }
        `;
        document.head.appendChild(style);
    }

    async function getStoredHighlights(url) {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
        const key = getStorageKey(url);
        try {
            const data = await chrome.storage.local.get([key]);
            return data[key] || [];
        } catch {
            return [];
        }
    }

    async function saveStoredHighlights(url, highlights) {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
        const key = getStorageKey(url);
        try {
            await chrome.storage.local.set({ [key]: highlights });
        } catch (err) {
            console.warn('Failed to save highlights:', err);
        }
    }

    function createHighlightElement(id, color, hasNote = false) {
        const mark = document.createElement('mark');
        mark.className = `bs-highlight bs-hl-${color}`;
        mark.dataset.bsId = id;
        mark.dataset.color = color;
        if (hasNote) mark.dataset.hasNote = 'true';
        return mark;
    }

    let activePopover = null;

    function closeActivePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
        }
    }

    function showHighlightPopover(markEl, highlightRecord) {
        closeActivePopover();
        if (!markEl || !highlightRecord) return;

        const popover = document.createElement('div');
        popover.className = 'bs-highlighter-popover';

        const rect = markEl.getBoundingClientRect();
        const top = window.scrollY + rect.bottom + 6;
        const left = Math.max(10, Math.min(window.scrollX + rect.left, window.innerWidth - 300));
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;

        popover.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-weight: 600; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">BookSmart Vurgusu</div>
                <button type="button" class="bs-popover-close" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #94a3b8; padding: 0 4px;">&times;</button>
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <button type="button" class="bs-color-btn" data-color="yellow" style="width: 22px; height: 22px; border-radius: 50%; background: #fef08a; border: 2px solid ${highlightRecord.color === 'yellow' ? '#ca8a04' : 'transparent'}; cursor: pointer;"></button>
                <button type="button" class="bs-color-btn" data-color="green" style="width: 22px; height: 22px; border-radius: 50%; background: #bbf7d0; border: 2px solid ${highlightRecord.color === 'green' ? '#16a34a' : 'transparent'}; cursor: pointer;"></button>
                <button type="button" class="bs-color-btn" data-color="blue" style="width: 22px; height: 22px; border-radius: 50%; background: #bae6fd; border: 2px solid ${highlightRecord.color === 'blue' ? '#0284c7' : 'transparent'}; cursor: pointer;"></button>
                <button type="button" class="bs-color-btn" data-color="purple" style="width: 22px; height: 22px; border-radius: 50%; background: #e9d5ff; border: 2px solid ${highlightRecord.color === 'purple' ? '#9333ea' : 'transparent'}; cursor: pointer;"></button>
            </div>
            <div style="margin-bottom: 8px;">
                <textarea class="bs-popover-note" placeholder="Yapışkan not ekle..." style="width: 100%; box-sizing: border-box; height: 60px; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid #cbd5e1; resize: none; font-family: inherit;">${highlightRecord.note || ''}</textarea>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <button type="button" class="bs-popover-delete" style="background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 4px 0; font-weight: 500;">🗑️ Vurguyu Sil</button>
                <button type="button" class="bs-popover-save" style="background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 500; cursor: pointer;">Kaydet</button>
            </div>
        `;

        document.body.appendChild(popover);
        activePopover = popover;

        // Close button
        popover.querySelector('.bs-popover-close').addEventListener('click', closeActivePopover);

        // Color buttons
        popover.querySelectorAll('.bs-color-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const newColor = btn.dataset.color;
                highlightRecord.color = newColor;
                markEl.className = `bs-highlight bs-hl-${newColor}`;
                markEl.dataset.color = newColor;

                // Update border on color buttons
                popover.querySelectorAll('.bs-color-btn').forEach(b => {
                    b.style.border = b.dataset.color === newColor ? '2px solid #000' : '2px solid transparent';
                });

                const list = await getStoredHighlights(highlightRecord.url);
                const updated = list.map(h => h.id === highlightRecord.id ? { ...h, color: newColor } : h);
                await saveStoredHighlights(highlightRecord.url, updated);
            });
        });

        // Save note
        popover.querySelector('.bs-popover-save').addEventListener('click', async () => {
            const noteText = popover.querySelector('.bs-popover-note').value.trim();
            highlightRecord.note = noteText;
            if (noteText) {
                markEl.dataset.hasNote = 'true';
            } else {
                delete markEl.dataset.hasNote;
            }

            const list = await getStoredHighlights(highlightRecord.url);
            const updated = list.map(h => h.id === highlightRecord.id ? { ...h, note: noteText } : h);
            await saveStoredHighlights(highlightRecord.url, updated);
            closeActivePopover();
        });

        // Delete highlight
        popover.querySelector('.bs-popover-delete').addEventListener('click', async () => {
            await removeHighlight(highlightRecord.id, markEl);
            closeActivePopover();
        });
    }

    async function removeHighlight(id, markEl) {
        if (markEl && markEl.parentNode) {
            const parent = markEl.parentNode;
            while (markEl.firstChild) {
                parent.insertBefore(markEl.firstChild, markEl);
            }
            parent.removeChild(markEl);
            parent.normalize();
        }

        const url = cleanPageUrl(window.location.href);
        const list = await getStoredHighlights(url);
        const filtered = list.filter(h => h.id !== id);
        await saveStoredHighlights(url, filtered);
    }

    async function clearAllPageHighlights() {
        closeActivePopover();
        const marks = document.querySelectorAll('.bs-highlight');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
                parent.normalize();
            }
        });

        const url = cleanPageUrl(window.location.href);
        const key = getStorageKey(url);
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            try {
                await chrome.storage.local.remove([key]);
            } catch {
                // Ignore
            }
        }
    }

    async function applySelectionHighlight(color = 'yellow', promptNote = false) {
        injectHighlighterStyles();

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        const id = 'hl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const url = cleanPageUrl(window.location.href);

        const highlightRecord = {
            id,
            url,
            text: selectedText,
            color,
            note: '',
            createdAt: Date.now()
        };

        try {
            const mark = createHighlightElement(id, color, false);
            const contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
            selection.removeAllRanges();

            mark.addEventListener('click', (e) => {
                e.stopPropagation();
                showHighlightPopover(mark, highlightRecord);
            });

            // Save to chrome.storage.local
            const existing = await getStoredHighlights(url);
            existing.push(highlightRecord);
            await saveStoredHighlights(url, existing);

            if (promptNote) {
                showHighlightPopover(mark, highlightRecord);
            }
        } catch (err) {
            console.warn('Failed to wrap selection highlight:', err);
        }
    }

    async function restorePageHighlights() {
        injectHighlighterStyles();
        const url = cleanPageUrl(window.location.href);
        const highlights = await getStoredHighlights(url);
        if (!highlights || highlights.length === 0) return;

        const treeWalker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    const parentTag = node.parentElement?.tagName?.toLowerCase();
                    if (['script', 'style', 'textarea', 'noscript', 'mark'].includes(parentTag)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let currNode;
        while ((currNode = treeWalker.nextNode())) {
            textNodes.push(currNode);
        }

        for (const hl of highlights) {
            // Already applied?
            if (document.querySelector(`[data-bs-id="${hl.id}"]`)) continue;

            for (const textNode of textNodes) {
                const nodeText = textNode.nodeValue;
                const idx = nodeText.indexOf(hl.text);
                if (idx !== -1) {
                    try {
                        const mark = createHighlightElement(hl.id, hl.color, Boolean(hl.note));
                        const targetRange = document.createRange();
                        targetRange.setStart(textNode, idx);
                        targetRange.setEnd(textNode, idx + hl.text.length);

                        const contents = targetRange.extractContents();
                        mark.appendChild(contents);
                        targetRange.insertNode(mark);

                        mark.addEventListener('click', (e) => {
                            e.stopPropagation();
                            showHighlightPopover(mark, hl);
                        });
                        break;
                    } catch {
                        // Node structure changed, skip
                    }
                }
            }
        }
    }

    function initWebHighlighter() {
        if (typeof document === 'undefined') return;

        injectHighlighterStyles();

        // Restore on initial load & DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', restorePageHighlights);
        } else {
            restorePageHighlights();
        }
        window.addEventListener('load', restorePageHighlights);

        // Close popover when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (activePopover && !activePopover.contains(e.target)) {
                closeActivePopover();
            }
        });

        // Listen for messages from background script
        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'APPLY_PAGE_HIGHLIGHT') {
                    applySelectionHighlight(request.color, request.promptNote);
                    sendResponse({ success: true });
                    return true;
                }
                if (request.action === 'CLEAR_PAGE_HIGHLIGHTS') {
                    clearAllPageHighlights();
                    sendResponse({ success: true });
                    return true;
                }
                if (request.action === 'GET_PAGE_HIGHLIGHTS') {
                    getStoredHighlights(window.location.href).then(list => {
                        sendResponse({ success: true, highlights: list });
                    });
                    return true;
                }
            });
        }
    }

    // ── Bootstrap ──
    if (isOriginAllowed()) {
        initBooksmartBridge();
    }
    initWebHighlighter();

    // Export helpers for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            cleanPageUrl,
            getStorageKey,
            HIGHLIGHT_COLORS,
            createHighlightElement,
            getStoredHighlights,
            saveStoredHighlights,
            applySelectionHighlight,
            removeHighlight,
            clearAllPageHighlights,
            restorePageHighlights
        };
    }
})();

