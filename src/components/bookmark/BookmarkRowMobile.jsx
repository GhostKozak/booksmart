import { Checkbox } from '../ui/checkbox'
import { Favicon } from '../Favicon'
import { BookmarkStatusIcon } from './BookmarkStatusIcon'
import { BookmarkHealthStatus } from './BookmarkHealthStatus'
import { BookmarkTags } from './BookmarkTags'
import { BookmarkCollections } from './BookmarkCollections'
import { BookmarkFolderBadge } from './BookmarkFolderBadge'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { ArrowRight, XCircle, Layers, Check, Eye, StickyNote, Pencil, GitMerge, Rss, BookOpen, QrCode, Bell } from 'lucide-react'
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
    return (
        <div className={cn("lg:hidden flex flex-col", compact ? "gap-0.5" : "gap-2")}>
            {/* Row 1: Checkbox, Icon, Title */}
            <div className="flex items-start gap-3">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="z-20 mt-1 shrink-0"
                    aria-label={t('common.select')}
                />

                <Favicon url={bookmark.url} className="mt-0.5 w-5 h-5 shrink-0" />

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <span className={cn(
                            "font-medium text-sm wrap-break-word leading-snug",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 decoration-red-500/30 line-through decoration-2"
                        )}>{bookmark.title || t('common.untitled')}</span>
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
                        {bookmark.reminderAt && (
                            <ReminderBadge
                                reminderAt={bookmark.reminderAt}
                                onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                            />
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground"
                                onClick={() => onEdit?.(bookmark)}
                                title={t('common.edit')}
                                aria-label={t('common.edit')}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground"
                                onClick={() => onPreview(bookmark)}
                                title={t('preview.open')}
                                aria-label={t('preview.open')}
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-primary"
                                onClick={() => useAppStore.getState().openReaderMode(bookmark)}
                                title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                                aria-label={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-muted-foreground hover:text-primary"
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
                                    "w-7 h-7 transition-colors",
                                    bookmark.reminderAt ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-primary"
                                )}
                                onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                                title={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                                aria-label={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                            >
                                <Bell className="w-3.5 h-3.5" />
                            </Button>
                            {(bookmark.isDuplicate || bookmark.hasDuplicate) && onMergeDuplicate && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 text-primary hover:bg-primary/10 cursor-pointer"
                                    onClick={() => onMergeDuplicate(bookmark)}
                                    title={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                                    aria-label={t('bookmarks.row.mergeAction') || 'Merge with duplicates'}
                                >
                                    <GitMerge className="w-3.5 h-3.5" />
                                </Button>
                            )}
                            {bookmark.isDuplicate && <XCircle className="w-4 h-4 text-red-500" />}
                            {bookmark.hasDuplicate && <Layers className="w-4 h-4 text-yellow-500" />}
                            {(bookmark.status === 'matched' || bookmark.status === 'conflict') && <Check className="w-4 h-4 text-emerald-500" />}

                            <BookmarkHealthStatus
                                url={bookmark.url}
                                status={healthStatus}
                                onToggleIgnore={toggleIgnoreUrl}
                                mini={true}
                            />
                        </div>
                    </div>

                    {!compact && (
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block mt-0.5 text-muted-foreground text-xs hover:underline wrap-break-word truncate">
                            {bookmark.url}
                        </a>
                    )}
                </div>
            </div>

            {/* Row 2: Metadata Badges */}
            {!compact && (
                <div className="flex flex-col gap-1 pl-8 text-xs">
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

                <BookmarkCollections
                    collectionIds={bookmark.collections}
                    allCollections={allCollections}
                    onRemove={onRemoveFromCollection ? (collectionId) => onRemoveFromCollection(bookmark.id, collectionId) : undefined}
                />

                {bookmark.note && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground/60 mt-0.5">
                        <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{bookmark.note}</span>
                    </div>
                )}
            </div>
            )}
        </div>
    )
}
