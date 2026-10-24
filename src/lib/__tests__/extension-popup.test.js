import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Extension popup script', () => {
    let popupModule;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Setup DOM for popup
        document.body.innerHTML = `
            <div id="status-msg"></div>
            <div id="duplicate-warning" style="display: none;"></div>
            <div id="duplicate-warning-text"></div>
            <button id="save-tab-btn"><span>⭐️ Save Current Tab</span></button>
            <span id="tab-count-badge"></span>
            <input type="checkbox" id="close-tabs-checkbox" />
            <button id="save-session-btn"></button>
            <button id="sync-btn"></button>
            <button id="open-app-btn"></button>
        `;

        globalThis.chrome = {
            runtime: {
                sendMessage: vi.fn(),
                lastError: null
            },
            storage: {
                local: {
                    get: vi.fn().mockImplementation((keys, cb) => cb({ lastBooksmartUrl: 'https://my-booksmart.app' }))
                }
            },
            tabs: {
                query: vi.fn().mockImplementation((query, cb) => {
                    cb([
                        { id: 1, url: 'https://github.com/test' },
                        { id: 2, url: 'chrome://settings' },
                        { id: 3, url: 'https://google.com' }
                    ]);
                }),
                create: vi.fn(),
                update: vi.fn()
            }
        };

        popupModule = await import('../../../extension/popup.js');
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('showStatus displays status message with correct class and clears after duration', () => {
        const { showStatus } = popupModule;
        const statusEl = document.getElementById('status-msg');

        showStatus('Başarılı!', 'success', 2000);
        expect(statusEl.textContent).toBe('Başarılı!');
        expect(statusEl.className).toBe('status-msg status-success');
        expect(statusEl.style.display).toBe('block');

        vi.advanceTimersByTime(2000);
        expect(statusEl.style.display).toBe('none');
        expect(statusEl.textContent).toBe('');
    });

    it('triggerNotification sends SHOW_NOTIFICATION runtime message', () => {
        const { triggerNotification } = popupModule;
        triggerNotification('Test Title', 'Test Message', true);

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            action: 'SHOW_NOTIFICATION',
            title: 'Test Title',
            message: 'Test Message',
            isWarning: true
        });
    });

    it('getAppUrl returns cached BookSmart URL or localhost fallback', () => {
        const { getAppUrl } = popupModule;
        const cb = vi.fn();

        getAppUrl(cb);
        expect(cb).toHaveBeenCalledWith('https://my-booksmart.app');

        // Test fallback when storage is empty
        chrome.storage.local.get.mockImplementation((keys, callback) => callback({}));
        const fallbackCb = vi.fn();
        getAppUrl(fallbackCb);
        expect(fallbackCb).toHaveBeenCalledWith('http://localhost:5173');
    });

    it('updateTabCountBadge filters out browser internal tabs and sets valid count', () => {
        const { updateTabCountBadge } = popupModule;
        const badge = document.getElementById('tab-count-badge');

        updateTabCountBadge();
        // Among https://github.com, chrome://settings, and https://google.com -> 2 valid tabs
        expect(badge.textContent).toBe('2 sekme');
    });

    it('BOOKSMART_URL_PATTERNS contains expected application patterns', () => {
        const { BOOKSMART_URL_PATTERNS } = popupModule;
        expect(BOOKSMART_URL_PATTERNS).toBeDefined();
        expect(BOOKSMART_URL_PATTERNS.some(p => p.includes('booksmart.app'))).toBe(true);
        expect(BOOKSMART_URL_PATTERNS.some(p => p.includes('localhost'))).toBe(true);
    });
});
