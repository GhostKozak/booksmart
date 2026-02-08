import { memo } from 'react'
import { Check, XCircle, Layers, Loader2, CheckCircle2, HelpCircle } from 'lucide-react'
import { Checkbox } from './ui/checkbox'
import { Favicon } from './Favicon'
import { cn } from '../lib/utils'

export const BookmarkRow = memo(({ bookmark, selectedIds, toggleSelection, linkHealth, className }) => {
    // If no bookmark, return null (safety)
    if (!bookmark) return null

    const isSelected = selectedIds.has(bookmark.id)

    // Row styling logic
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

    return (
        <div
            className={cn(
                className,
                "border-b text-sm transition-colors duration-200 py-2",
                rowBgClass
            )}
        >
            {/* Checkbox */}
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelection(bookmark.id)}
                    className="bg-card"
                />
            </div>

            {/* Status Icon */}
            <div className="flex justify-center">
                {bookmark.isDuplicate ? (
                    <div className="flex justify-center" title="Duplicate (Will be removed)">
                        <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <XCircle className="h-3.5 w-3.5" />
                        </div>
                    </div>
                ) : bookmark.hasDuplicate ? (
                    <div className="flex justify-center" title="Original (Has duplicates)">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                            <Layers className="h-3.5 w-3.5" />
                        </div>
                    </div>
                ) : bookmark.status === 'matched' ? (
                    <div className="flex justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>

            {/* Health Icon */}
            <div className="flex justify-center">
                {linkHealth[bookmark.url] === 'checking' ? (
                    <div className="flex justify-center" title="Checking...">
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    </div>
                ) : linkHealth[bookmark.url] === 'alive' ? (
                    <div className="flex justify-center" title="Alive">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                ) : linkHealth[bookmark.url] === 'dead' ? (
                    <div className="flex justify-center" title="Network Error (Likely Dead)">
                        <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                ) : (
                    <div className="flex justify-center" title="Unknown">
                        <HelpCircle className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                )}
            </div>

            {/* Title / URL */}
            <div className="flex flex-col min-w-0 pr-4">
                <div className="flex items-center gap-2 min-w-0">
                    <Favicon url={bookmark.url} className="w-4 h-4 flex-shrink-0" />
                    <span className={cn(
                        "font-medium truncate",
                        bookmark.status === 'matched' && "text-emerald-700 dark:text-emerald-300"
                    )} title={bookmark.title}>{bookmark.title}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate" title={bookmark.url}>{bookmark.url}</span>
                {bookmark.tags && bookmark.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {bookmark.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {(bookmark.isDuplicate || bookmark.hasDuplicate) && bookmark.otherLocations.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        <span>Duplicate in: {bookmark.otherLocations.join(', ')}</span>
                    </div>
                )}
            </div>

            {/* Original Folder */}
            <div className="px-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground border truncate max-w-full">
                    {bookmark.originalFolder}
                </span>
            </div>

            {/* New Folder */}
            <div className="px-2">
                <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-md text-xs border font-medium truncate max-w-full",
                    bookmark.status === 'matched'
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-transparent"
                )}>
                    {bookmark.newFolder}
                </span>
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // Custom comparison for performance optimization
    // Only re-render if bookmark properties relevant to display change
    // or selection state changes
    return (
        prevProps.bookmark === nextProps.bookmark &&
        prevProps.selectedIds === nextProps.selectedIds &&
        prevProps.linkHealth === nextProps.linkHealth
    )
})

BookmarkRow.displayName = 'BookmarkRow'
