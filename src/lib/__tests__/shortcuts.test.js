import { describe, it, expect, beforeEach } from 'vitest'
import {
    DEFAULT_SHORTCUTS,
    getStoredShortcuts,
    saveStoredShortcuts,
    resetStoredShortcuts,
    formatKeyCombination,
    matchesShortcut
} from '../shortcuts'

describe('shortcuts helper', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('should return default shortcuts when storage is empty', () => {
        const shortcuts = getStoredShortcuts()
        expect(shortcuts.commandPalette.key).toBe('k')
        expect(shortcuts.commandPalette.ctrl).toBe(true)
    })

    it('should save and retrieve custom shortcuts', () => {
        const updated = {
            ...DEFAULT_SHORTCUTS,
            commandPalette: {
                ...DEFAULT_SHORTCUTS.commandPalette,
                key: 'p',
                display: 'Ctrl + P'
            }
        }
        saveStoredShortcuts(updated)
        const retrieved = getStoredShortcuts()
        expect(retrieved.commandPalette.key).toBe('p')
        expect(retrieved.commandPalette.display).toBe('Ctrl + P')
    })

    it('should reset shortcuts to defaults', () => {
        saveStoredShortcuts({ test: 123 })
        const reset = resetStoredShortcuts()
        expect(reset.commandPalette.key).toBe('k')
        expect(localStorage.getItem('booksmart_custom_shortcuts')).toBeNull()
    })

    it('should format key combinations correctly', () => {
        expect(formatKeyCombination({ key: 'k', ctrl: true, shift: false, alt: false })).toBe('Ctrl + K')
        expect(formatKeyCombination({ key: 'p', ctrl: true, shift: true, alt: true })).toBe('Ctrl + Alt + Shift + P')
        expect(formatKeyCombination({ key: 'Delete', ctrl: false, shift: false, alt: false })).toBe('Delete')
    })

    it('should match keyboard event accurately', () => {
        const shortcut = { key: 'k', ctrl: true, shift: false, alt: false }
        expect(matchesShortcut({ key: 'k', ctrlKey: true, shiftKey: false, altKey: false }, shortcut)).toBe(true)
        expect(matchesShortcut({ key: 'k', metaKey: true, shiftKey: false, altKey: false }, shortcut)).toBe(true) // Cmd on Mac
        expect(matchesShortcut({ key: 'k', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, shortcut)).toBe(false)
        expect(matchesShortcut({ key: 'z', ctrlKey: true, shiftKey: false, altKey: false }, shortcut)).toBe(false)
    })

    it('should match symbols like ? and / when typed with Shift on various keyboard layouts', () => {
        const helpShortcut = DEFAULT_SHORTCUTS.help // key: '?', shift: false
        expect(matchesShortcut({ key: '?', ctrlKey: false, metaKey: false, shiftKey: true, altKey: false }, helpShortcut)).toBe(true)

        const searchShortcut = DEFAULT_SHORTCUTS.focusSearch // key: '/', shift: false
        // Turkish Q: Shift+7 produces '/' with shiftKey: true
        expect(matchesShortcut({ key: '/', ctrlKey: false, metaKey: false, shiftKey: true, altKey: false }, searchShortcut)).toBe(true)
        // Standard US: '/' with shiftKey: false
        expect(matchesShortcut({ key: '/', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, searchShortcut)).toBe(true)

        // Letters with unintended Shift should still not match when shortcut.shift is false
        const cmdShortcut = { key: 'k', ctrl: true, shift: false, alt: false }
        expect(matchesShortcut({ key: 'k', ctrlKey: true, shiftKey: true, altKey: false }, cmdShortcut)).toBe(false)
    })
})
