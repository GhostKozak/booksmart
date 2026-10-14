import { memo } from 'react'
import { BookmarkRowDesktop } from './bookmark/BookmarkRowDesktop'
import { BookmarkRowMobile } from './bookmark/BookmarkRowMobile'
import { cn } from '../lib/utils'

export const BookmarkRow = memo(({
    bookmark,
    selectedIds,
    toggleSelection,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    onMergeDuplicate,
    className,
    availableFolders = [],
    availableTags = [],
    allCollections = [],
    onRemoveFromCollection,
    compact = false
}) => {
    if (!bookmark) return null

    const isSelected = selectedIds?.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

    let rowBgClass = ""
    let borderClass = "border-b border-border/60"

    if (bookmark.isDuplicate) {
        rowBgClass = isSelected
            ? "bg-red-500/20 dark:bg-red-900/40 border-l-3 border-l-red-500"
            : "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-l-3 border-l-red-500/70"
        borderClass = "border-b border-red-500/30"
    } else if (bookmark.hasDuplicate) {
        rowBgClass = isSelected
            ? "bg-yellow-500/20 dark:bg-yellow-900/40 border-l-3 border-l-yellow-500"
            : "bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border-l-3 border-l-yellow-500/70"
        borderClass = "border-b border-yellow-500/30"
    } else if (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') {
        rowBgClass = isSelected
            ? "bg-purple-500/10 dark:bg-purple-500/20 ring-1 ring-inset ring-purple-500/30 border-l-3 border-l-purple-500"
            : "bg-purple-500/5 dark:bg-purple-500/10 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 ring-1 ring-inset ring-purple-500/20 border-l-3 border-l-purple-500/60"
        borderClass = "border-b border-purple-500/20"
    } else if (bookmark.status === 'matched' || bookmark.status === 'conflict') {
        rowBgClass = isSelected
            ? "bg-emerald-500/20 dark:bg-emerald-500/20 border-l-3 border-l-emerald-500"
            : "bg-emerald-500/10 dark:bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 border-l-3 border-l-emerald-500/60"
        borderClass = "border-b border-emerald-500/20"
    } else if (isSelected) {
        rowBgClass = "bg-primary/5 hover:bg-primary/10 border-l-3 border-l-primary"
        borderClass = "border-b border-border/60"
    } else {
        rowBgClass = "hover:bg-muted/40 border-l-3 border-l-transparent"
        borderClass = "border-b border-border/60"
    }

    const commonProps = {
        bookmark,
        isSelected,
        healthStatus,
        toggleSelection,
        toggleIgnoreUrl,
        onPreview,
        onEdit,
        onMergeDuplicate,
        availableFolders,
        availableTags,
        allCollections,
        onRemoveFromCollection,
        compact
    }

    return (
        <div
            className={cn(
                borderClass,
                "transition-colors duration-150",
                compact
                    ? "flex flex-col p-2 gap-1.5 lg:p-0 lg:gap-0 lg:border-b"
                    : "flex flex-col p-3 gap-2.5 lg:p-0 lg:gap-0 lg:border-b",
                className,
                rowBgClass
            )}
        >
            <BookmarkRowDesktop {...commonProps} />
            <BookmarkRowMobile {...commonProps} />
        </div>
    )
}, (prevProps, nextProps) => {
    return (
        prevProps.index === nextProps.index &&
        prevProps.bookmark === nextProps.bookmark &&
        prevProps.selectedIds === nextProps.selectedIds &&
        prevProps.linkHealth === nextProps.linkHealth &&
        prevProps.availableTags === nextProps.availableTags &&
        prevProps.availableFolders === nextProps.availableFolders &&
        prevProps.allCollections === nextProps.allCollections &&
        prevProps.compact === nextProps.compact &&
        (prevProps.ignoredUrls?.has(prevProps.bookmark.url) === nextProps.ignoredUrls?.has(nextProps.bookmark.url))
    )
})

BookmarkRow.displayName = 'BookmarkRow'
