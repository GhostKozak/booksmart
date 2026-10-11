import { useEffect } from 'react'
import { getStoredShortcuts, matchesShortcut } from '../lib/shortcuts'

export function useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    bookmarks,
    handleBatchDelete,
    undo,
    redo,
    searchInputRef,
    setIsShortcutsOpen,
    setIsCommandPaletteOpen
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const activeEl = document.activeElement
            const isInput = activeEl && (
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) ||
                activeEl.isContentEditable ||
                activeEl.getAttribute('contenteditable') === 'true'
            )
            const isModalOpen = Boolean(
                document.querySelector('[role="dialog"]') ||
                document.querySelector('[aria-modal="true"]')
            )
            const shortcuts = getStoredShortcuts()

            // Command Palette (Ctrl+K / Cmd+K) - Works even inside inputs
            if (matchesShortcut(e, shortcuts.commandPalette)) {
                e.preventDefault()
                setIsCommandPaletteOpen?.((prev) => !prev)
                return
            }

            // If an input is focused or a modal dialog is open, do not trigger background shortcuts
            if (isInput || isModalOpen) return

            // Focus search
            if (matchesShortcut(e, shortcuts.focusSearch)) {
                e.preventDefault()
                searchInputRef.current?.focus()
                return
            }

            // Delete selected
            if (matchesShortcut(e, shortcuts.deleteSelected) && selectedIds.size > 0) {
                e.preventDefault()
                handleBatchDelete?.()
                return
            }

            // Select all
            if (matchesShortcut(e, shortcuts.selectAll)) {
                e.preventDefault()
                setSelectedIds?.(new Set(bookmarks.map(b => b.id)))
                return
            }

            // Undo
            if (matchesShortcut(e, shortcuts.undo)) {
                e.preventDefault()
                undo?.()
                return
            }

            // Redo
            if (matchesShortcut(e, shortcuts.redo) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
                e.preventDefault()
                redo?.()
                return
            }

            // Clear selection
            if (matchesShortcut(e, shortcuts.clearSelection) && selectedIds.size > 0) {
                e.preventDefault()
                setSelectedIds?.(new Set())
                return
            }

            // Help / Shortcuts
            if (matchesShortcut(e, shortcuts.help)) {
                e.preventDefault()
                setIsShortcutsOpen?.(true)
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [
        selectedIds,
        bookmarks,
        handleBatchDelete,
        undo,
        redo,
        searchInputRef,
        setSelectedIds,
        setIsShortcutsOpen,
        setIsCommandPaletteOpen
    ])
}
