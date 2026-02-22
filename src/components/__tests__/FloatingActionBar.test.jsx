import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FloatingActionBar } from '../FloatingActionBar';
import { useAppStore } from '../../store/useAppStore';

// Mock Zustand store
vi.mock('../../store/useAppStore', () => ({
    useAppStore: vi.fn()
}));

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key
    })
}));

// Mock child components
vi.mock('../actionbar/SelectionInfo', () => ({
    SelectionInfo: ({ count, onClear }) => (
        <div data-testid="selection-info">
            Selected: {count}
            <button onClick={onClear}>Clear</button>
        </div>
    )
}));

vi.mock('../actionbar/TagBulkPopover', () => ({ TagBulkPopover: () => <div data-testid="tag-popover" /> }));
vi.mock('../actionbar/MoveBulkPopover', () => ({ MoveBulkPopover: () => <div data-testid="move-popover" /> }));
vi.mock('../actionbar/CollectionBulkPopover', () => ({ CollectionBulkPopover: () => <div data-testid="collection-popover" /> }));
vi.mock('../ui/DropdownMenu', () => ({
    DropdownMenu: ({ children, trigger }) => <div data-testid="dropdown">{trigger}{children}</div>,
    DropdownItem: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    DropdownSeparator: () => <hr />
}));

describe('FloatingActionBar', () => {
    const defaultProps = {
        onDelete: vi.fn(),
        onMove: vi.fn(),
        allFolders: [],
        allTags: [],
        onOverrideStatus: vi.fn(),
        onAddTags: vi.fn(),
        onExportSelected: vi.fn(),
        onCleanUrls: vi.fn(),
        onAutoSort: vi.fn(),
        onMagicSort: vi.fn(),
        isProcessingAI: false,
        allCollections: [],
        onAddToCollection: vi.fn(),
        onRemoveFromCollection: vi.fn(),
        onFixTitles: vi.fn(),
        onFindSmartDuplicates: vi.fn(),
        onCancelAITasks: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when no items are selected', () => {
        useAppStore.mockImplementation((selector) => selector({ selectedIds: new Set(), setSelectedIds: vi.fn() }));
        const { container } = render(<FloatingActionBar {...defaultProps} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when items are selected', () => {
        useAppStore.mockImplementation((selector) => selector({
            selectedIds: new Set(['1', '2']),
            setSelectedIds: vi.fn()
        }));
        render(<FloatingActionBar {...defaultProps} />);
        expect(screen.getByTestId('selection-info')).toBeInTheDocument();
        expect(screen.getByText('Selected: 2')).toBeInTheDocument();
    });

    it('calls onDelete when delete button is clicked', () => {
        useAppStore.mockImplementation((selector) => selector({
            selectedIds: new Set(['1']),
            setSelectedIds: vi.fn()
        }));
        render(<FloatingActionBar {...defaultProps} />);

        // Find specifically the desktop delete button (the one inside min-[1200px]:flex)
        const deleteBtns = screen.getAllByRole('button', { name: /actionbar.delete/i });
        fireEvent.click(deleteBtns[0]);

        expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it('displays processing state correctly', () => {
        useAppStore.mockImplementation((selector) => selector({
            selectedIds: new Set(['1']),
            setSelectedIds: vi.fn()
        }));
        render(<FloatingActionBar {...defaultProps} isProcessingAI={true} />);

        // Use getAllByText if it might appear in multiple places (desktop and mobile menus)
        const elements = screen.getAllByText('actionbar.sorting');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('calls onCancelAITasks when cancel is clicked during processing', () => {
        useAppStore.mockImplementation((selector) => selector({
            selectedIds: new Set(['1']),
            setSelectedIds: vi.fn()
        }));

        render(<FloatingActionBar {...defaultProps} isProcessingAI={true} />);

        // The button changes its role/title when processing
        const cancelBtn = screen.getByTitle('common.cancel');
        fireEvent.click(cancelBtn);

        expect(defaultProps.onCancelAITasks).toHaveBeenCalled();
    });
});
