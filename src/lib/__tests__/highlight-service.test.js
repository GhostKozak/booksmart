import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    HIGHLIGHT_COLORS,
    getHighlightsForBookmark,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    exportHighlightsToMarkdown,
    applyHighlightsToHtml
} from '../highlight-service';
import { db } from '../../db/schema';

vi.mock('../../db/schema', () => ({
    db: {
        highlights: {
            where: vi.fn(),
            add: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        },
        bookmarks: {
            update: vi.fn()
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
});
