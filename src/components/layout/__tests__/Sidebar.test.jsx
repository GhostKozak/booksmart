import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Sidebar } from '../Sidebar'
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

describe('Sidebar component', () => {
    const mockBookmarks = [
        { id: 1, title: 'React Docs', url: 'https://react.dev', newFolder: 'Dev', tags: ['frontend'] },
        { id: 2, title: 'Vue Docs', url: 'https://vuejs.org', newFolder: 'Dev', tags: ['frontend'] },
        { id: 3, title: 'Uncategorized Link', url: 'https://example.com' }
    ]

    const mockFolders = [
        { id: 'f1', name: 'Dev', color: '#f59e0b', order: 1 }
    ]

    const mockTags = [
        { id: 't1', name: 'frontend', color: '#3b82f6', order: 1 }
    ]

    const mockCollections = [
        { id: 'c1', name: 'Work Articles', color: '#8b5cf6', icon: '💼' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        useAppStore.setState({
            isSidebarOpen: true,
            activeFolder: null,
            activeTag: null,
            activeCollection: null,
            smartFilter: null,
            collapsedSections: { tags: false, folders: false, filters: false, rules: false, collections: false }
        })
    })

    it('renders All Bookmarks and Inbox with accurate counts', () => {
        render(
            <Sidebar
                bookmarks={mockBookmarks}
                availableFolders={mockFolders}
                availableTags={mockTags}
                collections={mockCollections}
            />
        )

        expect(screen.getByText('Tüm Yer İmleri')).toBeInTheDocument();
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // total bookmarks badge
        expect(screen.getByText('Kategorisiz')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 uncategorized
    })

    it('clicking All Bookmarks resets any active filter', () => {
        useAppStore.setState({ activeFolder: 'Dev' })

        render(
            <Sidebar
                bookmarks={mockBookmarks}
                availableFolders={mockFolders}
                availableTags={mockTags}
                collections={mockCollections}
            />
        )

        const allBookmarksBtn = screen.getByText('Tüm Yer İmleri').closest('button')
        fireEvent.click(allBookmarksBtn)

        expect(useAppStore.getState().activeFolder).toBeNull()
        expect(useAppStore.getState().activeTag).toBeNull()
        expect(useAppStore.getState().activeCollection).toBeNull()
        expect(useAppStore.getState().smartFilter).toBeNull()
    })

    it('displays active filter banner when a folder is selected, and clear button resets it', () => {
        useAppStore.setState({ activeFolder: 'Dev' })

        render(
            <Sidebar
                bookmarks={mockBookmarks}
                availableFolders={mockFolders}
                availableTags={mockTags}
                collections={mockCollections}
            />
        )

        expect(screen.getAllByText('Dev').length).toBeGreaterThan(0)
        const clearBtn = screen.getByTitle('Filtreyi Temizle')
        expect(clearBtn).toBeInTheDocument()

        fireEvent.click(clearBtn)
        expect(useAppStore.getState().activeFolder).toBeNull()
    })

    it('filters folders, tags, and collections based on inline search input', () => {
        render(
            <Sidebar
                bookmarks={mockBookmarks}
                availableFolders={mockFolders}
                availableTags={mockTags}
                collections={mockCollections}
            />
        )

        const searchInput = screen.getByPlaceholderText('Klasör, etiket ara...')
        fireEvent.change(searchInput, { target: { value: 'Work' } })

        // Collections should match 'Work Articles'
        expect(screen.getByText('Work Articles')).toBeInTheDocument()
        // Dev folder should be filtered out
        expect(screen.queryByText('Dev')).not.toBeInTheDocument()
    })

    it('closes mobile drawer when X button is clicked', () => {
        render(
            <Sidebar
                bookmarks={mockBookmarks}
                availableFolders={mockFolders}
                availableTags={mockTags}
                collections={mockCollections}
            />
        )

        const closeButtons = screen.getAllByLabelText('common.close')
        fireEvent.click(closeButtons[0])

        expect(useAppStore.getState().isSidebarOpen).toBe(false)
    })
})
