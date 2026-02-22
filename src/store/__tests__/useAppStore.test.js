import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../useAppStore';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('useAppStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        // Zustand doesn't have a built-in reset, so we manually reset key values 
        // or just let the singleton state persist if tests are isolated enough.
        // For strict isolation, one could use a factory for the store.
        const state = useAppStore.getState();
        state.setIsSidebarOpen(true);
        state.setSearchQuery('');
        state.setSelectedIds(new Set());
        state.setViewMode('list');
        localStorageMock.clear();
    });

    it('should initialize with default values', () => {
        const state = useAppStore.getState();
        expect(state.viewMode).toBe('list');
        expect(state.searchQuery).toBe('');
        expect(state.selectedIds).toBeInstanceOf(Set);
        expect(state.selectedIds.size).toBe(0);
    });

    it('should update sidebar state', () => {
        const { setIsSidebarOpen } = useAppStore.getState();
        setIsSidebarOpen(false);
        expect(useAppStore.getState().isSidebarOpen).toBe(false);
    });

    it('should toggle sections correctly', () => {
        const { toggleSection } = useAppStore.getState();
        const initial = useAppStore.getState().collapsedSections.tags;

        toggleSection('tags');
        expect(useAppStore.getState().collapsedSections.tags).toBe(!initial);

        toggleSection('tags');
        expect(useAppStore.getState().collapsedSections.tags).toBe(initial);
    });

    it('should update search query', () => {
        const { setSearchQuery } = useAppStore.getState();
        setSearchQuery('react');
        expect(useAppStore.getState().searchQuery).toBe('react');
    });

    it('should manage selections', () => {
        const { toggleSelection, setSelectedIds } = useAppStore.getState();

        toggleSelection('1');
        expect(useAppStore.getState().selectedIds.has('1')).toBe(true);

        toggleSelection('1');
        expect(useAppStore.getState().selectedIds.has('1')).toBe(false);

        setSelectedIds(new Set(['1', '2']));
        expect(useAppStore.getState().selectedIds.size).toBe(2);
    });

    it('should toggle all selections based on provided bookmarks', () => {
        const { toggleAll } = useAppStore.getState();
        const bookmarks = [{ id: '1' }, { id: '2' }, { id: '3' }];

        // Select all
        toggleAll(bookmarks);
        expect(useAppStore.getState().selectedIds.size).toBe(3);

        // Deselect all (since all are already selected)
        toggleAll(bookmarks);
        expect(useAppStore.getState().selectedIds.size).toBe(0);
    });

    it('should update theme and persist to localStorage', () => {
        const { setTheme } = useAppStore.getState();

        // Mock root element
        const root = document.createElement('html');
        vi.spyOn(document, 'documentElement', 'get').mockReturnValue(root);

        setTheme('dark');
        expect(useAppStore.getState().theme).toBe('dark');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
        expect(root.classList.contains('dark')).toBe(true);
        expect(root.classList.contains('light')).toBe(false);
    });
});
