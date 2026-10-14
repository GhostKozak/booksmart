import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Header } from '../Header'
import { useAppStore } from '../../../store/useAppStore'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultValue) => {
            if (typeof defaultValue === 'string') return defaultValue
            if (defaultValue && typeof defaultValue === 'object' && defaultValue.defaultValue) {
                return defaultValue.defaultValue
            }
            return key
        }
    })
}))

describe('Header component', () => {
    const defaultProps = {
        canUndo: true,
        canRedo: false,
        undo: vi.fn(),
        redo: vi.fn(),
        past: [{ id: 1 }],
        future: [],
        duplicateCount: 0,
        removeDuplicates: vi.fn(),
        mergeDuplicates: vi.fn(),
        cleanableCount: 0,
        cleanAllUrls: vi.fn(),
        checkAllLinks: vi.fn(),
        isCheckingLinks: false,
        isExtensionConnected: false,
        openExportModal: vi.fn(),
        importFromBrowser: vi.fn(),
        pushToBrowser: vi.fn(),
        twoWaySync: vi.fn(),
        isSyncing: false,
        hasFileLoaded: true,
        closeFile: vi.fn(),
        bookmarkCount: 42,
        clearAll: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
        useAppStore.setState({
            isSidebarOpen: true,
            searchQuery: '',
            searchMode: 'simple',
            isAdvancedSearchOpen: false,
            dateFilter: { start: null, end: null }
        })
    })

    it('renders logo, title, and search input', () => {
        render(<Header {...defaultProps} />)

        expect(screen.getByText('app.title')).toBeInTheDocument()
        const searchInput = screen.getByRole('searchbox')
        expect(searchInput).toBeInTheDocument()
    })

    it('toggles sidebar when sidebar button is clicked', () => {
        render(<Header {...defaultProps} />)

        const toggleBtn = screen.getByTitle('Kenar Çubuğunu Aç/Kapat')
        fireEvent.click(toggleBtn)

        expect(useAppStore.getState().isSidebarOpen).toBe(false)
    })

    it('handles search input change and clear button click', () => {
        render(<Header {...defaultProps} />)

        const searchInput = screen.getByRole('searchbox')
        fireEvent.change(searchInput, { target: { value: 'react testing' } })

        expect(useAppStore.getState().searchQuery).toBe('react testing')

        const clearBtn = screen.getByTitle('header.clearSearch')
        fireEvent.click(clearBtn)

        expect(useAppStore.getState().searchQuery).toBe('')
    })

    it('triggers undo when undo button is clicked', () => {
        render(<Header {...defaultProps} />)

        const undoBtn = screen.getByTitle('Geri Al')
        fireEvent.click(undoBtn)

        expect(defaultProps.undo).toHaveBeenCalled()
    })

    it('opens command palette when ⌘K button is clicked', () => {
        render(<Header {...defaultProps} />)

        const cmdBtn = screen.getByTitle('Komut Paleti (Ctrl+K)')
        fireEvent.click(cmdBtn)

        expect(useAppStore.getState().isCommandPaletteOpen).toBe(true)
    })

    it('opens RSS reader when RSS button is clicked', () => {
        render(<Header {...defaultProps} />)

        const rssBtn = screen.getByTitle('RSS & Bülten Akışları')
        fireEvent.click(rssBtn)

        expect(useAppStore.getState().isRssReaderOpen).toBe(true)
    })

    it('toggles advanced search panel on filter icon click', () => {
        render(<Header {...defaultProps} />)

        const filterBtn = screen.getByTitle('header.advancedSearch')
        fireEvent.click(filterBtn)

        expect(useAppStore.getState().isAdvancedSearchOpen).toBe(true)
    })
})
