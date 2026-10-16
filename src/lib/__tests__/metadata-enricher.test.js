import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    isMissingTitle,
    isMissingDescription,
    isMissingIcon,
    analyzeEnrichmentCandidates,
    enrichSingleBookmark,
    MetadataEnrichmentQueue
} from '../metadata-enricher';

// Mock dependencies
vi.mock('../metadata-fetcher', () => ({
    fetchMetadataForUrl: vi.fn(async (url) => {
        if (url.includes('fail')) {
            throw new Error('Network error');
        }
        return {
            title: 'Resolved Title for ' + url,
            description: 'Resolved Description for ' + url,
            favicon: 'https://example.com/favicon.ico',
            image: 'https://example.com/og.png'
        };
    }),
    normalizeUrlForPreview: (url) => url.replace(/\/+$/, '')
}));

const mockDb = {
    bookmarks: {
        update: vi.fn().mockResolvedValue(1)
    }
};

describe('metadata-enricher utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Candidate detection helpers', () => {
        it('isMissingTitle detects empty, untitled, or url-like titles', () => {
            expect(isMissingTitle('', 'https://google.com')).toBe(true);
            expect(isMissingTitle(null, 'https://google.com')).toBe(true);
            expect(isMissingTitle('Untitled', 'https://google.com')).toBe(true);
            expect(isMissingTitle('untitled bookmark', 'https://google.com')).toBe(true);
            expect(isMissingTitle('https://google.com', 'https://google.com')).toBe(true);
            expect(isMissingTitle('https://google.com/', 'https://google.com')).toBe(true);
            expect(isMissingTitle('http://github.com/test', 'http://github.com/test')).toBe(true);
            expect(isMissingTitle('Real Page Title', 'https://google.com')).toBe(false);
        });

        it('isMissingDescription detects empty notes or descriptions', () => {
            expect(isMissingDescription('', '')).toBe(true);
            expect(isMissingDescription(null, undefined)).toBe(true);
            expect(isMissingDescription('   ', '')).toBe(true);
            expect(isMissingDescription('A note about this site', '')).toBe(false);
            expect(isMissingDescription('', 'Some description')).toBe(false);
        });

        it('isMissingIcon detects empty or default icons', () => {
            expect(isMissingIcon(null, null)).toBe(true);
            expect(isMissingIcon('', '')).toBe(true);
            expect(isMissingIcon('https://example.com/icon.png', null)).toBe(false);
            expect(isMissingIcon(null, 'https://example.com/fav.ico')).toBe(false);
        });

        it('analyzeEnrichmentCandidates categorizes bookmarks accurately', () => {
            const bookmarks = [
                { id: 1, title: 'https://site1.com', url: 'https://site1.com', note: '', icon: null },
                { id: 2, title: 'Good Title', url: 'https://site2.com', note: 'Has note', icon: 'https://site2.com/icon.png' },
                { id: 3, title: 'Good Title 2', url: 'https://site3.com', note: '', icon: null },
                { id: 4, title: 'Untitled', url: 'https://site4.com', note: 'Note exists', icon: null }
            ];

            const analysis = analyzeEnrichmentCandidates(bookmarks);

            expect(analysis.totalBookmarks).toBe(4);
            expect(analysis.missingTitleCount).toBe(2); // id 1, id 4
            expect(analysis.missingDescriptionCount).toBe(2); // id 1, id 3
            expect(analysis.missingIconCount).toBe(3); // id 1, id 3, id 4
            expect(analysis.needingEnrichmentCount).toBe(3); // id 1, 3, 4
            expect(analysis.fullyEnrichedCount).toBe(1); // id 2
        });
    });

    describe('enrichSingleBookmark', () => {
        it('fetches metadata and updates bookmark fields based on options', async () => {
            const bookmark = {
                id: 10,
                title: 'https://example.com/page',
                url: 'https://example.com/page',
                note: '',
                icon: null
            };

            const result = await enrichSingleBookmark(bookmark, {
                db: mockDb,
                updateBookmarkTitle: true,
                updateBookmarkNotes: true,
                updateBookmarkIcon: true
            });

            expect(result.success).toBe(true);
            expect(result.updatedFields).toContain('title');
            expect(result.updatedFields).toContain('note');
            expect(result.updatedFields).toContain('icon');

            expect(mockDb.bookmarks.update).toHaveBeenCalledWith(10, {
                title: 'Resolved Title for https://example.com/page',
                note: 'Resolved Description for https://example.com/page',
                icon: 'https://example.com/favicon.ico'
            });
        });

        it('does not overwrite existing valid title or icon if already present', async () => {
            const bookmark = {
                id: 11,
                title: 'Custom User Title',
                url: 'https://example.com/page',
                note: '',
                icon: 'https://example.com/existing.png'
            };

            const result = await enrichSingleBookmark(bookmark, {
                db: mockDb,
                updateBookmarkTitle: true,
                updateBookmarkNotes: true,
                updateBookmarkIcon: true
            });

            expect(result.success).toBe(true);
            expect(result.updatedFields).toContain('note');
            expect(result.updatedFields).not.toContain('title');
            expect(result.updatedFields).not.toContain('icon');

            expect(mockDb.bookmarks.update).toHaveBeenCalledWith(11, {
                note: 'Resolved Description for https://example.com/page'
            });
        });
    });

    describe('MetadataEnrichmentQueue', () => {
        it('runs enrichment queue and calls onProgress and onComplete', async () => {
            const bookmarks = [
                { id: 1, title: '', url: 'https://item1.com', note: '' },
                { id: 2, title: '', url: 'https://item2.com', note: '' }
            ];

            const progressUpdates = [];
            const queue = new MetadataEnrichmentQueue(bookmarks, {
                db: mockDb,
                concurrency: 2,
                updateBookmarkTitle: true,
                onProgress: (p) => progressUpdates.push(p)
            });

            const summary = await queue.start();

            expect(summary.total).toBe(2);
            expect(summary.processed).toBe(2);
            expect(summary.successCount).toBe(2);
            expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
        });

        it('supports pause and resume', async () => {
            const bookmarks = [
                { id: 1, title: '', url: 'https://item1.com' },
                { id: 2, title: '', url: 'https://item2.com' },
                { id: 3, title: '', url: 'https://item3.com' }
            ];

            const queue = new MetadataEnrichmentQueue(bookmarks, {
                db: mockDb,
                concurrency: 1
            });

            const startPromise = queue.start();
            queue.pause();
            expect(queue.isPaused).toBe(true);

            queue.resume();
            expect(queue.isPaused).toBe(false);

            const summary = await startPromise;
            expect(summary.total).toBe(3);
        });

        it('supports cancellation', async () => {
            const bookmarks = [
                { id: 1, title: '', url: 'https://item1.com' },
                { id: 2, title: '', url: 'https://item2.com' }
            ];

            const queue = new MetadataEnrichmentQueue(bookmarks, {
                db: mockDb,
                concurrency: 1
            });

            queue.cancel();
            expect(queue.isCancelled).toBe(true);
        });
    });
});
