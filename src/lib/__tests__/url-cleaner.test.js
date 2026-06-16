import { describe, it, expect } from 'vitest';
import { cleanUrl, countCleanableUrls } from '../url-cleaner';

describe('url-cleaner', () => {
    describe('cleanUrl', () => {
        it('should return the same URL if it has no tracking parameters', () => {
            const url = 'https://example.com/page';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe(url);
            expect(result.changed).toBe(false);
        });

        it('should remove UTM tracking parameters', () => {
            const url = 'https://example.com/page?utm_source=google&utm_medium=email&utm_campaign=summer&q=search';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page?q=search');
            expect(result.changed).toBe(true);
        });

        it('should remove Facebook tracking parameters', () => {
            const url = 'https://example.com/page?fbclid=123456&someparam=value';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page?someparam=value');
            expect(result.changed).toBe(true);
        });

        it('should remove prefix-based tracking parameters', () => {
            const url = 'https://example.com/page?aff_id=789&something=other';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page?something=other');
            expect(result.changed).toBe(true);
        });

        it('should aggressively clean AliExpress URLs via whitelist', () => {
            const url = 'https://www.aliexpress.com/item/123.html?spm=a1z10&algo_pvid=456&isdl=y';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.aliexpress.com/item/123.html');
            expect(result.changed).toBe(true);
        });

        it('should clean Temu URLs via whitelist (all params removed)', () => {
            const url = 'https://www.temu.com/item/123.html?referrer=someuser&_p_r=456';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.temu.com/item/123.html');
            expect(result.changed).toBe(true);
        });

        it('should remove domain-specific blacklist parameters for Amazon', () => {
            const url = 'https://www.amazon.com/product/123?ref=pd_gw_unk&keywords=laptop&someother=param';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.amazon.com/product/123?someother=param');
            expect(result.changed).toBe(true);
        });

        it('should remove Amazon domain-specific blacklist on amazon.co.uk', () => {
            const url = 'https://www.amazon.co.uk/product/123?ref=nav_shop&crid=abc123';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.amazon.co.uk/product/123');
            expect(result.changed).toBe(true);
        });

        it('should remove YouTube specific tracking parameters', () => {
            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking_id&feature=youtu.be';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.changed).toBe(true);
        });

        it('should handle youtu.be short URLs', () => {
            const url = 'https://youtu.be/dQw4w9WgXcQ?si=tracking&feature=share';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://youtu.be/dQw4w9WgXcQ');
            expect(result.changed).toBe(true);
        });

        it('should handle invalid URLs gracefully', () => {
            const url = 'not-a-url';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe(url);
            expect(result.changed).toBe(false);
        });

        it('should skip non-http(s) protocols', () => {
            const url = 'javascript:void(0)';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe(url);
            expect(result.changed).toBe(false);
        });

        it('should remove trailing question mark if all params are removed', () => {
            const url = 'https://example.com/page?utm_source=test';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page');
            expect(result.cleaned).not.toContain('?');
            expect(result.changed).toBe(true);
        });

        it('should remove tracking params before hash fragments', () => {
            const url = 'https://example.com/page?utm_source=test#section';
            const result = cleanUrl(url);
            expect(result.changed).toBe(true);
            expect(result.cleaned).toBe('https://example.com/page#section');
            expect(result.cleaned).not.toContain('utm_source');
        });

        it('should handle empty URL', () => {
            expect(cleanUrl('').cleaned).toBe('');
            expect(cleanUrl('').changed).toBe(false);
        });

        it('should handle null URL', () => {
            expect(cleanUrl(null).cleaned).toBe(null);
            expect(cleanUrl(null).changed).toBe(false);
        });

        it('should clean eBay tracking parameters', () => {
            const url = 'https://www.ebay.com/itm/123?campid=abc123&mkrid=xyz&customid=user1&item=keep';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.ebay.com/itm/123?item=keep');
            expect(result.changed).toBe(true);
        });

        it('should remove gclid (Google Click ID)', () => {
            const url = 'https://example.com/page?gclid=CjwKCA&other=keep';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page?other=keep');
            expect(result.changed).toBe(true);
        });

        it('should handle URL with no query string at all', () => {
            const url = 'https://example.com/page';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe(url);
            expect(result.changed).toBe(false);
        });

        it('should remove multiple different tracking params', () => {
            const url = 'https://example.com/page?gclid=123&fbclid=456&utm_source=google&msclkid=789&keep=param';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://example.com/page?keep=param');
            expect(result.changed).toBe(true);
        });

        it('should handle Amazon.de domain-specific blacklist', () => {
            const url = 'https://www.amazon.de/product/123?ref=pd_gw_unk&dib=abc123&keep=param';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.amazon.de/product/123?keep=param');
            expect(result.changed).toBe(true);
        });
    });

    describe('countCleanableUrls', () => {
        it('should correctly count URLs with tracking parameters', () => {
            const bookmarks = [
                { url: 'https://example.com/1?utm_source=t1' },
                { url: 'https://example.com/2' },
                { url: 'https://example.com/3?fbclid=t2' },
                { url: 'https://example.com/4?q=clean' }
            ];
            const count = countCleanableUrls(bookmarks);
            expect(count).toBe(2);
        });

        it('should return 0 for empty array', () => {
            expect(countCleanableUrls([])).toBe(0);
        });

        it('should handle bookmarks with missing or null URLs', () => {
            const bookmarks = [
                { url: null },
                { url: undefined },
                {}
            ];
            expect(countCleanableUrls(bookmarks)).toBe(0);
        });
    });
});
