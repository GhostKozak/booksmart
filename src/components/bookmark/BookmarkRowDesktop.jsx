import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { cn, getRelativeTime } from '../../lib/utils'
import { ArrowDownUpIcon, ArrowRight, ArrowRightLeft, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function BookmarkRowDesktop({
    bookmark,
    isSelected,
    healthStatus,
    toggleSelection,
    toggleIgnoreUrl,
    availableFolders,
    availableTags
}) {
    const { t } = useTranslation();
    return (
        <div className="hidden lg:contents">
            {/* Checkbox (Col 1) */}
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="bg-card z-20"
                />
            </div>

            {/* Title / URL (Col 2) */}
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

                <BookmarkTags
                    tags={bookmark.tags}
                    ruleTags={bookmark.ruleTags}
                    availableTags={availableTags}
                />

                {bookmark.addDate && (
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <span>{t('bookmarks.row.added', { time: getRelativeTime(bookmark.addDate) })}</span>
                    </div>
                )}

                {(bookmark.isDuplicate || bookmark.hasDuplicate) && bookmark.otherLocations.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        <span>{t('bookmarks.row.duplicateIn', { locations: bookmark.otherLocations.join(', ') })}</span>
                    </div>
                )}
            </div>

            {/* Folder Location (Col 3) */}
            <div className="px-2 flex items-center gap-2">
                {bookmark.newFolder && bookmark.newFolder !== bookmark.originalFolder ? (
                    <>
                        <BookmarkFolderBadge
                            folderName={bookmark.originalFolder}
                            availableFolders={availableFolders}
                            className="opacity-50 shrink-0"
                        />
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        <BookmarkFolderBadge
                            folderName={bookmark.newFolder}
                            availableFolders={availableFolders}
                            isMatched={bookmark.status === 'matched'}
                            className="shrink-0"
                        />
                    </>
                ) : (
                    <BookmarkFolderBadge
                        folderName={bookmark.newFolder || bookmark.originalFolder}
                        availableFolders={availableFolders}
                        isMatched={bookmark.status === 'matched'}
                    />
                )}
            </div>

            {/* Status Icon (Col 4) */}
            <BookmarkStatusIcon bookmark={bookmark} />

            {/* Health Icon (Col 5) */}
            <BookmarkHealthStatus
                url={bookmark.url}
                status={healthStatus}
                onToggleIgnore={toggleIgnoreUrl}
            />
        </div>
    )
}
