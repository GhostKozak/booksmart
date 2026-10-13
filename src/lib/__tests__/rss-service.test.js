import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    normalizeFeedInputUrl,
    resolveAbsoluteUrl,
    cleanHtmlText,
    parsePubDate,
    parseFeedXml,
    discoverFeedUrlFromHtml,
    getCandidateFeedUrls,
    addFeedItemToBookmarks,
    subscribeToFeed,
    exportFeedsToOpml,
    importFeedsFromOpml
} from '../rss-service';
import { db } from '../../db/schema';

// Mock DB
vi.mock('../../db/schema', () => ({
    db: {
        bookmarks: {
            add: vi.fn().mockResolvedValue(42),
            update: vi.fn(),
            where: vi.fn().mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    first: vi.fn().mockResolvedValue(null)
                })
            })
        },
        feeds: {
            put: vi.fn().mockResolvedValue('ok'),
            get: vi.fn().mockResolvedValue(null),
            toArray: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
            delete: vi.fn()
        },
        feedItems: {
            bulkPut: vi.fn().mockResolvedValue([]),
            bulkAdd: vi.fn().mockResolvedValue([]),
            toArray: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
            get: vi.fn().mockResolvedValue({ id: 99, feedUrl: 'https://test.com/feed' }),
            where: vi.fn().mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                    delete: vi.fn().mockResolvedValue(0),
                    modify: vi.fn().mockResolvedValue(0),
                    and: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
                    count: vi.fn().mockResolvedValue(0)
                })
            }),
            toCollection: vi.fn().mockReturnValue({
                modify: vi.fn().mockResolvedValue(0)
            })
        }
    }
}));

