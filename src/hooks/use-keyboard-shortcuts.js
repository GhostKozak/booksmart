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
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
            const shortcuts = getStoredShortcuts()

            // Command Palette (Ctrl+K / Cmd+K) - Works even inside input
            if (matchesShortcut(e, shortcuts.commandPalette)) {
                e.preventDefault()
                setIsCommandPaletteOpen?.((prev) => !prev)
                return
            }

            // If an input is focused, don't execute single-key shortcuts
            if (isInput) return

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
