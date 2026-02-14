import { SimpleModal } from '../ui/SimpleModal'

export function ShortcutsModal({ isOpen, onClose }) {
    const shortcuts = [
        { keys: '/', desc: 'Focus search' },
        { keys: 'Ctrl + A', desc: 'Select all visible' },
        { keys: 'Delete', desc: 'Delete selected' },
        { keys: 'Escape', desc: 'Clear selection' },
        { keys: 'Ctrl + Z', desc: 'Undo' },
        { keys: 'Ctrl + Y', desc: 'Redo' },
        { keys: 'Ctrl + Shift + Z', desc: 'Redo (alt)' },
        { keys: '?', desc: 'Show this help' },
    ]

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title="Keyboard Shortcuts"
        >
            <div className="space-y-1">
                {shortcuts.map(s => (
                    <div key={s.keys} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-sm text-foreground">{s.desc}</span>
                        <div className="flex gap-1">
                            {s.keys.split(' + ').map((k, i) => (
                                <span key={i}>
                                    <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-muted border rounded-md shadow-sm">{k}</kbd>
                                    {i < s.keys.split(' + ').length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </SimpleModal>
    )
}
