import React from 'react';
import {
    X,
    BookOpen,
    Clock,
    ExternalLink,
    RefreshCw,
    Check,
    Copy,
    StickyNote,
    Minus,
    Plus,
    BookmarkCheck,
    QrCode,
    Bell,
    Highlighter,
    HardDrive,
    History
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { formatReadingTime } from '../../lib/reader-service';
import { getWaybackMachineUrl } from '../../lib/snapshot-service';

export function ReaderTopBar({
    article,
    bookmark,
    prefs,
    updatePrefs,
    isLoading,
    loadArticle,
    handleMarkAsRead,
    handleAppendToNote,
    handleCopyText,
    hasCopied,
    showHighlightsSidebar,
    setShowHighlightsSidebar,
    highlightsCount,
    handleToggleSnapshot,
    isSavingSnapshot,
    isSnapshotSaved,
    onClose
}) {
    const { t } = useTranslation();

    return (
        <header className="px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 z-20 backdrop-blur-xs">
            <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 truncate">
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="hidden sm:inline font-semibold">{t('reader.modeTitle', 'Okuma Modu')}</span>
                    {article && (
                        <>
                            <span className="hidden sm:inline opacity-50">•</span>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px] shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatReadingTime(article.readingTimeMinutes, t)}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Typography & Actions Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {/* Font Size Selector */}
                <div className="flex items-center border rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePrefs({ fontSize: Math.max(14, prefs.fontSize - 1) })}
                        disabled={prefs.fontSize <= 14}
                        className="h-7 w-7 rounded-none cursor-pointer"
                        title={t('reader.smallerFont', 'Yazı Boyutunu Küçült')}
                    >
                        <Minus className="w-3 h-3" />
                    </Button>
                    <span className="px-1.5 text-xs font-mono font-medium">{prefs.fontSize}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updatePrefs({ fontSize: Math.min(26, prefs.fontSize + 1) })}
                        disabled={prefs.fontSize >= 26}
                        className="h-7 w-7 rounded-none cursor-pointer"
                        title={t('reader.largerFont', 'Yazı Boyutunu Büyüt')}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                </div>

                {/* Font Family Selector */}
                <div className="flex items-center border rounded-lg p-0.5 bg-black/5 dark:bg-white/5 text-xs">
                    <button
                        type="button"
                        onClick={() => updatePrefs({ font: 'serif' })}
                        className={cn(
                            "px-2 py-1 rounded font-serif transition-colors cursor-pointer",
                            prefs.font === 'serif' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                        )}
                    >
                        Serif
                    </button>
                    <button
                        type="button"
                        onClick={() => updatePrefs({ font: 'sans' })}
                        className={cn(
                            "px-2 py-1 rounded font-sans transition-colors cursor-pointer",
                            prefs.font === 'sans' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                        )}
                    >
                        Sans
                    </button>
                    <button
                        type="button"
                        onClick={() => updatePrefs({ font: 'mono' })}
                        className={cn(
                            "px-2 py-1 rounded font-mono transition-colors cursor-pointer",
                            prefs.font === 'mono' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                        )}
                    >
                        Mono
                    </button>
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center border rounded-lg p-0.5 bg-black/5 dark:bg-white/5 text-xs">
                    <button
                        type="button"
                        onClick={() => updatePrefs({ theme: 'light' })}
                        className={cn(
                            "w-5 h-5 rounded-full bg-white border border-stone-300 transition-transform cursor-pointer",
                            prefs.theme === 'light' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                        )}
                        title={t('reader.lightTheme', 'Açık')}
                    />
                    <button
                        type="button"
                        onClick={() => updatePrefs({ theme: 'sepia' })}
                        className={cn(
                            "w-5 h-5 rounded-full bg-[#fbf0d9] border border-[#d9c49a] ml-1 transition-transform cursor-pointer",
                            prefs.theme === 'sepia' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                        )}
                        title={t('reader.sepiaTheme', 'Sepya')}
                    />
                    <button
                        type="button"
                        onClick={() => updatePrefs({ theme: 'dark' })}
                        className={cn(
                            "w-5 h-5 rounded-full bg-[#18181b] border border-zinc-700 ml-1 transition-transform cursor-pointer",
                            prefs.theme === 'dark' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                        )}
                        title={t('reader.darkTheme', 'Koyu')}
                    />
                </div>

                {/* Quick Action Buttons */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => loadArticle(true)}
                    disabled={isLoading}
                    className="h-8 w-8 cursor-pointer"
                    title={t('reader.reloadArticle', 'Yeniden Yükle')}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-amber-500")} />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkAsRead}
                    className="h-8 w-8 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    title={t('reader.markAsRead', 'Okundu Olarak İşaretle')}
                >
                    <BookmarkCheck className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAppendToNote}
                    className="h-8 w-8 cursor-pointer"
                    title={t('preview.addToNote', 'Notlara Ekle')}
                >
                    <StickyNote className="w-3.5 h-3.5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyText}
                    className="h-8 w-8 cursor-pointer"
                    title={t('reader.copyText', 'Metni Kopyala')}
                >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => useAppStore.getState().openQrCode(bookmark)}
                    className="h-8 w-8 cursor-pointer text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                    title={t('qr.title', 'QR Kod ile Telefona Aktar')}
                >
                    <QrCode className="w-3.5 h-3.5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHighlightsSidebar(prev => !prev)}
                    className={cn(
                        "h-8 w-8 cursor-pointer relative",
                        showHighlightsSidebar || highlightsCount > 0 ? "text-amber-500 hover:text-amber-600 bg-amber-500/10" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={t('reader.highlights.toggleSidebar', 'Vurgular ve Notlar')}
                >
                    <Highlighter className="w-3.5 h-3.5" />
                    {highlightsCount > 0 && (
                        <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 rounded-full bg-amber-500 text-white min-w-3.5 h-3.5 flex items-center justify-center">
                            {highlightsCount}
                        </span>
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleSnapshot}
                    disabled={isSavingSnapshot || !article}
                    className={cn(
                        "h-8 w-8 cursor-pointer relative",
                        isSnapshotSaved ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={isSnapshotSaved ? t('snapshots.savedBadge', 'Offline Archived') : t('snapshots.saveOffline', 'Save Offline (Snapshot)')}
                >
                    <HardDrive className="w-3.5 h-3.5" />
                </Button>

                {bookmark?.url && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(getWaybackMachineUrl(bookmark.url), '_blank')}
                        className="h-8 w-8 cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        title="Internet Archive (Wayback Machine)"
                    >
                        <History className="w-3.5 h-3.5" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => useAppStore.getState().openReminderModal(bookmark)}
                    className={cn(
                        "h-8 w-8 cursor-pointer",
                        bookmark?.reminderAt ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={t('reminders.setReminder', 'Daha Sonra Hatırlat')}
                >
                    <Bell className="w-3.5 h-3.5" />
                </Button>

                {bookmark?.url && (
                    <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-colors"
                        title={t('preview.openExternal', 'Orijinal Sayfayı Aç')}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full ml-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                    title={t('common.close', 'Kapat')}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </header>
    );
}
