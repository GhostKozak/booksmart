import { describe, it, expect } from 'vitest';
import { generateCollectionHubHtml } from '../collection-hub-generator';

describe('collection-hub-generator.js', () => {
    const mockCollection = {
        id: 'coll-1',
        name: 'Web Dev Tools',
        icon: '🚀',
        color: '#6366f1'
    };

    const mockBookmarks = [
        {
            id: 1,
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org/en-US/',
            note: 'Essential web reference for HTML, CSS & JavaScript.',
            tags: ['documentation', 'reference']
        },
        {
            id: 2,
            title: 'GitHub & More <script>alert(1)</script>',
            url: 'https://github.com',
            note: 'Open-source code hosting & collaboration platform',
            tags: ['dev']
        }
    ];

    it('generates a complete, valid standalone HTML document', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks);

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<title>🚀 Web Dev Tools</title>');
        expect(html).toContain('class="header"');
        expect(html).toContain('MDN Web Docs');
        expect(html).toContain('https://developer.mozilla.org/en-US/');
        expect(html).toContain('Curated with');
        expect(html).toContain('BookSmart');
    });

    it('prevents XSS by properly escaping titles, notes, and user inputs', () => {
        const maliciousCollection = {
            id: 'xss',
            name: '<img src=x onerror=alert(1)>Malicious Collection',
            icon: '⚠️',
            color: '#ff0000'
        };

        const html = generateCollectionHubHtml(maliciousCollection, mockBookmarks, {
            bio: '<script>alert("bio")</script>',
            author: '<b>Attacker</b>'
        });

        expect(html).not.toContain('<img src=x onerror=alert(1)>');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).not.toContain('<script>alert("bio")</script>');
        expect(html).toContain('&lt;script&gt;alert(&quot;bio&quot;)&lt;/script&gt;');
        expect(html).not.toContain('<b>Attacker</b>');
        expect(html).toContain('&lt;b&gt;Attacker&lt;/b&gt;');
        expect(html).not.toContain('<script>alert(1)</script>');

        const jsXssBookmark = [{ id: 99, title: 'Click me', url: 'javascript:alert(1)' }];
        const xssHtml = generateCollectionHubHtml(mockCollection, jsXssBookmark);
        expect(xssHtml).not.toContain('href="javascript:');
        expect(xssHtml).toContain('href="#"');
    });

    it('supports bento layout styling by default', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, { layout: 'bento' });
        expect(html).toContain('layout-bento');
        expect(html).toContain('Bento Style');
    });

    it('supports linktree layout styling', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, { layout: 'linktree' });
        expect(html).toContain('layout-linktree');
        expect(html).toContain('Linktree / Minimal Style');
    });

    it('supports cards editorial layout styling', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, { layout: 'cards' });
        expect(html).toContain('layout-cards');
        expect(html).toContain('Cards Style');
    });

    it('respects accentColor and embeds custom theme variables', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, {
            accentColor: '#10b981'
        });
        expect(html).toContain('--accent: #10b981;');
        expect(html).toContain('--accent-glow: #10b98133;');
    });

    it('handles empty bookmarks gracefully', () => {
        const html = generateCollectionHubHtml(mockCollection, []);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('0');
        expect(html).toContain('Web Dev Tools');
    });

    it('includes client-side search bar and interactive script', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, { includeSearch: true });
        expect(html).toContain('id="hub-search"');
        expect(html).toContain('searchInput.addEventListener');
        expect(html).toContain('theme-toggle');
    });

    it('can omit search bar when includeSearch is false', () => {
        const html = generateCollectionHubHtml(mockCollection, mockBookmarks, { includeSearch: false });
        expect(html).not.toContain('id="hub-search"');
    });
});
