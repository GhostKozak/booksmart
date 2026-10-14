import * as React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { BookmarkRow } from './BookmarkRow'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function BookmarkList({
    bookmarks,
    selectedIds,
    toggleSelection,
    toggleAll,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    onMergeDuplicate,
    availableFolders = [],
    availableTags = [],
    allCollections = [],
    onRemoveFromCollection,
    compact = false
}) {
    const { t } = useTranslation()
    const { sortBy, setSortBy } = useAppStore()
    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Common grid layout to ensure pixel-perfect alignment across all screen sizes
    // Col 1: Checkbox (44px)
    // Col 2: Title, URL & Badges (2fr)
    // Col 3: Folder Location (1.2fr)
    // Col 4: Status (88px)
    // Col 5: Link Health (88px)
    // Col 6: Actions Toolbar (156px)
    const gridLayout = "lg:grid lg:grid-cols-[44px_minmax(0,2fr)_minmax(0,1.2fr)_88px_88px_156px] lg:gap-4 lg:items-center lg:px-4"

    const handleSortTitle = () => {
        if (sortBy === 'title-az') {
            setSortBy('title-za')
        } else if (sortBy === 'title-za') {
            setSortBy('default')
        } else {
            setSortBy('title-az')
        }
    }

    const header = (
        <div className={cn(
            "bg-card/95 backdrop-blur-md z-10 sticky top-0 border-b border-border/80 py-2.5 font-semibold uppercase text-[11px] text-muted-foreground tracking-wider select-none w-full shadow-2xs",
            "flex items-center px-3 justify-between sm:justify-start gap-3", // Mobile: Flex layout
            "lg:grid lg:px-4 lg:items-center", // Desktop: Grid layout
            gridLayout
        )}>
            {/* Col 1: Select All Checkbox */}
            <div className="flex items-center gap-2.5 lg:justify-center">
                <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={() => toggleAll(bookmarks)}
                    aria-label={t('common.selectAll')}
                    className="data-[state=checked]:bg-primary"
                />
                <span className="lg:hidden normal-case font-medium text-xs text-foreground/80">
                    {t('common.selectAll')} ({selectedIds.size > 0 ? `${selectedIds.size}/${bookmarks.length}` : bookmarks.length})
                </span>
            </div>

            {/* Col 2: Title / URL */}
            <div className="hidden lg:flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors group" onClick={handleSortTitle} title={t('header.sort.label', 'Sırala')}>
                <span>{t('bookmarks.columns.title')}</span>
                <ArrowUpDown className={cn(
                    "w-3 h-3 transition-opacity",
                    sortBy.startsWith('title') ? "opacity-100 text-primary" : "opacity-40 group-hover:opacity-75"
                )} />
            </div>

            {/* Col 3: Folder / Location */}
            <div className="hidden lg:block text-left">{t('sidebar.sections.folders')}</div>

            {/* Col 4: Status */}
            <div className="hidden lg:block text-center">{t('bookmarks.columns.status')}</div>

            {/* Col 5: Link Health */}
            <div className="hidden lg:block text-center">{t('bookmarks.columns.health')}</div>

            {/* Col 6: Actions Toolbar */}
            <div className="hidden lg:block text-center">{t('common.actions')}</div>
        </div>
    )

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden h-full flex flex-col transition-all">
            {/* List Body with Virtuoso */}
            <div className="flex-1 min-h-0 overflow-x-auto">
                <Virtuoso
                    style={{ height: '100%' }}
                    data={displayData}
                    components={{
                        Header: () => header
                    }}
                    context={{
                        selectedIds,
                        toggleSelection,
                        linkHealth,
                        ignoredUrls,
                        toggleIgnoreUrl,
                        onPreview,
                        onEdit,
                        onMergeDuplicate,
                        availableFolders,
                        availableTags,
                        allCollections,
                        onRemoveFromCollection,
                        compact
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
                            onEdit={context.onEdit}
                            onMergeDuplicate={context.onMergeDuplicate}
                            className={gridLayout}
                            availableFolders={context.availableFolders}
                            availableTags={context.availableTags}
                            allCollections={context.allCollections}
                            onRemoveFromCollection={context.onRemoveFromCollection}
                            compact={context.compact}
                        />
                    )}
                    overscan={200}
                />
            </div>
        </div>
    )
}