describe('RSS Service - XML Parsing & Helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('cleanHtmlText should strip HTML tags and decode basic entities', () => {
        const raw = '<p>Hello <b>world</b> &amp; &quot;friends&quot;!</p><script>alert(1)</script>';
        const cleaned = cleanHtmlText(raw);
        expect(cleaned).toBe('Hello world & "friends"!');
    });

    it('resolveAbsoluteUrl should resolve relative paths against base URL', () => {
        expect(resolveAbsoluteUrl('/posts/my-story', 'https://example.com/blog/'))
            .toBe('https://example.com/posts/my-story');
        expect(resolveAbsoluteUrl('https://other.com/post', 'https://example.com'))
            .toBe('https://other.com/post');
        expect(resolveAbsoluteUrl('', 'https://example.com')).toBe('');
    });

    it('parsePubDate should convert valid date strings to timestamps', () => {
        const rfc822 = 'Mon, 12 Oct 2026 10:00:00 GMT';
        const ts = parsePubDate(rfc822);
        expect(ts).toBe(Date.parse(rfc822));
    });

    it('parseFeedXml should parse RSS 2.0 format correctly and resolve relative links', () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <title>Tech Blog</title>
                <link>https://techblog.example.com</link>
                <description>Latest tech news</description>
                <item>
                    <title>AI Advances in 2026</title>
                    <link>/ai-2026</link>
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
                <link rel="alternate" href="/posts/minimalist"/>
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

    it('parseFeedXml should parse JSON Feed (1.1) correctly', () => {
        const jsonFeedStr = JSON.stringify({
            version: 'https://jsonfeed.org/version/1.1',
            title: 'Modern Tech JSON Feed',
            home_page_url: 'https://jsonfeed.example.com',
            description: 'Feeds in clean JSON format',
            items: [
                {
                    id: 'post-1',
                    title: 'JSON Feed Standard',
                    url: 'https://jsonfeed.example.com/post-1',
                    summary: 'Why JSON feed is elegant and simple.',
                    date_published: '2026-10-12T12:00:00Z',
                    authors: [{ name: 'JSON Enthusiast' }]
                }
            ]
        });

        const parsed = parseFeedXml(jsonFeedStr, 'https://jsonfeed.example.com/feed.json');
        expect(parsed.type).toBe('json');
        expect(parsed.title).toBe('Modern Tech JSON Feed');
        expect(parsed.items.length).toBe(1);
        expect(parsed.items[0].title).toBe('JSON Feed Standard');
        expect(parsed.items[0].link).toBe('https://jsonfeed.example.com/post-1');
        expect(parsed.items[0].author).toBe('JSON Enthusiast');
    });

    it('parseFeedXml handles UTF-8 BOM cleanly', () => {
        const withBom = '\uFEFF<?xml version="1.0"?><rss version="2.0"><channel><title>BOM Feed</title></channel></rss>';
        const parsed = parseFeedXml(withBom, 'https://bom.example.com/feed');
        expect(parsed.title).toBe('BOM Feed');
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

    it('getCandidateFeedUrls should generate sensible candidate URLs including Reddit and YouTube', () => {
        const urls = getCandidateFeedUrls('https://newsletter.substack.com');
        expect(urls).toContain('https://newsletter.substack.com/feed');

        const ghUrls = getCandidateFeedUrls('https://github.com/facebook/react');
        expect(ghUrls).toContain('https://github.com/facebook/react/releases.atom');

        const redditUrls = getCandidateFeedUrls('https://reddit.com/r/technology');
        expect(redditUrls).toContain('https://reddit.com/r/technology/.rss');

        const ytUrls = getCandidateFeedUrls('https://youtube.com/channel/UC123456');
        expect(ytUrls).toContain('https://www.youtube.com/feeds/videos.xml?channel_id=UC123456');
    });

    it('normalizeFeedInputUrl should prepend https:// if missing and trim whitespace', () => {
        expect(normalizeFeedInputUrl('techcrunch.com')).toBe('https://techcrunch.com');
        expect(normalizeFeedInputUrl('  overreacted.io/rss.xml  ')).toBe('https://overreacted.io/rss.xml');
        expect(normalizeFeedInputUrl('http://insecure.example.com')).toBe('http://insecure.example.com');
        expect(normalizeFeedInputUrl('https://secure.example.com')).toBe('https://secure.example.com');
        expect(normalizeFeedInputUrl('')).toBe('');
    });

    it('addFeedItemToBookmarks should format, add reading time, and avoid duplicates', async () => {
        const item = {
            title: 'Sample Article',
            link: 'https://example.com/article',
            summary: 'A short summary for reading estimation test with multiple words.',
            id: 99
        };

        const bookmark = await addFeedItemToBookmarks(item, 'Okuma Listesi');
        expect(db.bookmarks.add).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Sample Article',
            url: 'https://example.com/article',
            originalFolder: 'Okuma Listesi',
            readingTimeMinutes: expect.any(Number),
            tags: ['rss', 'newsletter']
        }));
        expect(bookmark.id).toBe(42);

        // When bookmark already exists, it should not call db.bookmarks.add again
        db.bookmarks.where.mockReturnValueOnce({
            equals: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValueOnce({ id: 101, url: 'https://example.com/article' })
            })
        });
        const duplicateRes = await addFeedItemToBookmarks(item, 'Okuma Listesi');
        expect(duplicateRes.isExisting).toBe(true);
        expect(duplicateRes.id).toBe(101);
    });

    it('subscribeToFeed should discover feed and insert items using bulkAdd', async () => {
        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
            <channel>
                <title>Mock Tech Blog</title>
                <link>https://mocktech.example.com</link>
                <item>
                    <title>Post 1</title>
                    <link>https://mocktech.example.com/post-1</link>
                    <pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate>
                </item>
            </channel>
        </rss>`;

        // Mock global fetch
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => rssXml
        });

        try {
            const res = await subscribeToFeed(null, 'mocktech.example.com/rss');
            expect(res.feed.title).toBe('Mock Tech Blog');
            expect(db.feeds.put).toHaveBeenCalledWith(expect.objectContaining({
                feedUrl: 'https://mocktech.example.com/rss',
                title: 'Mock Tech Blog'
            }));
            expect(db.feedItems.bulkAdd).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    title: 'Post 1',
                    link: 'https://mocktech.example.com/post-1'
                })
            ]));
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('exportFeedsToOpml and importFeedsFromOpml should work with OPML 2.0 format', async () => {
        db.feeds.toArray.mockResolvedValueOnce([
            { title: 'Tech Blog', feedUrl: 'https://tech.com/rss', siteUrl: 'https://tech.com' }
        ]);

        const opml = await exportFeedsToOpml();
        expect(opml).toContain('<opml version="2.0">');
        expect(opml).toContain('xmlUrl="https://tech.com/rss"');

        // Test Import
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => '<rss version="2.0"><channel><title>Imported</title></channel></rss>'
        });

        try {
            const importRes = await importFeedsFromOpml(opml);
            expect(importRes.total).toBe(1);
            expect(importRes.importedCount).toBe(1);
        } finally {
            global.fetch = originalFetch;
        }
    });
});
