import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxonomyManager } from '../TaxonomyManager';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => {
            if (options && options.type) return `${key}:${options.type}`;
            return key;
        }
    })
}));

// Mock child components
vi.mock('../taxonomy/TaxonomyList', () => ({
    TaxonomyList: ({ items, onDelete, onColorChange }) => (
        <div data-testid="taxonomy-list">
            {items.map(item => (
                <div key={item.id} data-testid={`item-${item.id}`}>
                    <span>{item.name}</span>
                    <button onClick={() => onDelete(item.id)}>Delete</button>
                    <button onClick={() => onColorChange(item.id, '#000000')}>ChangeColor</button>
                </div>
            ))}
        </div>
    )
}));

vi.mock('../taxonomy/DiscoveredTaxonomy', () => ({
    DiscoveredTaxonomy: ({ items, onAdd }) => (
        <div data-testid="discovered-list">
            {items.map(item => (
                <button key={item} onClick={() => onAdd(item)}>{item}</button>
            ))}
        </div>
    )
}));

// Mock dnd-kit sensors
vi.mock('@dnd-kit/core', () => ({
    useSensors: vi.fn(),
    useSensor: vi.fn(),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    DndContext: ({ children }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
    arrayMove: (arr) => arr,
    sortableKeyboardCoordinates: vi.fn(),
}));

describe('TaxonomyManager', () => {
    const folders = [{ id: 'f1', name: 'Work', color: '#3b82f6', order: 0 }];
    const tags = [{ id: 't1', name: 'UI', color: '#10b981', order: 0 }];
    const discoveredFolders = ['Social', 'News'];

    const mockSetFolders = vi.fn();
    const mockSetTags = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders folder tab by default', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
                tags={tags}
                setTags={mockSetTags}
            />
        );

        expect(screen.getByText('Work')).toBeInTheDocument();
        expect(screen.queryByText('UI')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('taxonomy.addPlaceholder:common.folder')).toBeInTheDocument();
    });

    it('switches to tags tab', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
                tags={tags}
                setTags={mockSetTags}
            />
        );

        fireEvent.click(screen.getByText('taxonomy.tags'));

        expect(screen.getByText('UI')).toBeInTheDocument();
        expect(screen.queryByText('Work')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('taxonomy.addPlaceholder:common.tag')).toBeInTheDocument();
    });

    it('adds a new folder', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
            />
        );

        const input = screen.getByPlaceholderText('taxonomy.addPlaceholder:common.folder');
        fireEvent.change(input, { target: { value: 'NewFolder' } });
        fireEvent.click(screen.getByRole('button', { name: '' })); // The Plus button

        expect(mockSetFolders).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ name: 'NewFolder' })
        ]));
    });

    it('deletes an item', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
            />
        );

        fireEvent.click(screen.getByText('Delete'));
        expect(mockSetFolders).toHaveBeenCalledWith([]);
    });

    it('changes item color', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
            />
        );

        fireEvent.click(screen.getByText('ChangeColor'));
        expect(mockSetFolders).toHaveBeenCalledWith([{ ...folders[0], color: '#000000' }]);
    });

    it('adds item from discovery list', () => {
        render(
            <TaxonomyManager
                folders={folders}
                setFolders={mockSetFolders}
                discoveredFolders={discoveredFolders}
            />
        );

        fireEvent.click(screen.getByText('Social'));
        expect(mockSetFolders).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ name: 'Social' })
        ]));
    });

    it('renders empty state message', () => {
        render(
            <TaxonomyManager
                folders={[]}
                setFolders={mockSetFolders}
            />
        );

        expect(screen.getByText('taxonomy.noItems:taxonomy.folders')).toBeInTheDocument();
    });
});
