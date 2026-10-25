import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkCollections } from './BookmarkCollections'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { LinkTooltip } from './LinkTooltip'
import { cn, getRelativeTime } from '../../lib/utils'
import { ArrowRight, Eye, Layers, StickyNote, Pencil, GitMerge, Rss, BookOpen, QrCode, Bell, Highlighter, HardDrive } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { ReminderBadge } from './ReminderBadge'

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

    const highlightsCount = bookmark.highlightsCount || (bookmark.highlights ? bookmark.highlights.length : 0);

    return (
        <div className="hidden lg:contents group/row">
            {/* Col 1: Checkbox */}
            <div className="flex justify-center items-center py-2">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="z-20 data-[state=checked]:bg-primary"
                    aria-label={t('common.select')}
                />
            </div>

            {/* Col 2: Title, URL, Micro-badges & Metadata */}
            <div className={cn("flex flex-col min-w-0 overflow-hidden", compact ? "py-1.5" : "py-2.5")}>
                <LinkTooltip bookmark={bookmark} className="w-full min-w-0 block">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Favicon url={bookmark.url} className="w-4 h-4 shrink-0 rounded-xs shadow-2xs" />
                        <span className={cn(
                            "font-medium truncate text-sm text-foreground hover:text-primary transition-colors",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300 font-semibold",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/40 line-through decoration-2"
                        )} title={bookmark.title}>
                            {bookmark.title || t('common.untitled')}
                        </span>

                        {/* Inline Badges */}
                        {bookmark.feedUrl && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0" title={t('rss.connectedToFeed', 'Connected to RSS')}>
                                <Rss className="w-2.5 h-2.5" />
                                <span>RSS</span>
                            </span>
                        )}

                        {bookmark.readingTimeMinutes && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0" title={t('reader.readingTimeEstimate', 'Estimated Reading Time')}>
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>{bookmark.readingTimeMinutes} {t('reader.minShort', 'min')}</span>
                            </span>
                        )}

                        {bookmark.reminderAt && (
                            <ReminderBadge
                                reminderAt={bookmark.reminderAt}
                                onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                            />
                        )}

                        {highlightsCount > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    useAppStore.getState().openReaderMode(bookmark);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/25 transition-colors cursor-pointer shrink-0"
                                title={t('reader.highlights.badgeTooltip', 'Vurguları Reader Mode\'da aç')}
                            >
                                <Highlighter className="w-2.5 h-2.5" />
                                <span>{highlightsCount} {t('reader.highlights.countSuffix', 'vurgu')}</span>
                            </button>
                        )}

                        {bookmark.hasSnapshot && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    useAppStore.getState().openSnapshotViewer(bookmark);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25 transition-colors cursor-pointer shrink-0"
                                title={t('snapshots.badgeTooltip', 'Çevrimdışı HTML Arşivini Aç')}
                            >
                                <HardDrive className="w-2.5 h-2.5" />
                                <span>{t('snapshots.badgeShort', 'Çevrimdışı')}</span>
                            </button>
                        )}
                    </div>

                    {!compact && (
                        <span className="text-muted-foreground/80 hover:text-muted-foreground text-xs font-mono break-words truncate mt-0.5 block" title={bookmark.url}>
                            {bookmark.url}
                        </span>
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

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
                            {bookmark.addDate && (
                                <span>{t('bookmarks.row.added', { time: getRelativeTime(bookmark.addDate, t) })}</span>
                            )}
                            {bookmark.note && (
                                <span className="flex items-center gap-1 text-muted-foreground/90 max-w-sm truncate" title={bookmark.note}>
                                    <StickyNote className="w-3 h-3 text-amber-500/70 shrink-0" />
                                    <span>{bookmark.note}</span>
                                </span>
                            )}
                        </div>

                        {(bookmark.isDuplicate || bookmark.hasDuplicate) && bookmark.otherLocations?.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                                <Layers className="w-3.5 h-3.5 text-amber-500" />
                                <span>{t('bookmarks.row.duplicateIn', { locations: bookmark.otherLocations.join(', ') })}</span>
                                {onMergeDuplicate && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onMergeDuplicate(bookmark)
                                        }}
                                        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors font-medium text-[10px] cursor-pointer"
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

            {/* Col 3: Folder Location */}
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                {(() => {
                    const oldF = bookmark.originalFolder || t('common.uncategorized');
                    const newF = bookmark.newFolder || t('common.uncategorized');
                    const hasChange = newF.normalize("NFC").trim().toLowerCase() !== oldF.normalize("NFC").trim().toLowerCase();
                    const isSuggestion = (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested' || bookmark.status === 'matched' || bookmark.status === 'conflict');

                    if (hasChange && isSuggestion) {
                        return (
                            <div className="flex items-center gap-1 min-w-0 truncate">
                                <BookmarkFolderBadge
                                    folderName={bookmark.originalFolder || ''}
                                    availableFolders={availableFolders}
                                    className="opacity-50 shrink-0 max-w-[45%]"
                                />
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                                <BookmarkFolderBadge
                                    folderName={bookmark.newFolder}
                                    availableFolders={availableFolders}
                                    isMatched={true}
                                    className="shrink-0 max-w-[45%]"
                                />
                            </div>
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

            {/* Col 4: Status Icon */}
            <div className="flex justify-center items-center w-full">
                <BookmarkStatusIcon bookmark={bookmark} />
            </div>

            {/* Col 5: Health Status */}
            <div className="flex justify-center items-center w-full">
                <BookmarkHealthStatus
                    url={bookmark.url}
                    status={healthStatus}
                    onToggleIgnore={toggleIgnoreUrl}
                />
            </div>

            {/* Col 6: Action Buttons Toolbar */}
            <div className="flex justify-center items-center gap-0.5">
                {(bookmark.isDuplicate || bookmark.hasDuplicate) && onMergeDuplicate && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-primary/10 h-7.5 w-7.5 text-primary hover:text-primary transition-colors cursor-pointer rounded-lg"
                        onClick={() => onMergeDuplicate(bookmark)}
                        title={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                        aria-label={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                    >
                        <GitMerge className="w-3.5 h-3.5" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 h-7.5 w-7.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg"
                    onClick={() => onEdit?.(bookmark)}
                    title={t('common.edit')}
                    aria-label={t('common.edit')}
                >
                    <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 h-7.5 w-7.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg"
                    onClick={() => onPreview(bookmark)}
                    title={t('preview.open')}
                    aria-label={t('preview.open')}
                >
                    <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 h-7.5 w-7.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg"
                    onClick={() => useAppStore.getState().openReaderMode(bookmark)}
                    title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                    aria-label={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 h-7.5 w-7.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg"
                    onClick={() => useAppStore.getState().openQrCode(bookmark)}
                    title={t('qr.title', 'QR Kod ile Telefona Aktar')}
                    aria-label={t('qr.title', 'QR Kod ile Telefona Aktar')}
                >
                    <QrCode className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "hover:bg-primary/10 h-7.5 w-7.5 transition-colors cursor-pointer rounded-lg",
                        bookmark.reminderAt ? "text-amber-500 hover:text-amber-600 bg-amber-500/10" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                    title={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                    aria-label={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                >
                    <Bell className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    )
}
