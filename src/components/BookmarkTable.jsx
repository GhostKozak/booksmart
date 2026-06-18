import * as React from 'react'
import { TableVirtuoso } from 'react-virtuoso'
import { Checkbox } from './ui/checkbox'
import { Favicon } from './Favicon'
import { BookmarkStatusIcon } from './bookmark/BookmarkStatusIcon'
import { BookmarkHealthStatus } from './bookmark/BookmarkHealthStatus'
import { BookmarkTags } from './bookmark/BookmarkTags'
import { BookmarkCollections } from './bookmark/BookmarkCollections'
import { BookmarkFolderBadge } from './bookmark/BookmarkFolderBadge'
import { LinkTooltip } from './bookmark/LinkTooltip'
import { Button } from './ui/button'
import { Pencil, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, getRelativeTime } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'

export function BookmarkTable({
    bookmarks,
    selectedIds,
    toggleSelection,
    toggleAll,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    availableFolders = [],
    availableTags = [],
    allCollections = [],
    onRemoveFromCollection
}) {
    const { t } = useTranslation()
    const { sortBy, setSortBy } = useAppStore()

    const isAllSelected = bookmarks.length > 0 && selectedIds.size === bookmarks.length

    // Sort Handler for table headers
    const handleSort = (column) => {
        if (column === 'title') {
            setSortBy(sortBy === 'title-az' ? 'title-za' : 'title-az')
        } else if (column === 'date') {
            setSortBy(sortBy === 'date-new' ? 'date-old' : 'date-new')
        } else if (column === 'folder') {
            setSortBy(sortBy === 'folder' ? 'default' : 'folder')
        } else if (column === 'url') {
            setSortBy(sortBy === 'domain' ? 'default' : 'domain')
        }
    }

    // Render sort indicator icons on headers
    const renderSortIcon = (column) => {
        if (column === 'title') {
            if (sortBy === 'title-az') return <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />
            if (sortBy === 'title-za') return <ArrowDown className="h-3 w-3 ml-1 text-primary shrink-0" />
        } else if (column === 'date') {
            if (sortBy === 'date-new') return <ArrowDown className="h-3 w-3 ml-1 text-primary shrink-0" />
            if (sortBy === 'date-old') return <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />
        } else if (column === 'folder') {
            if (sortBy === 'folder') return <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />
        } else if (column === 'url') {
            if (sortBy === 'domain') return <ArrowUp className="h-3 w-3 ml-1 text-primary shrink-0" />
        }
        return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    }

    // Force a new reference to trigger refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            <div className="flex-1 min-h-0 overflow-x-auto">
                <TableVirtuoso
                    style={{ height: '100%' }}
                    data={displayData}
                    components={{
                        Table: React.forwardRef((props, ref) => <table {...props} ref={ref} className="w-full min-w-[1000px] border-collapse text-sm text-left table-fixed" />),
                        TableHead: React.forwardRef((props, ref) => <thead ref={ref} {...props} className="sticky top-0 bg-background border-b z-20" />),
                        TableRow: React.forwardRef((props, ref) => <tr {...props} ref={ref} className="border-b hover:bg-muted/20 transition-colors group/row" />),
                        TableBody: React.forwardRef((props, ref) => <tbody ref={ref} {...props} />)
                    }}
                    fixedHeaderContent={() => (
                        <tr>
                            <th className="w-[45px] px-3 py-3 text-center">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={() => toggleAll(bookmarks)}
                                    aria-label={t('common.selectAll')}
                                />
                            </th>
                            <th className="w-[30%] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider cursor-pointer group" onClick={() => handleSort('title')}>
                                <div className="flex items-center">
                                    {t('bookmarks.columns.title')}
                                    {renderSortIcon('title')}
                                </div>
                            </th>
                            <th className="w-[25%] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider cursor-pointer group" onClick={() => handleSort('url')}>
                                <div className="flex items-center">
                                    URL
                                    {renderSortIcon('url')}
                                </div>
                            </th>
                            <th className="w-[15%] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider cursor-pointer group" onClick={() => handleSort('folder')}>
                                <div className="flex items-center">
                                    {t('sidebar.sections.folders')}
                                    {renderSortIcon('folder')}
                                </div>
                            </th>
                            <th className="w-[15%] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider">
                                {t('sidebar.sections.tags')}
                            </th>
                            <th className="w-[100px] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider text-center cursor-pointer group" onClick={() => handleSort('date')}>
                                <div className="flex items-center justify-center">
                                    {t('bookmarks.columns.added') || 'Added'}
                                    {renderSortIcon('date')}
                                </div>
                            </th>
                            <th className="w-[70px] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider text-center">
                                {t('bookmarks.columns.health')}
                            </th>
                            <th className="w-[85px] px-3 py-3 font-semibold text-xs uppercase text-muted-foreground tracking-wider text-center">
                                {t('common.actions') || 'Actions'}
                            </th>
                        </tr>
                    )}
                    itemContent={(index, bookmark) => {
                        const isSelected = selectedIds.has(bookmark.id)
                        const isIgnored = ignoredUrls?.has(bookmark.url)
                        const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

                        return (
                            <>
                                {/* Checkbox */}
                                <td className="px-3 py-2 text-center align-middle">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleSelection(bookmark.id)}
                                        aria-label={t('common.select')}
                                    />
                                </td>
                                
                                {/* Title */}
                                <td className="px-3 py-2 align-middle min-w-0">
                                    <LinkTooltip bookmark={bookmark} className="w-full min-w-0 block">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Favicon url={bookmark.url} className="w-3.5 h-3.5 shrink-0" />
                                            <span className={cn(
                                                "font-medium truncate block",
                                                (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                                                (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                                                healthStatus === 'dead' && "text-red-600 dark:text-red-400 line-through"
                                            )} title={bookmark.title}>
                                                {bookmark.title || t('common.untitled')}
                                            </span>
                                            {bookmark.status === 'ai-suggested' && (
                                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[9px] px-1 rounded font-semibold shrink-0">
                                                    AI
                                                </span>
                                            )}
                                        </div>
                                    </LinkTooltip>
                                </td>

                                {/* URL */}
                                <td className="px-3 py-2 align-middle min-w-0 text-xs text-muted-foreground truncate">
                                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
                                        {bookmark.url}
                                    </a>
                                </td>

                                {/* Folder */}
                                <td className="px-3 py-2 align-middle min-w-0">
                                    <BookmarkFolderBadge
                                        folderName={bookmark.newFolder || bookmark.originalFolder || ''}
                                        availableFolders={availableFolders}
                                        isMatched={bookmark.status === 'suggested' || bookmark.status === 'ai-suggested' || bookmark.status === 'matched' || bookmark.status === 'conflict'}
                                    />
                                </td>

                                {/* Tags */}
                                <td className="px-3 py-2 align-middle min-w-0">
                                    <BookmarkTags
                                        tags={bookmark.tags}
                                        ruleTags={bookmark.ruleTags}
                                        availableTags={availableTags}
                                    />
                                    <BookmarkCollections
                                        collectionIds={bookmark.collections}
                                        allCollections={allCollections}
                                        onRemove={onRemoveFromCollection ? (collectionId) => onRemoveFromCollection(bookmark.id, collectionId) : undefined}
                                    />
                                </td>

                                {/* Added Date */}
                                <td className="px-3 py-2 align-middle text-center text-xs text-muted-foreground">
                                    {bookmark.addDate ? getRelativeTime(bookmark.addDate, t) : '-'}
                                </td>

                                {/* Health Status */}
                                <td className="px-3 py-2 align-middle text-center">
                                    <BookmarkHealthStatus
                                        url={bookmark.url}
                                        status={healthStatus}
                                        onToggleIgnore={toggleIgnoreUrl}
                                    />
                                </td>

                                {/* Actions */}
                                <td className="px-3 py-2 align-middle text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                                            onClick={() => onEdit?.(bookmark)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                                            onClick={() => onPreview(bookmark)}
                                            title={t('preview.open')}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </td>
                            </>
                        )
                    }}
                />
            </div>
        </div>
    )
}
