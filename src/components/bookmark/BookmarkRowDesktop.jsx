import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkCollections } from './BookmarkCollections'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { LinkTooltip } from './LinkTooltip'
import { cn, getRelativeTime } from '../../lib/utils'
import { ArrowRight, Eye, Layers, StickyNote, Pencil, GitMerge, Rss, BookOpen } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function BookmarkRowDesktop({
    bookmark,
    isSelected,
    healthStatus,
    toggleSelection,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    onMergeDuplicate,
    availableFolders,
    availableTags,
    allCollections,
    onRemoveFromCollection,
    compact
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
                    aria-label={t('common.select')}
                />
            </div>

            {/* Title / URL (Col 2) */}
            <div className={cn("flex flex-col min-w-0 overflow-hidden", compact ? "py-1.5" : "py-2")}>
                <LinkTooltip bookmark={bookmark} className="w-full min-w-0 block">
                    <div className="flex items-center gap-2 min-w-0">
                        <Favicon url={bookmark.url} className="w-4 h-4 shrink-0" />
                        <span className={cn(
                            "font-medium truncate text-sm",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                        )} title={bookmark.title}>{bookmark.title || t('common.untitled')}</span>
                        {bookmark.feedUrl && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0" title={t('rss.connectedToFeed', 'RSS Akışına Bağlı')}>
                                <Rss className="w-2.5 h-2.5" />
                                <span>RSS</span>
                            </span>
                        )}
                        {bookmark.readingTimeMinutes && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0" title={t('reader.readingTimeEstimate', 'Tahmini Okuma Süresi')}>
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>{bookmark.readingTimeMinutes} {t('reader.minShort', 'dk')}</span>
                            </span>
                        )}
                    </div>
                    {!compact && (
                        <span className="text-muted-foreground text-xs break-words truncate" title={bookmark.url}>{bookmark.url}</span>
                    )}
                </LinkTooltip>

                {!compact && (
                    <>
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

                        <div className="flex items-center gap-1 mt-0.5">
                            {bookmark.addDate && (
                                <span className="text-[10px] text-muted-foreground/60">{t('bookmarks.row.added', { time: getRelativeTime(bookmark.addDate, t) })}</span>
                            )}
                            {bookmark.note && (
                                <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5 ml-1" title={bookmark.note}>
                                    <StickyNote className="w-3 h-3" />
                                    {bookmark.note.length > 30 ? bookmark.note.slice(0, 30) + '...' : bookmark.note}
                                </span>
                            )}
                        </div>

                        {(bookmark.isDuplicate || bookmark.hasDuplicate) && bookmark.otherLocations.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                                <Layers className="w-3 h-3" />
                                <span>{t('bookmarks.row.duplicateIn', { locations: bookmark.otherLocations.join(', ') })}</span>
                                {onMergeDuplicate && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onMergeDuplicate(bookmark)
                                        }}
                                        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium cursor-pointer"
                                        title={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                                    >
                                        <GitMerge className="w-3 h-3" />
                                        <span>{t('bookmarks.row.mergeAction') || 'Merge'}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </>
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
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
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

            {/* Action Buttons (Col 6) */}
            <div className="flex justify-center gap-1">
                {(bookmark.isDuplicate || bookmark.hasDuplicate) && onMergeDuplicate && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-primary/10 w-8 h-8 text-primary hover:text-primary transition-colors cursor-pointer"
                        onClick={() => onMergeDuplicate(bookmark)}
                        title={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                        aria-label={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                    >
                        <GitMerge className="w-4 h-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 w-8 h-8 hover:text-primary transition-colors"
                    onClick={() => onEdit?.(bookmark)}
                    title={t('common.edit')}
                    aria-label={t('common.edit')}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 w-8 h-8 hover:text-primary transition-colors"
                    onClick={() => onPreview(bookmark)}
                    title={t('preview.open')}
                    aria-label={t('preview.open')}
                >
                    <Eye className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 w-8 h-8 hover:text-primary transition-colors"
                    onClick={() => useAppStore.getState().openReaderMode(bookmark)}
                    title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                    aria-label={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                >
                    <BookOpen className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
