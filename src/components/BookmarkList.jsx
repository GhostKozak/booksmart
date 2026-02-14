import { Virtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { BookmarkRow } from './BookmarkRow'
import { cn } from '../lib/utils'

export function BookmarkList({ bookmarks, selectedIds, toggleSelection, toggleAll, linkHealth, ignoredUrls, toggleIgnoreUrl, availableFolders = [] }) {

    // Determine if all visible/loaded bookmarks are selected
    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Common grid layout to ensure perfect alignment
    // Reduced icon columns to 40px, increased Title/URL ratio
    // Common grid layout to ensure perfect alignment
    // Desktop: Grid with fixed columns
    // Mobile: Block/Flex (Handled in component)
    const gridLayout = "lg:grid lg:grid-cols-[40px_40px_40px_3fr_1fr_1fr] lg:gap-4 lg:items-center lg:px-4"

    const Header = () => (
        <div className={cn("bg-background z-10 border-b py-3 font-medium uppercase text-xs text-muted-foreground hidden lg:grid", gridLayout)}>
            <div className="flex justify-center">
                <Checkbox
                    checked={isAllSelected}
                    onChange={toggleAll}
                    className="bg-card"
                />
            </div>
            <div className="text-center">Status</div>
            <div className="text-center">Health</div>
            <div className="px-2">Title / URL</div>
            <div className="px-2">Original Folder</div>
            <div className="px-2">New Folder</div>
        </div>
    )

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            {/* List Body with Virtuoso */}
            <div className="flex-1 min-h-0 overflow-x-auto">
                <Virtuoso
                    style={{ height: '100%' }}
                    data={bookmarks}
                    fixedHeaderContent={Header}
                    itemContent={(index, bookmark) => (
                        <BookmarkRow
                            bookmark={bookmark}
                            selectedIds={selectedIds}
                            toggleSelection={toggleSelection}
                            linkHealth={linkHealth}
                            ignoredUrls={ignoredUrls}
                            toggleIgnoreUrl={toggleIgnoreUrl}
                            className={gridLayout}
                            availableFolders={availableFolders}
                        />
                    )}
                    overscan={200}
                />
            </div>
        </div>
    )
}
