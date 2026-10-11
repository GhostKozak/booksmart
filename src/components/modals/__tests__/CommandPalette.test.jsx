import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CommandPalette } from '../CommandPalette'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultValue) => (typeof defaultValue === 'string' ? defaultValue : key)
    })
}))

describe('CommandPalette', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        setViewMode: vi.fn(),
        toggleAll: vi.fn(),
        bookmarks: [{ id: '1', title: 'Example', url: 'https://example.com' }],
        selectedIds: new Set(),
        setSelectedIds: vi.fn(),
        handleBatchDelete: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: false,
        canRedo: false,
        mergeDuplicates: vi.fn(),
        removeDuplicates: vi.fn(),
        duplicateCount: 0,
        cleanAllUrls: vi.fn(),
        cleanableCount: 0,
        checkAllLinks: vi.fn(),
        isCheckingLinks: false,
        openExportModal: vi.fn(),
        handleAutoCategorize: vi.fn(),
        handleMagicSort: vi.fn(),
        handleFixTitles: vi.fn(),
        handleFindSmartDuplicates: vi.fn(),
        setTheme: vi.fn(),
        setIsShortcutsOpen: vi.fn(),
        openSettings: vi.fn(),
        clearAll: vi.fn(),
        loadDemoData: vi.fn()
    }

    it('renders command palette when open', () => {
        render(<CommandPalette {...defaultProps} />)
        expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument()
        expect(screen.getByText('List View')).toBeInTheDocument()
    })

    it('filters commands as user types', () => {
        render(<CommandPalette {...defaultProps} />)
        const input = screen.getByPlaceholderText('Type a command or search...')
        fireEvent.change(input, { target: { value: 'theme' } })

        expect(screen.getByText('Light Theme')).toBeInTheDocument()
        expect(screen.getByText('Dark Theme')).toBeInTheDocument()
        expect(screen.queryByText('List View')).not.toBeInTheDocument()
    })

    it('executes a command when clicked and closes palette', () => {
        render(<CommandPalette {...defaultProps} />)
        const listViewBtn = screen.getByText('List View').closest('button')
        fireEvent.click(listViewBtn)

        expect(defaultProps.setViewMode).toHaveBeenCalledWith('list')
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('handles keyboard navigation and Enter key', () => {
        render(<CommandPalette {...defaultProps} />)
        const dialog = screen.getByRole('dialog')
        fireEvent.keyDown(dialog, { key: 'ArrowDown' })
        fireEvent.keyDown(dialog, { key: 'Enter' })

        expect(defaultProps.onClose).toHaveBeenCalled()
    })
})
