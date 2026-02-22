import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkList } from '../BookmarkList';
import { BookmarkGrid } from '../BookmarkGrid';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

// Mock BookmarkRow for BookmarkList
vi.mock('../BookmarkRow', () => ({
    BookmarkRow: ({ bookmark, selectedIds, toggleSelection }) => {
        const isSelected = selectedIds?.has(bookmark.id);
        return (
            <div data-testid="bookmark-row">
                <span>{bookmark.title}</span>
                {isSelected && <span>Selected</span>}
                <button onClick={() => toggleSelection(bookmark.id)}>Select</button>
            </div>
        );
    }
}));

// Mock child components for Grid
vi.mock('../Favicon', () => ({ Favicon: () => <div data-testid="favicon" /> }));

// Mock Virtuoso
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent, context }) => (
        <div data-testid="virtuoso">
            {data.map((item, index) => (
                <div key={item.id}>
                    {itemContent(index, item, context)}
                </div>
            ))}
        </div>
    ),
    VirtuosoGrid: ({ data, itemContent, context }) => (
        <div data-testid="virtuoso-grid">
            {data.map((item, index) => (
                <div key={item.id}>
                    {itemContent(index, item, context)}
                </div>
            ))}
        </div>
    )
}));

describe('Bookmark Views', () => {
    const mockBookmarks = [
        { id: '1', title: 'Bookmark 1', url: 'https://b1.com', originalFolder: 'Root' },
        { id: '2', title: 'Bookmark 2', url: 'https://b2.com', originalFolder: 'Root' }
    ];

    describe('BookmarkList', () => {
        it('renders header and items', () => {
            render(
                <BookmarkList
                    bookmarks={mockBookmarks}
                    selectedIds={new Set(['1'])}
                    toggleSelection={vi.fn()}
                    toggleAll={vi.fn()}
                    linkHealth={{}}
                    ignoredUrls={new Set()}
                />
            );

            expect(screen.getByText('bookmarks.columns.title')).toBeInTheDocument();
            const rows = screen.getAllByTestId('bookmark-row');
            expect(rows).toHaveLength(2);
            expect(screen.getByText('Selected')).toBeInTheDocument();
        });

        it('calls toggleSelection when button in row is clicked', () => {
            const toggleSelection = vi.fn();
            render(
                <BookmarkList
                    bookmarks={[mockBookmarks[0]]}
                    selectedIds={new Set()}
                    toggleSelection={toggleSelection}
                    linkHealth={{}}
                />
            );

            fireEvent.click(screen.getByText('Select'));
            expect(toggleSelection).toHaveBeenCalledWith('1');
        });
    });

    describe('BookmarkGrid', () => {
        it('renders grid items correctly', () => {
            render(
                <BookmarkGrid
                    bookmarks={mockBookmarks}
                    selectedIds={new Set(['2'])}
                    toggleSelection={vi.fn()}
                    onPreview={vi.fn()}
                    showThumbnails={true}
                />
            );

            expect(screen.getAllByTestId('favicon')).toHaveLength(4); // 2 per item (thumb fallback + main icon)
            expect(screen.getByText('Bookmark 1')).toBeInTheDocument();
            expect(screen.getByText('Bookmark 2')).toBeInTheDocument();
        });

        it('toggles selection on click with ctrl key', () => {
            const toggleSelection = vi.fn();
            render(
                <BookmarkGrid
                    bookmarks={[mockBookmarks[0]]}
                    selectedIds={new Set()}
                    toggleSelection={toggleSelection}
                    onPreview={vi.fn()}
                    showThumbnails={true}
                />
            );

            const card = screen.getByText('Bookmark 1').closest('[role="button"]');
            fireEvent.click(card, { ctrlKey: true });
            expect(toggleSelection).toHaveBeenCalledWith('1');
        });

        it('calls onPreview on normal click', () => {
            const onPreview = vi.fn();
            render(
                <BookmarkGrid
                    bookmarks={[mockBookmarks[0]]}
                    selectedIds={new Set()}
                    toggleSelection={vi.fn()}
                    onPreview={onPreview}
                    showThumbnails={true}
                />
            );

            const card = screen.getByText('Bookmark 1').closest('[role="button"]');
            fireEvent.click(card);
            expect(onPreview).toHaveBeenCalledWith(mockBookmarks[0]);
        });
    });
});
