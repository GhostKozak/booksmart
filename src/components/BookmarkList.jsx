import * as React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { BookmarkRow } from './BookmarkRow'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'

export function BookmarkList({ bookmarks, selectedIds, toggleSelection, toggleAll, linkHealth, ignoredUrls, toggleIgnoreUrl, onPreview, availableFolders = [], availableTags = [] }) {
    // Determine if all visible/loaded bookmarks are selected
    const { t } = useTranslation();
    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Common grid layout to ensure perfect alignment
    // Reduced icon columns to 40px, increased Title/URL ratio
    // Desktop: Grid with fixed columns
    // Mobile: Block/Flex (Handled in component)
    const gridLayout = "lg:grid lg:grid-cols-[40px_40px_40px_40px_3fr_1fr_1fr] lg:gap-4 lg:items-center lg:px-4";

    const renderHeader = React.useCallback(() => (
        <div className={cn("bg-background sticky top-0 z-10 border-b py-3 font-medium uppercase text-xs text-muted-foreground hidden lg:grid", gridLayout)}>
            <div className="flex justify-center z-20">
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    className="bg-card z-20"
                />
            </div>
            <div className="text-center">{t('header.view')}</div>
            <div className="text-center">Status</div>
            <div className="text-center">{t('analytics.linkHealth')}</div>
            <div className="px-2">Title / URL</div>
            <div className="px-2">{t('sidebar.sections.folders')} (Old)</div>
            <div className="px-2">{t('sidebar.sections.folders')} (New)</div>
        </div>
    ), [gridLayout, isAllSelected, toggleAll, t])

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
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
                        onPreview,
                        availableFolders,
                        availableTags
                    }}
                    components={{
                        Header: renderHeader
                    }}
                    itemContent={(index, bookmark, context) => (
                        <BookmarkRow
                            bookmark={bookmark}
                            selectedIds={context.selectedIds}
                            toggleSelection={context.toggleSelection}
                            linkHealth={context.linkHealth}
                            ignoredUrls={context.ignoredUrls}
                            toggleIgnoreUrl={context.toggleIgnoreUrl}
                            onPreview={context.onPreview}
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
