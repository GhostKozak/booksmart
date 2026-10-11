import { useState, useEffect } from 'react'
import { SimpleModal } from '../ui/SimpleModal'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Keyboard, Check, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import {
    DEFAULT_SHORTCUTS,
    getStoredShortcuts,
    saveStoredShortcuts,
    resetStoredShortcuts,
    formatKeyCombination
} from '../../lib/shortcuts'

export function ShortcutsModal({ isOpen, onClose }) {
    const { t } = useTranslation()
    const [shortcuts, setShortcuts] = useState(() => getStoredShortcuts())
    const [recordingId, setRecordingId] = useState(null)
    const [conflictError, setConflictError] = useState(null)
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

    // Sync when opened
    if (prevIsOpen !== isOpen) {
        setPrevIsOpen(isOpen)
        if (isOpen) {
            setShortcuts(getStoredShortcuts())
            setRecordingId(null)
            setConflictError(null)
        }
    }

    // Key recording effect
    useEffect(() => {
        if (!recordingId) return

        const handleKeyDown = (e) => {
            e.preventDefault()
            e.stopPropagation()

            // Ignore standalone modifier presses
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                return
            }

            // Escape cancels recording
            if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                setRecordingId(null)
                setConflictError(null)
                return
            }

            const isCtrl = e.ctrlKey || e.metaKey
            const isShift = e.shiftKey
            const isAlt = e.altKey
            const key = e.key

            const display = formatKeyCombination({ key, ctrl: isCtrl, shift: isShift, alt: isAlt })

            // Check if key combo is already used by another action
            const duplicateEntry = Object.values(shortcuts).find(
                s => s.id !== recordingId && s.display.toLowerCase() === display.toLowerCase()
            )

            if (duplicateEntry) {
                setConflictError(t('modals.shortcuts.conflict', {
                    key: display,
                    action: t(duplicateEntry.labelKey)
                }) || `Shortcut "${display}" is already assigned to "${t(duplicateEntry.labelKey)}"`)
                return
            }

            const updated = {
                ...shortcuts,
                [recordingId]: {
                    ...shortcuts[recordingId],
                    key,
                    ctrl: isCtrl,
                    shift: isShift,
                    alt: isAlt,
                    display
                }
            }

            setShortcuts(updated)
            saveStoredShortcuts(updated)
            setRecordingId(null)
            setConflictError(null)
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [recordingId, shortcuts, t])

    const handleReset = () => {
        const defaults = resetStoredShortcuts()
        setShortcuts(defaults)
        setRecordingId(null)
        setConflictError(null)
    }

    const shortcutList = [
        { id: 'commandPalette', ...shortcuts.commandPalette, desc: t('modals.shortcuts.commandPalette', 'Command Palette') },
        { id: 'focusSearch', ...shortcuts.focusSearch, desc: t('modals.shortcuts.focusSearch', 'Focus Search') },
        { id: 'selectAll', ...shortcuts.selectAll, desc: t('modals.shortcuts.selectAll', 'Select All') },
        { id: 'deleteSelected', ...shortcuts.deleteSelected, desc: t('modals.shortcuts.deleteSelected', 'Delete Selected') },
        { id: 'clearSelection', ...shortcuts.clearSelection, desc: t('modals.shortcuts.clearSelection', 'Clear Selection') },
        { id: 'undo', ...shortcuts.undo, desc: t('modals.shortcuts.undo', 'Undo') },
        { id: 'redo', ...shortcuts.redo, desc: t('modals.shortcuts.redo', 'Redo') },
        { id: 'help', ...shortcuts.help, desc: t('modals.shortcuts.help', 'Keyboard Shortcuts') }
    ]

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={() => {
                setRecordingId(null)
                onClose()
            }}
            title={t('modals.shortcuts.title', 'Keyboard Shortcuts')}
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b">
                    <span className="flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5" />
                        {t('modals.shortcuts.customizeHint', 'Click any shortcut badge to record a new key combination')}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        title={t('modals.shortcuts.resetDefaults', 'Reset to Defaults')}
                    >
                        <RotateCcw className="w-3 h-3" />
                        {t('modals.shortcuts.reset', 'Reset')}
                    </Button>
                </div>

                {conflictError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{conflictError}</span>
                    </div>
                )}

                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                    {shortcutList.map(s => {
                        const isRecording = recordingId === s.id
                        return (
                            <div
                                key={s.id}
                                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/40"
                            >
                                <span className="text-sm text-foreground font-medium">{s.desc}</span>
                                <div>
                                    {isRecording ? (
                                        <button
                                            type="button"
                                            className="px-3 py-1 text-xs font-mono font-bold bg-primary text-primary-foreground rounded-lg shadow-sm animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background"
                                        >
                                            {t('modals.shortcuts.pressKey', 'Press new keys... (Esc to cancel)')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConflictError(null)
                                                setRecordingId(s.id)
                                            }}
                                            className="group flex gap-1 items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                                            title={t('modals.shortcuts.clickToEdit', 'Click to change')}
                                        >
                                            {s.display.split(' + ').map((k, i) => (
                                                <span key={i} className="flex items-center">
                                                    <kbd className="px-2 py-0.5 text-xs font-mono font-semibold bg-muted border rounded-md shadow-xs group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                                        {k}
                                                    </kbd>
                                                    {i < s.display.split(' + ').length - 1 && (
                                                        <span className="text-muted-foreground mx-0.5 text-xs">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </SimpleModal>
    )
}
