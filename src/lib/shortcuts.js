export const DEFAULT_SHORTCUTS = {
    commandPalette: {
        id: 'commandPalette',
        key: 'k',
        ctrl: true,
        shift: false,
        alt: false,
        display: 'Ctrl + K',
        labelKey: 'modals.shortcuts.commandPalette'
    },
    focusSearch: {
        id: 'focusSearch',
        key: '/',
        ctrl: false,
        shift: false,
        alt: false,
        display: '/',
        labelKey: 'modals.shortcuts.focusSearch'
    },
    selectAll: {
        id: 'selectAll',
        key: 'a',
        ctrl: true,
        shift: false,
        alt: false,
        display: 'Ctrl + A',
        labelKey: 'modals.shortcuts.selectAll'
    },
    deleteSelected: {
        id: 'deleteSelected',
        key: 'Delete',
        ctrl: false,
        shift: false,
        alt: false,
        display: 'Delete',
        labelKey: 'modals.shortcuts.deleteSelected'
    },
    clearSelection: {
        id: 'clearSelection',
        key: 'Escape',
        ctrl: false,
        shift: false,
        alt: false,
        display: 'Escape',
        labelKey: 'modals.shortcuts.clearSelection'
    },
    undo: {
        id: 'undo',
        key: 'z',
        ctrl: true,
        shift: false,
        alt: false,
        display: 'Ctrl + Z',
        labelKey: 'modals.shortcuts.undo'
    },
    redo: {
        id: 'redo',
        key: 'y',
        ctrl: true,
        shift: false,
        alt: false,
        display: 'Ctrl + Y',
        labelKey: 'modals.shortcuts.redo'
    },
    help: {
        id: 'help',
        key: '?',
        ctrl: false,
        shift: false,
        alt: false,
        display: '?',
        labelKey: 'modals.shortcuts.help'
    }
}

const STORAGE_KEY = 'booksmart_custom_shortcuts'

export function getStoredShortcuts() {
    if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS }
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return { ...DEFAULT_SHORTCUTS }
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SHORTCUTS, ...parsed }
    } catch {
        return { ...DEFAULT_SHORTCUTS }
    }
}

export function saveStoredShortcuts(shortcuts) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
    } catch {
        // Ignore storage errors
    }
}

export function resetStoredShortcuts() {
    if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS }
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // Ignore
    }
    return { ...DEFAULT_SHORTCUTS }
}

export function formatKeyCombination({ key, ctrl, shift, alt }) {
    const parts = []
    if (ctrl) parts.push('Ctrl')
    if (alt) parts.push('Alt')
    if (shift) parts.push('Shift')
    
    let displayKey = key
    if (key === ' ') displayKey = 'Space'
    else if (key && key.length === 1) displayKey = key.toUpperCase()
    
    parts.push(displayKey)
    return parts.join(' + ')
}

export function matchesShortcut(e, shortcut) {
    if (!shortcut) return false

    const matchesCtrl = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)
    const matchesShift = shortcut.shift ? e.shiftKey : !e.shiftKey
    const matchesAlt = shortcut.alt ? e.altKey : !e.altKey

    const targetKey = (shortcut.key || '').toLowerCase()
    const pressedKey = (e.key || '').toLowerCase()

    return matchesCtrl && matchesShift && matchesAlt && targetKey === pressedKey
}
