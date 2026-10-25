import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkCollections } from './BookmarkCollections'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { ArrowRight, XCircle, Layers, Check, Eye, StickyNote, Pencil, GitMerge, Rss, BookOpen, QrCode, Bell, Highlighter, HardDrive, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import { ReminderBadge } from './ReminderBadge'

export function BookmarkRowMobile({
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
        <div className={cn("lg:hidden flex flex-col", compact ? "gap-1" : "gap-2")}>
            {/* Row 1: Checkbox, Icon, Title, and Inline Badges */}
            <div className="flex items-start gap-2.5">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="z-20 mt-1 shrink-0 data-[state=checked]:bg-primary"
                    aria-label={t('common.select')}
                />

                <Favicon url={bookmark.url} className="mt-1 w-4 h-4 shrink-0 rounded-xs shadow-2xs" />

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 leading-snug">
                        <span className={cn(
                            "font-medium text-sm wrap-break-word text-foreground",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300 font-semibold",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/40 line-through decoration-2"
                        )}>
                            {bookmark.title || t('common.untitled')}
                        </span>

                        {bookmark.feedUrl && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0" title={t('rss.connectedToFeed', 'Connected to RSS')}>
                                <Rss className="w-2.5 h-2.5" />
                                <span>RSS</span>
                            </span>
                        )}

                        {bookmark.readingTimeMinutes && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0" title={t('reader.readingTimeEstimate', 'Estimated Reading Time')}>
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
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/25 transition-colors cursor-pointer shrink-0"
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
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25 transition-colors cursor-pointer shrink-0"
                                title={t('snapshots.badgeTooltip', 'Çevrimdışı HTML Arşivini Aç')}
                            >
                                <HardDrive className="w-2.5 h-2.5" />
                                <span>{t('snapshots.badgeShort', 'Çevrimdışı')}</span>
                            </button>
                        )}
                    </div>

                    {!compact && (
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block mt-0.5 text-muted-foreground/80 hover:text-primary text-xs font-mono break-all truncate">
                            {bookmark.url}
                        </a>
                    )}
                </div>
            </div>

            {/* Row 2: Status & Quick Action Toolbar */}
            <div className="flex items-center justify-between gap-2 pl-7 pt-0.5">
                {/* Status & Health Indicators */}
                <div className="flex items-center gap-1.5">
                    {bookmark.isDuplicate && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>{t('bookmarks.status.duplicate')}</span>
                        </span>
                    )}
                    {bookmark.hasDuplicate && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                            <Layers className="w-3 h-3 text-yellow-500" />
                            <span>{t('bookmarks.status.original')}</span>
                        </span>
                    )}
                    {(bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span>{t('bookmarks.status.suggested')}</span>
                        </span>
                    )}
                    {(bookmark.status === 'matched' || bookmark.status === 'conflict') && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>{t('bookmarks.status.matched')}</span>
                        </span>
                    )}

                    <BookmarkHealthStatus
                        url={bookmark.url}
                        status={healthStatus}
                        onToggleIgnore={toggleIgnoreUrl}
                        mini={true}
                    />
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-0.5">
                    {(bookmark.isDuplicate || bookmark.hasDuplicate) && onMergeDuplicate && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-primary hover:bg-primary/10 cursor-pointer rounded-md"
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
                        className="w-7 h-7 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => onEdit?.(bookmark)}
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => onPreview(bookmark)}
                        title={t('preview.open')}
                        aria-label={t('preview.open')}
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => useAppStore.getState().openReaderMode(bookmark)}
                        title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                        aria-label={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-primary rounded-md"
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
                            "w-7 h-7 rounded-md transition-colors",
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

            {/* Row 3: Metadata Badges (Folders, Tags, Collections, Notes) */}
            {!compact && (
                <div className="flex flex-col gap-1 pl-7 text-xs">
                    {/* Folder Path */}
                    <div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
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
                                            className="opacity-50 text-left whitespace-normal"
                                        />
                                        <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                        <BookmarkFolderBadge
                                            folderName={bookmark.newFolder}
                                            availableFolders={availableFolders}
                                            isMatched={true}
                                            className="text-left whitespace-normal"
                                        />
                                    </>
                                );
                            }
                            return (
                                <BookmarkFolderBadge
                                    folderName={bookmark.newFolder || bookmark.originalFolder || ''}
                                    availableFolders={availableFolders}
                                    isMatched={bookmark.status === 'suggested' || bookmark.status === 'ai-suggested' || bookmark.status === 'matched' || bookmark.status === 'conflict'}
                                    className={cn(!isSuggestion && "bg-muted/50 whitespace-normal text-left")}
                                />
                            );
                        })()}
                    </div>

                    {/* Tags */}
                    <BookmarkTags
                        tags={bookmark.tags}
                        ruleTags={bookmark.ruleTags}
                        availableTags={availableTags}
                    />

                    {/* Collections */}
                    <BookmarkCollections
                        collectionIds={bookmark.collections}
                        allCollections={allCollections}
                        onRemove={onRemoveFromCollection ? (collectionId) => onRemoveFromCollection(bookmark.id, collectionId) : undefined}
                    />

                    {bookmark.note && (
                        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground/75 mt-0.5">
                            <StickyNote className="w-3 h-3 mt-0.5 text-amber-500/70 shrink-0" />
                            <span className="line-clamp-2">{bookmark.note}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
