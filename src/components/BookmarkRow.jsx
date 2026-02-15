import { memo } from 'react'
import { BookmarkRowDesktop } from './bookmark/BookmarkRowDesktop'
import { BookmarkRowMobile } from './bookmark/BookmarkRowMobile'
import { cn } from '../lib/utils'

export const BookmarkRow = memo(({ bookmark, selectedIds, toggleSelection, linkHealth, ignoredUrls, toggleIgnoreUrl, className, availableFolders = [], availableTags = [] }) => {
    if (!bookmark) return null

    const isSelected = selectedIds.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

    let rowBgClass = ""
    if (isSelected) {
        rowBgClass = "bg-primary/5"
    } else if (bookmark.isDuplicate) {
        rowBgClass = "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-900/20 dark:hover:bg-red-900/30"
    } else if (bookmark.hasDuplicate) {
        rowBgClass = "bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
    } else if (bookmark.status === 'matched') {
        rowBgClass = "bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
    } else {
        rowBgClass = "hover:bg-muted/30"
    }

    const commonProps = {
        bookmark,
        isSelected,
        healthStatus,
        toggleSelection,
        toggleIgnoreUrl,
        availableFolders,
        availableTags
    }

    return (
        <div
            className={cn(
                className,
                "border-b transition-colors duration-200",
                "flex flex-col p-3 gap-3",
                "lg:p-0 lg:gap-0 lg:border-b",
                rowBgClass
            )}
        >
            <BookmarkRowDesktop {...commonProps} />
            <BookmarkRowMobile {...commonProps} />
        </div>
    )
}, (prevProps, nextProps) => {
    return (
        prevProps.bookmark === nextProps.bookmark &&
        prevProps.selectedIds === nextProps.selectedIds &&
        prevProps.linkHealth === nextProps.linkHealth &&
        prevProps.availableTags === nextProps.availableTags &&
        prevProps.availableFolders === nextProps.availableFolders &&
        (prevProps.ignoredUrls?.has(prevProps.bookmark.url) === nextProps.ignoredUrls?.has(nextProps.bookmark.url))
    )
})

BookmarkRow.displayName = 'BookmarkRow'
