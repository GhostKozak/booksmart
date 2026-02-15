import { SimpleModal } from '../ui/SimpleModal'
import { useTranslation } from 'react-i18next'

export function ShortcutsModal({ isOpen, onClose }) {
    const { t } = useTranslation()

    const shortcuts = [
        { keys: '/', desc: t('modals.shortcuts.focusSearch') },
        { keys: 'Ctrl + A', desc: t('modals.shortcuts.selectAll') },
        { keys: 'Delete', desc: t('modals.shortcuts.deleteSelected') },
        { keys: 'Escape', desc: t('modals.shortcuts.clearSelection') },
        { keys: 'Ctrl + Z', desc: t('modals.shortcuts.undo') },
        { keys: 'Ctrl + Y', desc: t('modals.shortcuts.redo') },
        { keys: 'Ctrl + Shift + Z', desc: t('modals.shortcuts.redoAlt') },
        { keys: '?', desc: t('modals.shortcuts.help') },
    ]

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.shortcuts.title')}
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
