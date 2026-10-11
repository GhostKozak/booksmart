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
})
