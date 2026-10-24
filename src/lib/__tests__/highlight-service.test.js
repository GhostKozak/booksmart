import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    HIGHLIGHT_COLORS,
    getHighlightsForBookmark,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlightsToMarkdown,
    applyHighlightsToHtml,
    getAllHighlights,
    syncExtensionHighlightsToDb,
    exportHighlightsToObsidianMarkdown,
    downloadMarkdownFile
} from '../highlight-service';
import { db } from '../../db/schema';
import * as extensionClient from '../extension-client';

vi.mock('../extension-client', () => ({
    getAllExtensionHighlights: vi.fn()
}));

vi.mock('../../db/schema', () => ({
    db: {
        highlights: {
            where: vi.fn(),
            add: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            toArray: vi.fn().mockResolvedValue([]),
            bulkAdd: vi.fn().mockResolvedValue()
        },
        bookmarks: {
            update: vi.fn(),
            toArray: vi.fn().mockResolvedValue([])
        }
    }
}));

describe('highlight-service.js', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('defines standard highlight color presets', () => {
        expect(HIGHLIGHT_COLORS.length).toBeGreaterThanOrEqual(3);
        const ids = HIGHLIGHT_COLORS.map(c => c.id);
        expect(ids).toContain('yellow');
        expect(ids).toContain('green');
        expect(ids).toContain('blue');
    });

    it('fetches highlights by bookmarkId and sorts by createdAt', async () => {
        const mockList = [
            { id: 2, text: 'Second highlight', createdAt: 200 },
            { id: 1, text: 'First highlight', createdAt: 100 }
        ];

        db.highlights.where.mockReturnValue({
            equals: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue(mockList)
            })
        });

        const res = await getHighlightsForBookmark(10, 'https://example.com');
        expect(res.length).toBe(2);
        expect(res[0].id).toBe(1);
        expect(res[1].id).toBe(2);
    });

    it('adds a new highlight and updates bookmark highlightsCount', async () => {
        db.highlights.add.mockResolvedValue(42);
        db.highlights.where.mockReturnValue({
            equals: vi.fn().mockReturnValue({
                count: vi.fn().mockResolvedValue(1)
            })
        });

        const res = await addHighlight({
            bookmarkId: 5,
            url: 'https://example.com',
            text: 'Important quote',
            color: 'green',
            note: 'My research note'
        });

        expect(res).not.toBeNull();
        expect(res.id).toBe(42);
        expect(res.text).toBe('Important quote');
        expect(res.color).toBe('green');
        expect(db.highlights.add).toHaveBeenCalled();
        expect(db.bookmarks.update).toHaveBeenCalledWith(5, { highlightsCount: 1 });
    });

    it('updates an existing highlight note and color', async () => {
        db.highlights.update.mockResolvedValue(1);

        const ok = await updateHighlight(42, { note: 'Updated note', color: 'blue' });
        expect(ok).toBe(true);
        expect(db.highlights.update).toHaveBeenCalledWith(42, expect.objectContaining({
            note: 'Updated note',
            color: 'blue'
        }));
    });

    it('deletes highlight and refreshes bookmark count', async () => {
        db.highlights.delete.mockResolvedValue(undefined);
        db.highlights.where.mockReturnValue({
            equals: vi.fn().mockReturnValue({
                count: vi.fn().mockResolvedValue(0)
            })
        });

        const ok = await deleteHighlight(42, 5);
        expect(ok).toBe(true);
        expect(db.highlights.delete).toHaveBeenCalledWith(42);
        expect(db.bookmarks.update).toHaveBeenCalledWith(5, { highlightsCount: 0 });
    });

    it('exports highlights to formatted Markdown blockquotes', () => {
        const bookmark = { title: 'Test Article', url: 'https://test.com' };
        const highlights = [
            { text: 'A notable excerpt', color: 'yellow', note: 'Check this later' },
            { text: 'Another cool fact', color: 'blue', note: '' }
        ];

        const md = exportHighlightsToMarkdown(bookmark, highlights);
        expect(md).toContain('## 📖 Vurgular ve Notlar: [Test Article](https://test.com)');
        expect(md).toContain('> A notable excerpt');
        expect(md).toContain('**Not:** Check this later');
        expect(md).toContain('> Another cool fact');
    });

    it('applies <mark> tags to text content without altering HTML tags', () => {
        const html = '<p>This is a great <strong>article about React</strong> performance.</p>';
        const highlights = [
            { id: 1, text: 'great', color: 'yellow', note: '' }
        ];

        const modified = applyHighlightsToHtml(html, highlights);
        expect(modified).toContain('<mark data-highlight-id="1"');
        expect(modified).toContain('class="booksmart-highlight booksmart-highlight-yellow"');
        expect(modified).toContain('<strong>article about React</strong>');
    });

    it('getAllHighlights returns highlights ordered by createdAt desc', async () => {
        db.highlights.toArray.mockResolvedValue([
            { id: 1, text: 'old', createdAt: 100 },
            { id: 2, text: 'new', createdAt: 500 }
        ]);

        const list = await getAllHighlights();
        expect(list.length).toBe(2);
        expect(list[0].id).toBe(2);
        expect(list[1].id).toBe(1);
    });

    it('syncExtensionHighlightsToDb imports new highlights from extension', async () => {
        extensionClient.getAllExtensionHighlights.mockResolvedValue([
            { url: 'https://example.com', text: 'Important web quote', color: 'purple', note: 'Saved from chrome' },
            { url: 'https://example.com', text: 'Already present quote', color: 'yellow' }
        ]);

        db.highlights.toArray.mockResolvedValue([
            { id: 99, url: 'https://example.com', text: 'Already present quote' }
        ]);

        db.bookmarks.toArray.mockResolvedValue([
            { id: 7, url: 'https://example.com', title: 'Example Page' }
        ]);

        const res = await syncExtensionHighlightsToDb();
        expect(res.imported).toBe(1);
        expect(res.total).toBe(2);
        expect(db.highlights.bulkAdd).toHaveBeenCalledWith([
            expect.objectContaining({
                bookmarkId: 7,
                pageTitle: 'Example Page',
                text: 'Important web quote',
                color: 'purple',
                note: 'Saved from chrome'
            })
        ]);
    });

    it('exportHighlightsToObsidianMarkdown formats callouts and YAML frontmatter', () => {
        const highlights = [
            {
                url: 'https://github.com',
                pageTitle: 'GitHub Home',
                text: 'Where the world builds software',
                color: 'purple',
                note: 'Key slogan to remember'
            }
        ];

        const md = exportHighlightsToObsidianMarkdown(highlights, {
            title: 'My Research Highlights',
            includeCallouts: true
        });

        expect(md).toContain('---');
        expect(md).toContain('title: "My Research Highlights"');
        expect(md).toContain('tags:');
        expect(md).toContain('# 📖 My Research Highlights');
        expect(md).toContain('## [GitHub Home](https://github.com)');
        expect(md).toContain('> [!quote] Where the world builds software');
        expect(md).toContain('> [!note] 📝 Yapışkan Not');
        expect(md).toContain('> Key slogan to remember');
    });

    it('downloadMarkdownFile creates and triggers a download link', () => {
        const createElementSpy = vi.spyOn(document, 'createElement');
        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        // Mock URL.createObjectURL and revokeObjectURL
        globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        globalThis.URL.revokeObjectURL = vi.fn();

        downloadMarkdownFile('# Test Markdown', 'test.md');

        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
});
