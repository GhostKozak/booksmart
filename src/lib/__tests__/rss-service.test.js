import { describe, it, expect, vi } from 'vitest';
import {
    cleanHtmlText,
    parsePubDate,
    parseFeedXml,
    discoverFeedUrlFromHtml,
    getCandidateFeedUrls,
    addFeedItemToBookmarks
} from '../rss-service';
import { db } from '../../db/schema';

// Mock DB
vi.mock('../../db/schema', () => ({
    db: {
        bookmarks: { add: vi.fn().mockResolvedValue(42), update: vi.fn(), where: vi.fn() },
        feeds: { put: vi.fn(), get: vi.fn(), toArray: vi.fn().mockResolvedValue([]), update: vi.fn() },
        feedItems: {
            bulkPut: vi.fn(),
            bulkAdd: vi.fn(),
            toArray: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
            get: vi.fn().mockResolvedValue({ id: 99, feedUrl: 'https://test.com/feed' }),
            where: vi.fn().mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    and: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
                    count: vi.fn().mockResolvedValue(0)
                })
            })
        }
    }
}));

describe('RSS Service - XML Parsing & Helpers', () => {
    it('cleanHtmlText should strip HTML tags and decode basic entities', () => {
        const raw = '<p>Hello <b>world</b> &amp; &quot;friends&quot;!</p><script>alert(1)</script>';
        const cleaned = cleanHtmlText(raw);
        expect(cleaned).toBe('Hello world & "friends"!');
    });

    it('parsePubDate should convert valid date strings to timestamps', () => {
        const rfc822 = 'Mon, 12 Oct 2026 10:00:00 GMT';
        const ts = parsePubDate(rfc822);
        expect(ts).toBe(Date.parse(rfc822));
    });

    it('parseFeedXml should parse RSS 2.0 format correctly', () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <title>Tech Blog</title>
                <link>https://techblog.example.com</link>
                <description>Latest tech news</description>
                <item>
                    <title>AI Advances in 2026</title>
                    <link>https://techblog.example.com/ai-2026</link>
                    <description>Exciting developments in AI models.</description>
                    <pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate>
                    <author>Jane Doe</author>
                </item>
            </channel>
        </rss>`;

        const parsed = parseFeedXml(rssXml, 'https://techblog.example.com/feed');
        expect(parsed.type).toBe('rss');
        expect(parsed.title).toBe('Tech Blog');
        expect(parsed.description).toBe('Latest tech news');
        expect(parsed.siteUrl).toBe('https://techblog.example.com');
        expect(parsed.items.length).toBe(1);
        expect(parsed.items[0].title).toBe('AI Advances in 2026');
        expect(parsed.items[0].link).toBe('https://techblog.example.com/ai-2026');
        expect(parsed.items[0].summary).toContain('Exciting developments');
    });

    it('parseFeedXml should parse Atom 1.0 format correctly', () => {
        const atomXml = `<?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Design Weekly</title>
            <subtitle>A newsletter about modern UI</subtitle>
            <link rel="alternate" href="https://designweekly.example.com"/>
            <entry>
                <title>Minimalist Interfaces</title>
                <link rel="alternate" href="https://designweekly.example.com/posts/minimalist"/>
                <id>urn:uuid:12345</id>
                <updated>2026-10-12T09:00:00Z</updated>
                <summary>How to design cleaner web apps.</summary>
                <author><name>Alex Designer</name></author>
            </entry>
        </feed>`;

        const parsed = parseFeedXml(atomXml, 'https://designweekly.example.com/atom.xml');
        expect(parsed.type).toBe('atom');
        expect(parsed.title).toBe('Design Weekly');
        expect(parsed.description).toBe('A newsletter about modern UI');
        expect(parsed.siteUrl).toBe('https://designweekly.example.com');
        expect(parsed.items.length).toBe(1);
        expect(parsed.items[0].title).toBe('Minimalist Interfaces');
        expect(parsed.items[0].link).toBe('https://designweekly.example.com/posts/minimalist');
        expect(parsed.items[0].author).toBe('Alex Designer');
    });

    it('discoverFeedUrlFromHtml should extract <link rel="alternate" type="application/rss+xml">', () => {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
            </head>
            <body>Blog</body>
            </html>
        `;
        const discovered = discoverFeedUrlFromHtml(html, 'https://myblog.com/index.html');
        expect(discovered).toBe('https://myblog.com/rss.xml');
    });

    it('getCandidateFeedUrls should generate sensible candidate URLs', () => {
        const urls = getCandidateFeedUrls('https://newsletter.substack.com');
        expect(urls).toContain('https://newsletter.substack.com/feed');

        const ghUrls = getCandidateFeedUrls('https://github.com/facebook/react');
        expect(ghUrls).toContain('https://github.com/facebook/react/releases.atom');
    });

    it('addFeedItemToBookmarks should format and add item to DB', async () => {
        const item = {
            title: 'Sample Article',
            link: 'https://example.com/article',
            summary: 'A short summary',
            id: 99
        };

        const bookmark = await addFeedItemToBookmarks(item, 'Okuma Listesi');
        expect(db.bookmarks.add).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Sample Article',
            url: 'https://example.com/article',
            originalFolder: 'Okuma Listesi',
            tags: ['rss', 'newsletter']
        }));
        expect(bookmark.id).toBe(42);
    });
});
