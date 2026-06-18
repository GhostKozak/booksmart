import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkList } from '../BookmarkList';
import { BookmarkGrid } from '../BookmarkGrid';
import { BookmarkTable } from '../BookmarkTable';
import { BookmarkTree } from '../BookmarkTree';

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

// Mock child components for Grid and Table
vi.mock('../Favicon', () => ({ Favicon: () => <div data-testid="favicon" /> }));
vi.mock('../bookmark/BookmarkTags', () => ({ BookmarkTags: () => <div data-testid="bookmark-tags" /> }));
vi.mock('../bookmark/BookmarkCollections', () => ({ BookmarkCollections: () => <div data-testid="bookmark-collections" /> }));
vi.mock('../bookmark/BookmarkFolderBadge', () => ({ BookmarkFolderBadge: ({ folderName }) => <div data-testid="folder-badge">{folderName}</div> }));

// Mock Virtuoso
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent, context, components }) => {
        const Header = components?.Header || (() => null);
        return (
            <div data-testid="virtuoso">
                <Header />
                {data.map((item, index) => (
                    <div key={item.id}>
                        {itemContent(index, item, context)}
                    </div>
                ))}
            </div>
        );
    },
    VirtuosoGrid: ({ data, itemContent, context }) => (
        <div data-testid="virtuoso-grid">
            {data.map((item, index) => (
                <div key={item.id}>
                    {itemContent(index, item, context)}
                </div>
            ))}
        </div>
    ),
    TableVirtuoso: ({ data, itemContent, components, fixedHeaderContent }) => {
        const Table = components?.Table || 'table';
        const TableBody = components?.TableBody || 'tbody';
        const TableHead = components?.TableHead || 'thead';
        const TableRow = components?.TableRow || 'tr';
        return (
            <Table data-testid="table-virtuoso">
                {fixedHeaderContent && <TableHead>{fixedHeaderContent()}</TableHead>}
                <TableBody>
                    {data.map((item, index) => {
                        const content = itemContent(index, item);
                        return <TableRow key={item.id}>{content}</TableRow>;
                    })}
                </TableBody>
            </Table>
        );
    }
}));

// Mock Zustand Store
const { mockSetSortBy, mockSetSelectedIds } = vi.hoisted(() => ({
    mockSetSortBy: vi.fn(),
    mockSetSelectedIds: vi.fn()
}));

vi.mock('../../store/useAppStore', () => {
    const mockUseAppStore = vi.fn((selector) => {
        const state = {
            sortBy: 'default',
            setSortBy: mockSetSortBy,
            setSelectedIds: mockSetSelectedIds
        };
        return selector ? selector(state) : state;
    });
    mockUseAppStore.getState = () => ({
        setSelectedIds: mockSetSelectedIds
    });
    return {
        useAppStore: mockUseAppStore
    };
});

vi.mock('../store/useAppStore', () => {
    const mockUseAppStore = vi.fn((selector) => {
        const state = {
            sortBy: 'default',
            setSortBy: mockSetSortBy,
            setSelectedIds: mockSetSelectedIds
        };
        return selector ? selector(state) : state;
    });
    mockUseAppStore.getState = () => ({
        setSelectedIds: mockSetSelectedIds
    });
    return {
        useAppStore: mockUseAppStore
    };
});

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

    describe('BookmarkTable', () => {
        it('renders table columns and data rows', () => {
            render(
                <BookmarkTable
                    bookmarks={mockBookmarks}
                    selectedIds={new Set(['2'])}
                    toggleSelection={vi.fn()}
                    toggleAll={vi.fn()}
                    linkHealth={{}}
                    ignoredUrls={new Set()}
                    onPreview={vi.fn()}
                    onEdit={vi.fn()}
                />
            );

            expect(screen.getByText('bookmarks.columns.title')).toBeInTheDocument();
            expect(screen.getByText('sidebar.sections.folders')).toBeInTheDocument();
            expect(screen.getByText('sidebar.sections.tags')).toBeInTheDocument();
            expect(screen.getByText('Bookmark 1')).toBeInTheDocument();
            expect(screen.getByText('Bookmark 2')).toBeInTheDocument();
        });

        it('calls setSortBy when sortable column header is clicked', () => {
            render(
                <BookmarkTable
                    bookmarks={mockBookmarks}
                    selectedIds={new Set()}
                    toggleSelection={vi.fn()}
                    toggleAll={vi.fn()}
                    linkHealth={{}}
                    ignoredUrls={new Set()}
                    onPreview={vi.fn()}
                    onEdit={vi.fn()}
                />
            );

            const titleHeader = screen.getByText('bookmarks.columns.title');
            fireEvent.click(titleHeader);
            expect(mockSetSortBy).toHaveBeenCalled();
        });
    });

    describe('BookmarkTree', () => {
        it('renders tree folder and leaf bookmarks', () => {
            const nestedBookmarks = [
                { id: '1', title: 'Bookmark 1', url: 'https://b1.com', originalFolder: 'Folder A > Folder B' },
                { id: '2', title: 'Bookmark 2', url: 'https://b2.com', originalFolder: 'Folder A' }
            ];

            render(
                <BookmarkTree
                    bookmarks={nestedBookmarks}
                    selectedIds={new Set()}
                    toggleSelection={vi.fn()}
                    linkHealth={{}}
                    ignoredUrls={new Set()}
                    onPreview={vi.fn()}
                    onEdit={vi.fn()}
                />
            );

            // Folder A is rendered
            expect(screen.getByText('Folder A')).toBeInTheDocument();
            // Folder B is rendered under Folder A (since Folder A is expanded by default as first-level)
            expect(screen.getByText('Folder B')).toBeInTheDocument();
            // Bookmark 2 is at Folder A level
            expect(screen.getByText('Bookmark 2')).toBeInTheDocument();
        });

        it('calls expand all and collapse all on folder paths', () => {
            const nestedBookmarks = [
                { id: '1', title: 'Bookmark 1', url: 'https://b1.com', originalFolder: 'Folder A > Folder B' }
            ];

            render(
                <BookmarkTree
                    bookmarks={nestedBookmarks}
                    selectedIds={new Set()}
                    toggleSelection={vi.fn()}
                    linkHealth={{}}
                    ignoredUrls={new Set()}
                    onPreview={vi.fn()}
                    onEdit={vi.fn()}
                />
            );

            const expandBtn = screen.getByText('bookmarks.tree.expandAll');
            const collapseBtn = screen.getByText('bookmarks.tree.collapseAll');
            expect(expandBtn).toBeInTheDocument();
            expect(collapseBtn).toBeInTheDocument();

            fireEvent.click(collapseBtn);
            // Folder B is hidden because parent folder is collapsed
            expect(screen.queryByText('Folder B')).not.toBeInTheDocument();

            fireEvent.click(expandBtn);
            // Folder B is visible again after expand all
            expect(screen.getByText('Folder B')).toBeInTheDocument();
        });
    });
});
