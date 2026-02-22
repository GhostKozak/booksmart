import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkRow } from '../BookmarkRow';

// Mock components used by BookmarkRow
vi.mock('../bookmark/BookmarkRowDesktop', () => ({
    BookmarkRowDesktop: ({ bookmark, isSelected, toggleSelection }) => (
        <div data-testid="desktop-row">
            <span>{bookmark.title}</span>
            <button data-testid="toggle-btn" onClick={() => toggleSelection(bookmark.id)}>Toggle</button>
            {isSelected && <span>Selected</span>}
        </div>
    )
}));

vi.mock('../bookmark/BookmarkRowMobile', () => ({
    BookmarkRowMobile: () => <div data-testid="mobile-row" />
}));

describe('BookmarkRow', () => {
    const mockBookmark = {
        id: '1',
        title: 'Test Bookmark',
        url: 'https://test.com',
        status: 'unchanged'
    };

    const defaultProps = {
        bookmark: mockBookmark,
        selectedIds: new Set(),
        toggleSelection: vi.fn(),
        linkHealth: {},
        ignoredUrls: new Set(),
        toggleIgnoreUrl: vi.fn(),
        onPreview: vi.fn(),
        availableFolders: [],
        availableTags: [],
        allCollections: [],
        onRemoveFromCollection: vi.fn()
    };

    it('renders desktop and mobile views', () => {
        render(<BookmarkRow {...defaultProps} />);
        expect(screen.getByTestId('desktop-row')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-row')).toBeInTheDocument();
    });

    it('correctly identifies selected state', () => {
        const props = {
            ...defaultProps,
            selectedIds: new Set(['1'])
        };
        render(<BookmarkRow {...props} />);
        expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('calls toggleSelection when button is clicked', () => {
        render(<BookmarkRow {...defaultProps} />);
        fireEvent.click(screen.getByTestId('toggle-btn'));
        expect(defaultProps.toggleSelection).toHaveBeenCalledWith('1');
    });

    it('applies red background for duplicates', () => {
        const props = {
            ...defaultProps,
            bookmark: { ...mockBookmark, isDuplicate: true }
        };
        const { container } = render(<BookmarkRow {...props} />);
        const row = container.firstChild;
        expect(row.className).toContain('bg-red-500');
    });

    it('applies yellow background for "hasDuplicate"', () => {
        const props = {
            ...defaultProps,
            bookmark: { ...mockBookmark, hasDuplicate: true }
        };
        const { container } = render(<BookmarkRow {...props} />);
        const row = container.firstChild;
        expect(row.className).toContain('bg-yellow-500');
    });

    it('applies purple background for AI suggestions', () => {
        const props = {
            ...defaultProps,
            bookmark: { ...mockBookmark, status: 'suggested' }
        };
        const { container } = render(<BookmarkRow {...props} />);
        const row = container.firstChild;
        expect(row.className).toContain('bg-purple-500');
    });
});
