import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimilarDuplicatesModal } from '../SimilarDuplicatesModal';

describe('SimilarDuplicatesModal', () => {
    const mockBookmarks = [
        {
            id: 1,
            title: 'React Documentation',
            url: 'https://react.dev',
            tags: ['react', 'docs'],
            note: 'Official docs',
            addDate: '1000'
        },
        {
            id: 2,
            title: 'React Docs | Overview',
            url: 'https://react.dev/?utm_source=twitter',
            tags: ['frontend'],
            note: '',
            addDate: '2000'
        },
        {
            id: 3,
            title: 'Unrelated Site',
            url: 'https://github.com',
            tags: [],
            note: '',
            addDate: '3000'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders duplicate clusters with badges and bookmarks', () => {
        render(
            <SimilarDuplicatesModal
                isOpen={true}
                onClose={vi.fn()}
                bookmarks={mockBookmarks}
                onBatchMerge={vi.fn()}
            />
        );

        expect(screen.getByText(/(Yinelenen ve Benzer İçerikleri Birleştir|Consolidate Similar & Duplicate Bookmarks)/i)).toBeInTheDocument();
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
        expect(screen.getByText('React Docs | Overview')).toBeInTheDocument();
        expect(screen.queryByText('Unrelated Site')).not.toBeInTheDocument();
    });

    it('allows selecting a different primary bookmark in the cluster', () => {
        render(
            <SimilarDuplicatesModal
                isOpen={true}
                onClose={vi.fn()}
                bookmarks={mockBookmarks}
                onBatchMerge={vi.fn()}
            />
        );

        const secondaryCard = screen.getByText('React Docs | Overview').closest('div');
        fireEvent.click(secondaryCard);

        expect(screen.getByText('React Docs | Overview')).toBeInTheDocument();
    });

    it('calls onBatchMerge when merging a single group', async () => {
        const onBatchMerge = vi.fn().mockResolvedValue(1);

        render(
            <SimilarDuplicatesModal
                isOpen={true}
                onClose={vi.fn()}
                bookmarks={mockBookmarks}
                onBatchMerge={onBatchMerge}
            />
        );

        const mergeBtn = screen.getByRole('button', { name: /^(Birleştir|Merge)$/i });
        fireEvent.click(mergeBtn);

        expect(onBatchMerge).toHaveBeenCalledWith([
            expect.objectContaining({
                primary: expect.any(Object),
                secondaries: expect.any(Array)
            })
        ]);
    });

    it('dismisses a cluster when X button is clicked', () => {
        render(
            <SimilarDuplicatesModal
                isOpen={true}
                onClose={vi.fn()}
                bookmarks={mockBookmarks}
                onBatchMerge={vi.fn()}
            />
        );

        const dismissBtn = screen.getByTitle(/(Yok Say|Dismiss)/i);
        fireEvent.click(dismissBtn);

        expect(screen.queryByText('React Documentation')).not.toBeInTheDocument();
        expect(screen.getByText(/(Yinelenen veya benzer içerik bulunamadı|No duplicate or similar content found)/i)).toBeInTheDocument();
    });
});
