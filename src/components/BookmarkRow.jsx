import { memo } from 'react'
import { BookmarkRowDesktop } from './bookmark/BookmarkRowDesktop'
import { BookmarkRowMobile } from './bookmark/BookmarkRowMobile'
import { cn } from '../lib/utils'

export const BookmarkRow = memo(({ index, bookmark, selectedIds, toggleSelection, linkHealth, ignoredUrls, toggleIgnoreUrl, onPreview, className, availableFolders = [], availableTags = [], allCollections = [], onRemoveFromCollection }) => {
    if (!bookmark) return null

    const isSelected = selectedIds.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

    let rowBgClass = ""
    let borderClass = "border-b"

    if (bookmark.isDuplicate) {
        rowBgClass = isSelected ? "bg-red-500/20 dark:bg-red-900/40" : "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-900/20 dark:hover:bg-red-900/30"
        borderClass = "border-b border-red-500/30"
    } else if (bookmark.hasDuplicate) {
        rowBgClass = isSelected ? "bg-yellow-500/20 dark:bg-yellow-900/40" : "bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
        borderClass = "border-b border-yellow-500/30"
    } else if (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') {
        rowBgClass = isSelected
            ? "bg-purple-500/10 dark:bg-purple-500/20 ring-1 ring-inset ring-purple-500/30"
            : "bg-purple-500/5 dark:bg-purple-500/10 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 ring-1 ring-inset ring-purple-500/20"
        borderClass = "border-b border-purple-500/20"
    } else if (bookmark.status === 'matched' || bookmark.status === 'conflict') {
        rowBgClass = isSelected ? "bg-emerald-500/20 dark:bg-emerald-500/20" : "bg-emerald-500/10 dark:bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
    } else if (isSelected) {
        rowBgClass = "bg-primary/5"
    } else {
        rowBgClass = "hover:bg-muted/30"
    }

    const commonProps = {
        bookmark,
        isSelected,
        healthStatus,
        toggleSelection,
        toggleIgnoreUrl,
        onPreview,
        availableFolders,
        availableTags,
        allCollections,
        onRemoveFromCollection
    }

    return (
        <div
            style={{ animationDelay: `${(index || 0) * 50}ms` }}
            className={cn(
                borderClass,
                "transition-all duration-300",
                "flex flex-col p-3 gap-3",
                "lg:p-0 lg:gap-0 lg:border-b",
                "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300",
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
        (prevProps.ignoredUrls?.has(prevProps.bookmark.url) === nextProps.ignoredUrls?.has(nextProps.bookmark.url))
    )
})

BookmarkRow.displayName = 'BookmarkRow'
