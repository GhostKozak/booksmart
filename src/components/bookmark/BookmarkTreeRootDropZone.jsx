import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CornerDownLeft, FolderTree } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function BookmarkTreeRootDropZone({ activeDragItem }) {
    const { t } = useTranslation()
    const { setNodeRef, isOver } = useDroppable({
        id: 'drop:root',
        data: { type: 'root', path: null }
    })

    if (!activeDragItem) return null

    const isFolder = activeDragItem.type === 'folder'
    // If it's already a root folder (no ' > ' in path), unnesting to root is not needed
    const isAlreadyRoot = isFolder && !activeDragItem.path.includes(' > ')

    if (isAlreadyRoot) return null

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "mx-2 my-1.5 p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-between text-xs cursor-pointer animate-in fade-in duration-200",
                isOver
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-md scale-[1.01]"
                    : "border-border/80 bg-muted/30 hover:border-primary/50 text-muted-foreground"
            )}
        >
            <div className="flex items-center gap-2 min-w-0">
                <FolderTree className={cn("h-4 w-4 shrink-0", isOver ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate font-semibold">
                    {t('bookmarks.tree.dropToRoot', 'Ana Dizine Çıkar (Kök Seviye)')}
                </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 opacity-80">
                <CornerDownLeft className="h-3.5 w-3.5" />
                <span>{isOver ? t('bookmarks.tree.releaseToDrop', 'Buraya Bırak') : t('bookmarks.tree.rootLevel', 'Kök Dizin')}</span>
            </div>
        </div>
    )
}
