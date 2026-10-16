import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMetadataEnricher } from '../use-metadata-enricher';

vi.mock('../../lib/metadata-enricher', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        enrichSingleBookmark: vi.fn(async (bm) => ({
            success: true,
            updatedFields: ['title', 'icon'],
            metadata: { title: 'New ' + bm.url, favicon: 'icon.ico' }
        }))
    };
});

describe('useMetadataEnricher hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default idle state and options', () => {
        const { result } = renderHook(() => useMetadataEnricher([]));

        expect(result.current.status).toBe('idle');
        expect(result.current.progress.total).toBe(0);
        expect(result.current.options.updateBookmarkTitle).toBe(true);
        expect(result.current.options.updateBookmarkIcon).toBe(true);
        expect(result.current.isModalOpen).toBe(false);
    });

    it('analyzes candidate bookmarks correctly', () => {
        const bookmarks = [
            { id: 1, title: 'https://site.com', url: 'https://site.com', note: '', icon: null },
            { id: 2, title: 'Valid', url: 'https://valid.com', note: 'Note', icon: 'fav.png' }
        ];

        const { result } = renderHook(() => useMetadataEnricher(bookmarks));

        expect(result.current.analysis.totalBookmarks).toBe(2);
        expect(result.current.analysis.needingEnrichmentCount).toBe(1);
        expect(result.current.analysis.missingTitleCount).toBe(1);
    });

    it('starts queue and processes items to completion', async () => {
        const bookmarks = [
            { id: 1, title: 'https://item1.com', url: 'https://item1.com' },
            { id: 2, title: 'https://item2.com', url: 'https://item2.com' }
        ];

        const { result } = renderHook(() => useMetadataEnricher(bookmarks));

        await act(async () => {
            await result.current.startEnrichment({ scope: 'all' });
        });

        expect(result.current.status).toBe('completed');
        expect(result.current.progress.processed).toBe(2);
        expect(result.current.progress.successCount).toBe(2);
    });

    it('allows opening and closing modal', () => {
        const { result } = renderHook(() => useMetadataEnricher([]));

        act(() => {
            result.current.openModal();
        });
        expect(result.current.isModalOpen).toBe(true);

        act(() => {
            result.current.closeModal();
        });
        expect(result.current.isModalOpen).toBe(false);
    });
});
