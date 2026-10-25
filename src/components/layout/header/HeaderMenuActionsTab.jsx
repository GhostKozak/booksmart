import {
    Sparkles, RefreshCw, CloudDownload, CloudUpload,
    HelpCircle, Layers, GitMerge, Activity,
    Loader2, Search, Rss, Highlighter
} from 'lucide-react';
import { Button } from '../../ui/button';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

export function HeaderMenuActionsTab({
    isExtensionConnected = false,
    twoWaySync,
    isSyncing = false,
    importFromBrowser,
    pushToBrowser,
    openExtensionGuide,
    hasMaintenanceActions = false,
    duplicateCount = 0,
    mergeDuplicates,
    removeDuplicates,
    cleanableCount = 0,
    cleanAllUrls,
    checkAllLinks,
    isCheckingLinks = false,
    setIsCommandPaletteOpen,
    setIsShortcutsOpen,
    setIsRssReaderOpen,
    totalUnreadRss = 0,
    openMetadataEnricher,
    isEnrichingPreviews = false,
    onActionClick
}) {
    const { t } = useTranslation();

    return (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            {/* Companion Browser Extension Quick Sync */}
            <div className="p-3 rounded-2xl border border-primary/20 bg-primary/5 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            {isExtensionConnected && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={isExtensionConnected ? "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" : "relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/40"}></span>
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                            {t('header.browserSync.title', 'Tarayıcı Eklentisi (Companion)')}
                        </span>
                    </div>
                    {isExtensionConnected && (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                            {t('header.connected', 'Bağlı')}
                        </span>
                    )}
                </div>

                {isExtensionConnected ? (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isSyncing}
                            onClick={() => onActionClick(twoWaySync)}
                            className="h-8 text-xs font-medium cursor-pointer justify-center shadow-xs"
                            title={t('header.browserSync.twoWay', 'İki Yönlü Eşitle')}
                        >
                            <RefreshCw className={isSyncing ? "h-3 w-3 mr-1 animate-spin shrink-0" : "h-3 w-3 mr-1 shrink-0"} />
                            <span className="truncate">{t('header.browserSync.twoWay', 'İki Yönlü Eşitle')}</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSyncing}
                            onClick={() => onActionClick(importFromBrowser)}
                            className="h-8 text-xs font-medium border-border/70 hover:bg-accent cursor-pointer justify-center"
                            title={t('header.browserSync.pull', 'Tarayıcıdan Çek')}
                        >
                            <CloudDownload className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{t('header.browserSync.pull', 'Çek')}</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSyncing}
                            onClick={() => onActionClick(pushToBrowser)}
                            className="h-8 text-xs font-medium border-border/70 hover:bg-accent cursor-pointer justify-center"
                            title={t('header.browserSync.push', 'Tarayıcıya Gönder')}
                        >
                            <CloudUpload className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{t('header.browserSync.push', 'Gönder')}</span>
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/50">
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {t('header.extensionNotConnectedDesc', 'Sunucusuz CORS\'suz link kontrolü ve iki yönlü senkronizasyonu açın.')}
                        </p>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onActionClick(openExtensionGuide)}
                            className="h-7 px-2.5 text-[11px] shrink-0 rounded-lg cursor-pointer font-medium"
                        >
                            {t('header.installExtensionBtn', 'Eklenti Rehberi')}
                        </Button>
                    </div>
                )}
            </div>

            {/* Maintenance Operations (Duplicates & URL Cleaning) */}
            {hasMaintenanceActions && (
                <div className="p-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            <span>{t('header.maintenance', 'Bakım & İyileştirme')}</span>
                        </span>
                    </div>

                    {duplicateCount > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onActionClick(mergeDuplicates)}
                                className="h-8 text-xs font-medium text-primary hover:bg-primary/10 border-primary/20 bg-background/60 cursor-pointer justify-center"
                            >
                                <GitMerge className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                <span className="truncate">{t('header.mergeDuplicates', { count: duplicateCount, defaultValue: `${duplicateCount} Birleştir` })}</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onActionClick(removeDuplicates)}
                                className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 border-destructive/20 bg-background/60 cursor-pointer justify-center"
                            >
                                <Layers className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                <span className="truncate">{t('header.removeDuplicates', { count: duplicateCount, defaultValue: `${duplicateCount} Yinelemeyi Kaldır` })}</span>
                            </Button>
                        </div>
                    )}
                    {cleanableCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onActionClick(cleanAllUrls)}
                            className="w-full h-8 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border-amber-500/20 bg-background/60 cursor-pointer justify-center"
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span>{t('header.cleanUrls', { count: cleanableCount, defaultValue: `${cleanableCount} URL'yi Temizle` })}</span>
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick(() => useAppStore.getState().openSimilarDuplicatesModal())}
                        className="w-full h-8 text-xs font-medium text-primary hover:bg-primary/10 border-primary/20 bg-background/60 cursor-pointer justify-center"
                    >
                        <GitMerge className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span>{t('similarDuplicates.menuBtn', 'Benzer & Yinelenenleri İncele ve Birleştir')}</span>
                    </Button>
                </div>
            )}

            {/* RSS Feeds Quick Action */}
            <button
                type="button"
                onClick={() => onActionClick(() => setIsRssReaderOpen(true))}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-foreground transition-all cursor-pointer group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                        <Rss className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-semibold">{t('rss.readerTitle', 'RSS & Bülten Akışları')}</div>
                        <div className="text-[10px] text-muted-foreground">{t('rss.readerSubtitle', 'Takip edilen siteler ve yeni yazılar')}</div>
                    </div>
                </div>
                {totalUnreadRss > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                        {totalUnreadRss} yeni
                    </span>
                )}
            </button>

            {/* Highlights & Sticky Notes Hub Quick Action */}
            <button
                type="button"
                onClick={() => onActionClick(() => useAppStore.getState().openHighlightsModal())}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-foreground transition-all cursor-pointer group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                        <Highlighter className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-semibold">{t('highlights.menuTitle', 'Highlights & Sticky Notes')}</div>
                        <div className="text-[10px] text-muted-foreground">{t('highlights.menuSubtitle', 'Web clippings and Obsidian (.md) export')}</div>
                    </div>
                </div>
            </button>

            {/* Health Check Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={checkAllLinks}
                disabled={isCheckingLinks}
                className="w-full h-9 justify-center font-medium text-xs border border-border/70 hover:bg-accent/80 cursor-pointer"
            >
                {isCheckingLinks ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                ) : (
                    <Activity className="h-4 w-4 mr-2 text-rose-500" />
                )}
                <span>{isCheckingLinks ? t('header.checking', 'Kontrol ediliyor...') : t('header.checkHeart', 'Tüm Linkleri Kontrol Et')}</span>
                {isExtensionConnected && (
                    <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-normal">
                        CORS-Free
                    </span>
                )}
            </Button>

            {/* Metadata & Favicon Enricher Quick Action */}
            {openMetadataEnricher && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onActionClick(openMetadataEnricher)}
                    disabled={isEnrichingPreviews}
                    className="w-full h-9 justify-center font-medium text-xs border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 cursor-pointer"
                >
                    {isEnrichingPreviews ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-violet-600 dark:text-violet-400" />
                    ) : (
                        <Sparkles className="h-4 w-4 mr-2 text-violet-600 dark:text-violet-400" />
                    )}
                    <span>{isEnrichingPreviews ? t('metadataEnricher.running', 'Zenginleştiriliyor...') : t('header.enrichMetadata', 'Eksik Başlık & İkonları Tamamla')}</span>
                </Button>
            )}

            {/* Productivity Tools (Command Palette & Shortcuts) */}
            <div className="grid grid-cols-2 gap-1.5">
                <button
                    type="button"
                    onClick={() => onActionClick(() => setIsCommandPaletteOpen(true))}
                    className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-background/60 hover:bg-accent/60 text-foreground transition-all cursor-pointer text-left"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{t('commandPalette.title', 'Komut Paleti')}</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted border rounded text-muted-foreground ml-1">⌘K</kbd>
                </button>

                <button
                    type="button"
                    onClick={() => onActionClick(() => setIsShortcutsOpen(true))}
                    className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-background/60 hover:bg-accent/60 text-foreground transition-all cursor-pointer text-left"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{t('header.shortcuts', 'Kısayollar')}</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-muted border rounded text-muted-foreground ml-1">?</kbd>
                </button>
            </div>
        </div>
    );
}
