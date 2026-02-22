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

        it('should remove domain-specific blacklist parameters for Amazon', () => {
            const url = 'https://www.amazon.com/product/123?ref=pd_gw_unk&keywords=laptop&someother=param';
            const result = cleanUrl(url);
            expect(result.cleaned).toBe('https://www.amazon.com/product/123?someother=param');
            expect(result.changed).toBe(true);
        });

        it('should remove YouTube specific tracking parameters', () => {
            const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking_id&feature=youtu.be';
            const result = cleanUrl(url);
            // v parameter is not blacklisted, should remain
            expect(result.cleaned).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
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
    });
});
