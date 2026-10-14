import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { LinkTooltip } from './LinkTooltip'
import { Button } from '../ui/button'
import { Pencil, Eye, BookOpen, GitMerge, GripVertical } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

export const BookmarkTreeLeaf = ({
    bookmark,
    depth,
    selectedIds,
    toggleSelection,
    onPreview,
    onEdit,
    onMergeDuplicate,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    t
}) => {
    const isSelected = selectedIds.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `bookmark:${bookmark.id}`,
        data: {
            type: 'bookmark',
            id: bookmark.id,
            bookmark
        }
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex items-center justify-between py-1.5 px-3 border-b border-muted/10 hover:bg-muted/40 transition-colors group/leaf",
                isSelected && "bg-primary/5 border-primary/20",
                isDragging && "opacity-40 bg-muted/60"
            )}
            style={{ paddingLeft: `${depth * 16 + 28}px` }}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground group-hover/leaf:text-muted-foreground/60 transition-colors p-0.5 -ml-1 rounded"
                    title={t('bookmarks.tree.dragToMove', 'Klasöre taşımak için sürükleyin')}
                    aria-label={t('bookmarks.tree.dragToMove', 'Klasöre taşımak için sürükleyin')}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </div>

                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="h-3.5 w-3.5 shrink-0"
                    aria-label={t('common.select')}
                />
                <LinkTooltip bookmark={bookmark}>
                    <div className="flex items-center gap-1.5 min-w-0 cursor-pointer flex-1" onClick={() => onPreview(bookmark)}>
                        <Favicon url={bookmark.url} className="w-3.5 h-3.5 shrink-0" />
                        <span className={cn(
                            "text-sm truncate font-medium hover:text-primary transition-colors",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 line-through"
                        )} title={bookmark.title}>
                            {bookmark.title || t('common.untitled')}
                        </span>
                    </div>
                </LinkTooltip>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-4">
                <BookmarkHealthStatus
                    url={bookmark.url}
                    status={healthStatus}
                    onToggleIgnore={toggleIgnoreUrl}
                />
                <div className="flex items-center md:opacity-0 group-hover/leaf:opacity-100 transition-opacity gap-0.5">
                    {(bookmark.isDuplicate || bookmark.hasDuplicate) && onMergeDuplicate && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-primary hover:bg-primary/10 cursor-pointer"
                            onClick={() => onMergeDuplicate(bookmark)}
                            title={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                            aria-label={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                        >
                            <GitMerge className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-primary/10 hover:text-primary cursor-pointer"
                        onClick={() => onEdit?.(bookmark)}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-primary/10 hover:text-primary cursor-pointer"
                        onClick={() => onPreview(bookmark)}
                        title={t('preview.open')}
                        aria-label={t('preview.open')}
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-primary/10 hover:text-primary cursor-pointer"
                        onClick={() => useAppStore.getState().openReaderMode(bookmark)}
                        title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                        aria-label={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
