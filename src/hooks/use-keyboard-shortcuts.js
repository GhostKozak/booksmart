import { useEffect } from 'react'

export function useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    bookmarks,
    handleBatchDelete,
    undo,
    redo,
    searchInputRef,
    setIsShortcutsOpen
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)

            // "/" to focus search
            if (e.key === '/' && !isInput) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }

            // "Delete" to delete selected
            if (e.key === 'Delete' && selectedIds.size > 0 && !isInput) {
                e.preventDefault()
                handleBatchDelete()
            }

            // "Ctrl+A" to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInput) {
                e.preventDefault()
                setSelectedIds(new Set(bookmarks.map(b => b.id)))
            }

            // Ctrl+Z to undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInput) {
                e.preventDefault()
                undo()
            }

            // Ctrl+Y or Ctrl+Shift+Z to redo
            if (!isInput && ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))))) {
                e.preventDefault()
                redo()
            }

            // Escape to clear selection
            if (e.key === 'Escape' && selectedIds.size > 0 && !isInput) {
                e.preventDefault()
                setSelectedIds(new Set())
            }

            // "?" to show shortcuts
            if (e.key === '?' && !isInput) {
                e.preventDefault()
                setIsShortcutsOpen(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIds, bookmarks, handleBatchDelete, undo, redo, searchInputRef, setSelectedIds, setIsShortcutsOpen])
}
