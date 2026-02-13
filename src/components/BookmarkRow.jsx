import { memo } from 'react'
import { Check, XCircle, Layers, Loader2, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck, ArrowRight, History as HistoryIcon } from 'lucide-react'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Favicon } from './Favicon'
import { cn, getRelativeTime } from '../lib/utils'

export const BookmarkRow = memo(({ bookmark, selectedIds, toggleSelection, linkHealth, ignoredUrls, toggleIgnoreUrl, className }) => {
    // If no bookmark, return null (safety)
    if (!bookmark) return null

    const isSelected = selectedIds.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

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
                "border-b transition-colors duration-200",
                "flex flex-col p-3 gap-3", // Mobile: Card-like flex column
                "lg:p-0 lg:gap-0 lg:border-b", // Desktop: Reset padding/gap, keep border
                rowBgClass
            )}
        >
            {/* --- DESKTOP VIEW (Hidden on Mobile) --- */}
            {/* Note: We use 'display: contents' or strictly follow the grid columns from parent */}
            <div className="hidden lg:contents">
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
                <div className="flex justify-center items-center gap-1">
                    {healthStatus === 'checking' ? (
                        <div className="flex justify-center" title="Checking...">
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        </div>
                    ) : healthStatus === 'alive' ? (
                        <div className="flex justify-center" title="Alive">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                    ) : healthStatus === 'dead' ? (
                        <div className="flex items-center gap-1 group">
                            <div className="flex justify-center" title="Network Error (Likely Dead)">
                                <XCircle className="h-4 w-4 text-red-500" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://web.archive.org/web/*/${bookmark.url}`, '_blank');
                                }}
                                title="Search in Archive (Wayback Machine)"
                            >
                                <HistoryIcon className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIgnoreUrl(bookmark.url);
                                }}
                                title="Ignore Error (Whitelist)"
                            >
                                <ShieldAlert className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </Button>
                        </div>
                    ) : healthStatus === 'ignored' ? (
                        <div className="flex items-center gap-1 group">
                            <div className="flex justify-center" title="Ignored (Whitelisted)">
                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIgnoreUrl(bookmark.url);
                                }}
                                title="Un-ignore"
                            >
                                <XCircle className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex justify-center" title="Unknown">
                            <HelpCircle className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                    )}
                </div>

                {/* Title / URL */}
                <div className="flex flex-col min-w-0 pr-4 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Favicon url={bookmark.url} className="w-4 h-4 flex-shrink-0" />
                        <span className={cn(
                            "font-medium truncate",
                            bookmark.status === 'matched' && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                        )} title={bookmark.title}>{bookmark.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate" title={bookmark.url}>{bookmark.url}</span>
                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                            {bookmark.tags.map(tag => {
                                const isRuleTag = bookmark.ruleTags?.includes(tag);
                                return (
                                    <span key={tag} className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                        isRuleTag
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    )}>
                                        #{tag}
                                    </span>
                                )
                            })}
                        </div>
                    )}

                    {bookmark.addDate && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                            <span>Added {getRelativeTime(bookmark.addDate)}</span>
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

            {/* --- MOBILE CARD VIEW (Shown on Mobile) --- */}
            <div className="lg:hidden flex flex-col gap-2">
                {/* Row 1: Checkbox, Icon, Title */}
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelection(bookmark.id)}
                        className="mt-1 bg-card shrink-0"
                    />

                    <Favicon url={bookmark.url} className="w-5 h-5 mt-0.5 shrink-0" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <span className={cn(
                                "font-medium text-sm break-words leading-snug",
                                bookmark.status === 'matched' && "text-emerald-700 dark:text-emerald-300",
                                healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                            )}>{bookmark.title}</span>

                            {/* Status Icons Mini */}
                            <div className="flex items-center gap-1 shrink-0">
                                {bookmark.isDuplicate && <XCircle className="h-4 w-4 text-red-500" />}
                                {bookmark.hasDuplicate && <Layers className="h-4 w-4 text-yellow-500" />}
                                {bookmark.status === 'matched' && <Check className="h-4 w-4 text-emerald-500" />}

                                {healthStatus === 'checking' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                                {healthStatus === 'alive' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                {healthStatus === 'dead' && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 -mr-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://web.archive.org/web/*/${bookmark.url}`, '_blank');
                                            }}
                                            title="Search in Archive"
                                        >
                                            <History className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 -mr-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleIgnoreUrl(bookmark.url);
                                            }}
                                        >
                                            <ShieldAlert className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </>
                                )}
                                {healthStatus === 'ignored' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 -mr-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleIgnoreUrl(bookmark.url);
                                        }}
                                    >
                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground block truncate mt-0.5 hover:underline">
                            {bookmark.url}
                        </a>
                    </div>
                </div>

                {/* Row 2: Metadata Badges */}
                <div className="flex flex-col gap-1 pl-8 text-xs">
                    {/* Folder Path (Can wrap now) */}
                    <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
                        {bookmark.originalFolder !== bookmark.newFolder ? (
                            <>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-muted-foreground border break-words whitespace-normal text-left">
                                    {bookmark.originalFolder}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded border break-words whitespace-normal text-left",
                                    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                )}>
                                    {bookmark.newFolder}
                                </span>
                            </>
                        ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border break-words whitespace-normal text-left">
                                {bookmark.originalFolder}
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {bookmark.tags.map(tag => {
                                const isRuleTag = bookmark.ruleTags?.includes(tag);
                                return (
                                    <span key={tag} className={cn(
                                        "px-1.5 py-0.5 rounded font-medium border",
                                        isRuleTag
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                    )}>
                                        #{tag}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
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
        prevProps.linkHealth === nextProps.linkHealth &&
        // Check if ignore status changed for this SPECIFIC url
        (prevProps.ignoredUrls?.has(prevProps.bookmark.url) === nextProps.ignoredUrls?.has(nextProps.bookmark.url))
    )
})

BookmarkRow.displayName = 'BookmarkRow'
