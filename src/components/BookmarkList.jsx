import * as React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { BookmarkRow } from './BookmarkRow'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'

export function BookmarkList({ bookmarks, selectedIds, toggleSelection, toggleAll, linkHealth, ignoredUrls, toggleIgnoreUrl, onPreview, availableFolders = [], availableTags = [], allCollections = [], onRemoveFromCollection }) {
    // Determine if all visible/loaded bookmarks are selected
    const { t } = useTranslation();
    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Common grid layout to ensure perfect alignment
    // Checkbox | Eye | Title | Location | Status | Health
    const gridLayout = "lg:grid lg:grid-cols-[40px_minmax(0,2fr)_minmax(0,1.5fr)_90px_90px_60px] lg:gap-4 lg:items-center lg:px-4 lg:pr-6"

    const header = (
        <div className={cn(
            "bg-background z-10 sticky top-0 border-b py-2 sm:py-3 font-medium uppercase text-[10px] sm:text-xs text-muted-foreground w-full",
            "flex items-center px-3", // Mobile: Flex layout
            "lg:grid lg:px-4 lg:items-center", // Desktop: Grid layout
            gridLayout
        )}>
            <div className="flex items-center gap-3 lg:justify-center">
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={() => toggleAll(bookmarks)}
                    aria-label={t('common.selectAll')}
                />
                <span className="lg:hidden normal-case font-semibold text-foreground/80">
                    {t('common.selectAll')}
                </span>
            </div>
            <div className="hidden lg:block">{t('bookmarks.columns.title')}</div>
            <div className="hidden lg:block text-left">{t('sidebar.sections.folders')}</div>
            <div className="hidden lg:block text-center">{t('bookmarks.columns.status')}</div>
            <div className="hidden lg:block text-center">{t('bookmarks.columns.health')}</div>
            <div className="hidden lg:block text-center">{t('header.view')}</div>
        </div>
    )

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header - Fixed Outside Virtuoso */}
            {header}

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
                        availableTags,
                        allCollections,
                        onRemoveFromCollection
                    }}
                    itemContent={(index, bookmark, context) => (
                        <BookmarkRow
                            index={index}
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
                            allCollections={context.allCollections}
                            onRemoveFromCollection={context.onRemoveFromCollection}
                        />
                    )}
                    overscan={200}
                />
            </div>
        </div>
    )
}
