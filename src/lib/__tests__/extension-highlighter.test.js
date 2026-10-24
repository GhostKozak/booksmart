import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Web Highlighter content script helpers', () => {
    let highlighterModule;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Setup global browser mock objects
        globalThis.chrome = {
            storage: {
                local: {
                    get: vi.fn().mockResolvedValue({}),
                    set: vi.fn().mockResolvedValue(),
                    remove: vi.fn().mockResolvedValue()
                }
            },
            runtime: {
                sendMessage: vi.fn(),
                onMessage: { addListener: vi.fn() },
                lastError: null
            }
        };

        // Import the exported helpers from extension/content.js
        highlighterModule = await import('../../../extension/content.js');
    });

    describe('URL & Storage Key helpers', () => {
        it('cleanPageUrl removes hashes and trailing slashes', () => {
            const { cleanPageUrl } = highlighterModule;
            expect(cleanPageUrl('https://example.com/page/#section-2')).toBe('https://example.com/page');
            expect(cleanPageUrl('https://example.com/path/')).toBe('https://example.com/path');
            expect(cleanPageUrl('https://example.com/test?param=1#heading')).toBe('https://example.com/test?param=1');
        });

        it('getStorageKey generates prefixed storage key', () => {
            const { getStorageKey } = highlighterModule;
            expect(getStorageKey('https://example.com/article#target')).toBe('highlights:https://example.com/article');
        });
    });

    describe('DOM & Highlight Elements', () => {
        it('createHighlightElement creates mark with appropriate classes and datasets', () => {
            const { createHighlightElement } = highlighterModule;
            const mark = createHighlightElement('hl_123', 'yellow', true);

            expect(mark.tagName.toLowerCase()).toBe('mark');
            expect(mark.classList.contains('bs-highlight')).toBe(true);
            expect(mark.classList.contains('bs-hl-yellow')).toBe(true);
            expect(mark.dataset.bsId).toBe('hl_123');
            expect(mark.dataset.color).toBe('yellow');
            expect(mark.dataset.hasNote).toBe('true');
        });
    });

    describe('Storage operations', () => {
        it('getStoredHighlights reads from chrome.storage.local', async () => {
            const { getStoredHighlights } = highlighterModule;
            chrome.storage.local.get.mockResolvedValue({
                'highlights:https://site.com': [
                    { id: '1', text: 'Important note', color: 'green' }
                ]
            });

            const results = await getStoredHighlights('https://site.com#ref');
            expect(results.length).toBe(1);
            expect(results[0].text).toBe('Important note');
            expect(chrome.storage.local.get).toHaveBeenCalledWith(['highlights:https://site.com']);
        });

        it('saveStoredHighlights writes to chrome.storage.local', async () => {
            const { saveStoredHighlights } = highlighterModule;
            const list = [{ id: '2', text: 'Another highlight', color: 'blue' }];

            await saveStoredHighlights('https://site.com/doc#hash', list);
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                'highlights:https://site.com/doc': list
            });
        });
    });

    describe('DOM removal and clearing', () => {
        it('removeHighlight unwraps mark element and updates storage', async () => {
            const { removeHighlight } = highlighterModule;

            // Setup DOM
            const container = document.createElement('div');
            container.innerHTML = 'Hello <mark class="bs-highlight" data-bs-id="hl_del">highlighted text</mark> world';
            document.body.appendChild(container);

            const markEl = container.querySelector('mark');

            const currentKey = 'highlights:' + highlighterModule.cleanPageUrl(window.location.href);
            chrome.storage.local.get.mockResolvedValue({
                [currentKey]: [
                    { id: 'hl_del', text: 'highlighted text' },
                    { id: 'hl_keep', text: 'other' }
                ]
            });

            await removeHighlight('hl_del', markEl);

            expect(container.querySelector('mark')).toBeNull();
            expect(container.textContent).toContain('Hello highlighted text world');
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                [currentKey]: [{ id: 'hl_keep', text: 'other' }]
            });

            container.remove();
        });

        it('clearAllPageHighlights removes all marks and storage key', async () => {
            const { clearAllPageHighlights } = highlighterModule;

            const container = document.createElement('div');
            container.innerHTML = '<mark class="bs-highlight">one</mark> and <mark class="bs-highlight">two</mark>';
            document.body.appendChild(container);

            await clearAllPageHighlights();

            expect(container.querySelectorAll('.bs-highlight').length).toBe(0);
            expect(container.textContent).toBe('one and two');
            expect(chrome.storage.local.remove).toHaveBeenCalled();

            container.remove();
        });
    });

    describe('Document scope & Lazy style injection', () => {
        it('isHtmlDocument validates HTML context and rejects non-HTML content types', () => {
            const { isHtmlDocument } = highlighterModule;
            expect(isHtmlDocument()).toBe(true);

            // Mock non-HTML contentType
            const originalType = document.contentType;
            Object.defineProperty(document, 'contentType', { value: 'application/json', configurable: true });
            expect(isHtmlDocument()).toBe(false);

            Object.defineProperty(document, 'contentType', { value: originalType || 'text/html', configurable: true });
        });

        it('restorePageHighlights does not inject styles when no highlights exist', async () => {
            const { restorePageHighlights } = highlighterModule;
            const existingStyle = document.getElementById('booksmart-highlighter-styles');
            if (existingStyle) existingStyle.remove();

            chrome.storage.local.get.mockResolvedValue({});
            await restorePageHighlights();

            expect(document.getElementById('booksmart-highlighter-styles')).toBeNull();
        });

        it('restorePageHighlights injects styles and restores marks when highlights exist', async () => {
            const { restorePageHighlights, cleanPageUrl } = highlighterModule;
            const existingStyle = document.getElementById('booksmart-highlighter-styles');
            if (existingStyle) existingStyle.remove();

            const p = document.createElement('p');
            p.textContent = 'This is an important note on the page';
            document.body.appendChild(p);

            const storageKey = 'highlights:' + cleanPageUrl(window.location.href);
            chrome.storage.local.get.mockResolvedValue({
                [storageKey]: [
                    { id: 'hl_test', text: 'important note', color: 'green', note: 'Remember this' }
                ]
            });

            await restorePageHighlights();

            // Style must now be lazily injected
            expect(document.getElementById('booksmart-highlighter-styles')).not.toBeNull();
            // Mark element must be rendered
            const mark = document.querySelector('[data-bs-id="hl_test"]');
            expect(mark).not.toBeNull();
            expect(mark?.textContent).toBe('important note');
            expect(mark?.classList.contains('bs-hl-green')).toBe(true);

            p.remove();
            const s = document.getElementById('booksmart-highlighter-styles');
            if (s) s.remove();
        });
    });
});
