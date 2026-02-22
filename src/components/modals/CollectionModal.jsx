import { useState, useEffect } from 'react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

const PRESET_COLORS = [
    '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#f97316', '#6366f1', '#14b8a6',
    '#84cc16', '#a855f7'
]

const PRESET_ICONS = [
    '📚', '⭐', '💼', '🎯', '🔖', '💡', '🎨', '🛒',
    '📰', '🎮', '🏠', '✈️', '🎵', '📷', '🧪', '🍕',
    '📖', '🎬', '🏋️', '🎓', '💻', '🔬', '🌍', '❤️'
]

export function CollectionModal({ isOpen, onClose, onSave, editingCollection }) {
    const { t } = useTranslation()
    const [name, setName] = useState('')
    const [icon, setIcon] = useState('📚')
    const [color, setColor] = useState('#8b5cf6')

    useEffect(() => {
        if (editingCollection) {
            setName(editingCollection.name || '')
            setIcon(editingCollection.icon || '📚')
            setColor(editingCollection.color || '#8b5cf6')
        } else {
            setName('')
            setIcon('📚')
            setColor('#8b5cf6')
        }
    }, [editingCollection, isOpen])

    const handleSave = () => {
        if (!name.trim()) return
        onSave({
            id: editingCollection?.id,
            name: name.trim(),
            icon,
            color
        })
        onClose()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSave()
        }
    }

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingCollection ? t('collections.editTitle') : t('collections.newTitle')}
        >
            <div className="space-y-5">
                {/* Preview */}
                <div className="flex items-center justify-center">
                    <div
                        className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 shadow-sm transition-all"
                        style={{ borderColor: color + '60', backgroundColor: color + '10' }}
                    >
                        <span className="text-2xl">{icon}</span>
                        <span className="font-semibold text-lg">
                            {name || t('collections.namePlaceholder')}
                        </span>
                    </div>
                </div>

                {/* Name Input */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('collections.nameLabel')}</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('collections.namePlaceholder')}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="h-10"
                    />
                </div>

                {/* Icon Picker */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('collections.iconLabel')}</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg max-h-[120px] overflow-y-auto">
                        {PRESET_ICONS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setIcon(emoji)}
                                className={cn(
                                    "w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110",
                                    icon === emoji
                                        ? "bg-primary/20 ring-2 ring-primary shadow-sm scale-110"
                                        : "hover:bg-muted"
                                )}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t('collections.colorLabel')}</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={cn(
                                    "w-7 h-7 rounded-full transition-all hover:scale-110 border-2",
                                    color === c
                                        ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                                        : "border-transparent hover:border-foreground/20"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="gap-2"
                        style={{ backgroundColor: color }}
                    >
                        <span>{icon}</span>
                        {editingCollection ? t('common.save') : t('common.create')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
