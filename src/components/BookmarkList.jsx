import * as React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { BookmarkRow } from './BookmarkRow'
import { cn } from '../lib/utils'

export function BookmarkList({ bookmarks, selectedIds, toggleSelection, toggleAll, linkHealth, ignoredUrls, toggleIgnoreUrl, availableFolders = [], availableTags = [] }) {
    // Determine if all visible/loaded bookmarks are selected
    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Common grid layout to ensure perfect alignment
    // Checkbox | Title | Location | Status | Health
    // Desktop: Grid with fixed columns
    // Mobile: Block/Flex (Handled in component)
    // Use minmax(0, Xfr) to prevent flex items from overflowing columns
    const gridLayout = "lg:grid lg:grid-cols-[40px_minmax(0,3fr)_minmax(0,2fr)_40px_40px] lg:gap-4 lg:items-center lg:px-4"

    const Header = () => (
        <div className={cn("bg-background z-50 border-b py-3 font-medium uppercase text-xs text-muted-foreground grid w-full", gridLayout)}>
            <div className="flex justify-center z-20">
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    className="bg-card z-20"
                />
            </div>
            <div className="px-2">Title / URL</div>
            <div className="px-2 text-left">Location</div>
            <div className="text-center">Status</div>
            <div className="text-center">Health</div>
        </div>
    )

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header - Fixed Outside Virtuoso (Forced Visibility) */}
            <Header />

            {/* List Body with Virtuoso */}
            <div className="flex-1 min-h-0 overflow-x-auto">
                <Virtuoso
                    style={{ height: '100%' }}
                    data={displayData}
                    context={{
                        selectedIds,
                        toggleSelection,
                        linkHealth,
                        ignoredUrls,
                        toggleIgnoreUrl,
                        availableFolders,
                        availableTags
                    }}
                    itemContent={(index, bookmark, context) => (
                        <BookmarkRow
                            bookmark={bookmark}
                            selectedIds={context.selectedIds}
                            toggleSelection={context.toggleSelection}
                            linkHealth={context.linkHealth}
                            ignoredUrls={context.ignoredUrls}
                            toggleIgnoreUrl={context.toggleIgnoreUrl}
                            className={gridLayout}
                            availableFolders={context.availableFolders}
                            availableTags={context.availableTags}
                        />
                    )}
                    overscan={200}
                />
            </div>
        </div>
    )
}
