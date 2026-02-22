import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkCollections } from './BookmarkCollections'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { cn, getRelativeTime } from '../../lib/utils'
import { ArrowRight, Eye, Layers } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

export function BookmarkRowDesktop({
    bookmark,
    isSelected,
    healthStatus,
    toggleSelection,
    toggleIgnoreUrl,
    onPreview,
    availableFolders,
    availableTags,
    allCollections,
    onRemoveFromCollection
}) {
    const { t } = useTranslation();
    return (
        <div className="hidden lg:contents">
            {/* Checkbox (Col 1) */}
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="z-20"
                />
            </div>

            {/* Title / URL (Col 2) */}
            <div className="flex flex-col min-w-0 py-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Favicon url={bookmark.url} className="w-4 h-4 flex-shrink-0" />
                    <span className={cn(
                        "font-medium truncate",
                        (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                        (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                        healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                    )} title={bookmark.title}>{bookmark.title || t('common.untitled')}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate" title={bookmark.url}>{bookmark.url}</span>

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

                {bookmark.addDate && (
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <span>{t('bookmarks.row.added', { time: getRelativeTime(bookmark.addDate, t) })}</span>
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
            <div className="flex items-center gap-2">
                {(() => {
                    const oldF = bookmark.originalFolder || t('common.uncategorized');
                    const newF = bookmark.newFolder || t('common.uncategorized');
                    const hasChange = newF.normalize("NFC").trim().toLowerCase() !== oldF.normalize("NFC").trim().toLowerCase();
                    const isSuggestion = (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested' || bookmark.status === 'matched' || bookmark.status === 'conflict');

                    if (hasChange && isSuggestion) {
                        return (
                            <>
                                <BookmarkFolderBadge
                                    folderName={bookmark.originalFolder || ''}
                                    availableFolders={availableFolders}
                                    className="opacity-50 shrink-0"
                                />
                                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                                <BookmarkFolderBadge
                                    folderName={bookmark.newFolder}
                                    availableFolders={availableFolders}
                                    isMatched={true}
                                    className="shrink-0"
                                />
                            </>
                        );
                    }
                    return (
                        <BookmarkFolderBadge
                            folderName={bookmark.newFolder || bookmark.originalFolder || ''}
                            availableFolders={availableFolders}
                            isMatched={bookmark.status === 'suggested' || bookmark.status === 'ai-suggested' || bookmark.status === 'matched' || bookmark.status === 'conflict'}
                        />
                    );
                })()}
            </div>

            {/* Status Icon (Col 4) */}
            <div className="flex justify-center w-full">
                <BookmarkStatusIcon bookmark={bookmark} />
            </div>

            {/* Health Icon (Col 5) */}
            <div className="flex justify-center w-full">
                <BookmarkHealthStatus
                    url={bookmark.url}
                    status={healthStatus}
                    onToggleIgnore={toggleIgnoreUrl}
                />
            </div>

            {/* Preview Button (Col 6) */}
            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => onPreview(bookmark)}
                    title={t('preview.open')}
                >
                    <Eye className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
