import { useState } from 'react'
import { Library, Plus, Minus } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function CollectionBulkPopover({ collections, onAddToCollection, onRemoveFromCollection, isOpen, onToggle, isVertical }) {
    const { t } = useTranslation()
    const [mode, setMode] = useState('add') // 'add' | 'remove'

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    isVertical
                        ? "justify-start gap-2 h-9 px-3 rounded-xl w-full border-violet-500/30 text-violet-600 dark:text-violet-400"
                        : "rounded-full gap-2 h-8 px-4 border-violet-500/30 text-violet-600 dark:text-violet-400"
                )}
                onClick={onToggle}
            >
                <Library className={cn("shrink-0", isVertical ? "h-4 w-4" : "h-3.5 w-3.5")} />
                <span>{t('actionbar.collection.button')}</span>
            </Button>

            {isOpen && (
                <div className={cn(
                    "absolute z-50 bg-popover border rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150",
                    isVertical
                        ? "left-0 right-0 bottom-full mb-2"
                        : "bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[220px]"
                )}>
                    {/* Mode toggle tabs */}
                    <div className="flex border-b">
                        <button
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors rounded-tl-xl",
                                mode === 'add'
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => setMode('add')}
                        >
                            <Plus className="h-3 w-3" />
                            {t('actionbar.collection.add')}
                        </button>
                        <button
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors rounded-tr-xl",
                                mode === 'remove'
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-b-2 border-red-500"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                            onClick={() => setMode('remove')}
                        >
                            <Minus className="h-3 w-3" />
                            {t('actionbar.collection.remove')}
                        </button>
                    </div>

                    {/* Collection list */}
                    <div className="p-1.5">
                        {collections.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2 px-3">
                                {t('collections.empty')}
                            </p>
                        ) : (
                            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                                {collections.map(collection => (
                                    <button
                                        key={collection.id}
                                        className={cn(
                                            "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left",
                                            mode === 'add'
                                                ? "hover:bg-emerald-500/10"
                                                : "hover:bg-red-500/10"
                                        )}
                                        onClick={() => {
                                            if (mode === 'add') {
                                                onAddToCollection(collection.id)
                                            } else {
                                                onRemoveFromCollection(collection.id)
                                            }
                                        }}
                                    >
                                        <span
                                            className="w-6 h-6 flex items-center justify-center rounded text-sm"
                                            style={{ backgroundColor: `${collection.color}20` }}
                                        >
                                            {collection.icon}
                                        </span>
                                        <span className="truncate font-medium flex-1">{collection.name}</span>
                                        {mode === 'add' ? (
                                            <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Minus className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
