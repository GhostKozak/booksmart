import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    calculateReadingTime,
    formatReadingTime,
    getReaderPreferences,
    setReaderPreferences,
    extractArticleFromHtml,
    saveArticleToBookmarks
} from '../reader-service';
import { db } from '../../db/schema';

// Mock DB
vi.mock('../../db/schema', () => ({
    db: {
        bookmarks: { add: vi.fn().mockResolvedValue(101), update: vi.fn(), where: vi.fn() },
        readerArticles: { get: vi.fn(), put: vi.fn(), update: vi.fn() }
    }
}));

describe('Reader Service - Reading Time & Preferences', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('calculateReadingTime calculates correct minutes based on word count', () => {
        // 500 words at 200 wpm = ceil(2.5) = 3 minutes
        const words = new Array(500).fill('word').join(' ');
        const res = calculateReadingTime(words, 200);
        expect(res.wordCount).toBe(500);
        expect(res.minutes).toBe(3);

        // Short text minimum is 1 min
        const short = calculateReadingTime('A quick note');
        expect(short.minutes).toBe(1);
    });

    it('formatReadingTime formats properly with and without translator', () => {
        expect(formatReadingTime(4)).toBe('4 dk okuma');

        const mockT = vi.fn((key, opts) => `${opts.count} min read`);
        expect(formatReadingTime(7, mockT)).toBe('7 min read');
    });

    it('getReaderPreferences and setReaderPreferences manage settings', () => {
        expect(getReaderPreferences()).toEqual(expect.objectContaining({
            theme: 'light',
            font: 'serif',
            fontSize: 18
        }));

        setReaderPreferences({ theme: 'sepia', fontSize: 20, font: 'sans' });
        const updated = getReaderPreferences();
        expect(updated.theme).toBe('sepia');
        expect(updated.fontSize).toBe(20);
        expect(updated.font).toBe('sans');
    });
});

describe('Reader Service - Article HTML Extraction', () => {
    it('extractArticleFromHtml extracts title, clean content, and removes noise', () => {
        const rawHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Blog Post Title</title>
                <meta property="og:image" content="/images/cover.jpg">
                <meta name="author" content="Jane Doe">
            </head>
            <body>
                <header><nav><a href="/">Home</a></nav></header>
                <div class="ad-banner">Annoying Ad</div>
                <div class="cookie-notice">We use cookies</div>
                <article class="post-content">
                    <h1>Blog Post Title</h1>
                    <p>This is the first paragraph of the article explaining how reading mode works in BookSmart.</p>
                    <p>Here is another paragraph containing important information for the reader.</p>
                    <img src="/assets/diagram.png" alt="Diagram">
                    <a href="/related">Related Post</a>
                </article>
                <div class="comments">Comments section</div>
                <footer>Footer links</footer>
            </body>
            </html>
        `;

        const article = extractArticleFromHtml(rawHtml, 'https://example.com/posts/article-1');
        expect(article.title).toBe('Blog Post Title');
        expect(article.byline).toBe('Jane Doe');
        expect(article.leadImage).toBe('https://example.com/images/cover.jpg');
        expect(article.contentHtml).toContain('This is the first paragraph');
        expect(article.contentHtml).not.toContain('Annoying Ad');
        expect(article.contentHtml).not.toContain('We use cookies');
        expect(article.contentHtml).not.toContain('Comments section');
        // Resolved absolute URLs
        expect(article.contentHtml).toContain('https://example.com/assets/diagram.png');
        expect(article.contentHtml).toContain('https://example.com/related');
        expect(article.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    });

    it('extractArticleFromHtml strips javascript: links, scripts, and event handlers for XSS safety', () => {
        const maliciousHtml = `
            <article>
                <h1>Secure Article</h1>
                <p>Hello <a href="javascript:alert('pwned')">Malicious Link</a> world.</p>
                <p><a href="https://trusted.com">Safe Link</a></p>
                <img src="javascript:alert(2)" alt="bad img">
                <div onclick="evil()">Click me</div>
            </article>
        `;

        const article = extractArticleFromHtml(maliciousHtml, 'https://example.com/safe');
        expect(article.contentHtml).not.toContain('javascript:');
        expect(article.contentHtml).not.toContain('onclick');
        expect(article.contentHtml).toContain('https://trusted.com');
    });

    it('saveArticleToBookmarks saves bookmark with reading time into Okuma Listesi', async () => {
        const article = {
            title: 'How to Build Fast Apps',
            url: 'https://example.com/fast-apps',
            readingTimeMinutes: 5,
            wordCount: 1000
        };

        const res = await saveArticleToBookmarks(article, 'Okuma Listesi');
        expect(db.bookmarks.add).toHaveBeenCalledWith(expect.objectContaining({
            title: 'How to Build Fast Apps',
            url: 'https://example.com/fast-apps',
            originalFolder: 'Okuma Listesi',
            readingTimeMinutes: 5,
            tags: expect.arrayContaining(['read-later', 'reader'])
        }));
        expect(res.id).toBe(101);
    });
});
