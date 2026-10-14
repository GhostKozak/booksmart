import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    MoreVertical, X, Sparkles, RefreshCw, CloudDownload, CloudUpload,
    HelpCircle, Layers, GitMerge, Activity,
    Loader2, Monitor, Sun, Moon, Search, Settings, Download,
    LogOut, Trash2, Rss, Sliders, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export function HeaderActionsMenu({
    // Companion Extension
    isExtensionConnected = false,
    twoWaySync,
    isSyncing = false,
    importFromBrowser,
    pushToBrowser,
    openExtensionGuide,
    // Maintenance
    hasMaintenanceActions = false,
    duplicateCount = 0,
    mergeDuplicates,
    removeDuplicates,
    cleanableCount = 0,
    cleanAllUrls,
    // Health & Search
    checkAllLinks,
    isCheckingLinks = false,
    setIsCommandPaletteOpen,
    setIsShortcutsOpen,
    setIsRssReaderOpen,
    totalUnreadRss = 0,
    // Preferences & Settings
    theme = 'system',
    setTheme,
    openSettings,
    // File
    hasFileLoaded = false,
    openExportModal,
    closeFile,
    clearAll
}) {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'preferences'
    const menuRef = useRef(null);

    // Responsive screen size detection
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 640;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close on click outside (Desktop) or Escape key (Desktop & Mobile)
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (!isMobile && menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isMobile]);

    // Prevent background body scroll when mobile bottom sheet is open
    useEffect(() => {
        if (isOpen && isMobile && typeof document !== 'undefined') {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen, isMobile]);

    // Helper to close modal after action
    const handleActionClick = useCallback((actionFn) => {
        if (typeof actionFn === 'function') {
            actionFn();
        }
        setIsOpen(false);
    }, []);

    // Languages definition
    const languages = [
        { code: 'tr', flag: '🇹🇷', label: 'TR' },
        { code: 'en', flag: '🇺🇸', label: 'EN' },
        { code: 'es', flag: '🇪🇸', label: 'ES' },
        { code: 'fr', flag: '🇫🇷', label: 'FR' },
        { code: 'de', flag: '🇩🇪', label: 'DE' },
    ];

    // Shared Menu Content (rendered both in desktop popover and mobile portal drawer)
    const menuContent = (
        <>
            {/* Header Bar */}
            <div className="px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-primary/10 text-primary">
                        <Sliders className="h-4 w-4" />
                    </span>
                    <span className="font-bold text-sm tracking-tight text-foreground">
                        {t('common.actions', 'Hızlı İşlemler & Menü')}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Extension Status Badge */}
                    <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1",
                        isExtensionConnected
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground border border-border/60"
                    )}>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isExtensionConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                        )} />
                        {isExtensionConnected ? t('modals.extensionGuide.statusActive', 'Eklenti Aktif') : t('settings.network.extensionNotDetected', 'Eklenti Yok')}
                    </span>

                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setIsOpen(false)}
                        aria-label={t('common.close', 'Kapat')}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Segmented Navigation Tabs (2 Tabs: İşlemler & Tercihler) */}
            <div className="px-3 pt-2.5 pb-1.5 shrink-0 bg-muted/20">
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted/70 dark:bg-muted/40 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setActiveTab('actions')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all text-xs font-medium cursor-pointer",
                            activeTab === 'actions'
                                ? "bg-background text-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                        )}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>{t('header.tools', 'İşlemler & Araçlar')}</span>
                        {(hasMaintenanceActions || totalUnreadRss > 0) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('preferences')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all text-xs font-medium cursor-pointer",
                            activeTab === 'preferences'
                                ? "bg-background text-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                        )}
                    >
                        <Settings className="w-3.5 h-3.5 text-violet-500" />
                        <span>{t('header.settings', 'Tercihler & Sistem')}</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Tab Content Body */}
            <div className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 space-y-3 max-h-[62dvh] sm:max-h-[calc(84vh-120px)]">

                {/* ============================================================== */}
                {/* TAB 1: İŞLEMLER (ACTIONS & COMPANION EXTENSION)                */}
                {/* ============================================================== */}
                {activeTab === 'actions' && (
                    <div className="space-y-3 animate-in fade-in-50 duration-150">
                        {/* Companion Extension Box */}
                        <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isSyncing && "animate-spin")} />
                                    <span>{t('header.browserSync.label', 'Tarayıcı Yer İmleri Eşitleme')}</span>
                                </div>
                                <span className={cn(
                                    "text-[9px] px-1.5 py-0.2 rounded font-medium",
                                    isExtensionConnected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                )}>
                                    {isExtensionConnected ? 'Companion Connected' : 'Extension Offline'}
                                </span>
                            </div>

                            {isExtensionConnected ? (
                                <div className="grid grid-cols-3 gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isSyncing}
                                        onClick={() => handleActionClick(twoWaySync)}
                                        className="h-8 text-xs font-medium border-primary/30 hover:bg-primary/10 hover:border-primary text-primary cursor-pointer justify-center"
                                        title={t('header.browserSync.twoWay', 'İki Yönlü Eşitle')}
                                    >
                                        <RefreshCw className={cn("h-3 w-3 mr-1 shrink-0", isSyncing && "animate-spin")} />
                                        <span className="truncate">{t('header.browserSync.twoWay', 'İki Yönlü Eşitle')}</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isSyncing}
                                        onClick={() => handleActionClick(importFromBrowser)}
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
                                        onClick={() => handleActionClick(pushToBrowser)}
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
                                        onClick={() => handleActionClick(openExtensionGuide)}
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
                                            onClick={() => handleActionClick(mergeDuplicates)}
                                            className="h-8 text-xs font-medium text-primary hover:bg-primary/10 border-primary/20 bg-background/60 cursor-pointer justify-center"
                                        >
                                            <GitMerge className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                            <span className="truncate">{t('header.mergeDuplicates', { count: duplicateCount, defaultValue: `${duplicateCount} Birleştir` })}</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleActionClick(removeDuplicates)}
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
                                        onClick={() => handleActionClick(cleanAllUrls)}
                                        className="w-full h-8 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border-amber-500/20 bg-background/60 cursor-pointer justify-center"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                        <span>{t('header.cleanUrls', { count: cleanableCount, defaultValue: `${cleanableCount} URL'yi Temizle` })}</span>
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* RSS Feeds Quick Action */}
                        <button
                            type="button"
                            onClick={() => handleActionClick(() => setIsRssReaderOpen(true))}
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

                        {/* Productivity Tools (Command Palette & Shortcuts) */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleActionClick(() => setIsCommandPaletteOpen(true))}
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
                                onClick={() => handleActionClick(() => setIsShortcutsOpen(true))}
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
                )}

                {/* ============================================================== */}
                {/* TAB 2: TERCİHLER & SİSTEM (THEME, LANGUAGE, EXPORT, FILE)      */}
                {/* ============================================================== */}
                {activeTab === 'preferences' && (
                    <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                        {/* Theme Switcher */}
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                                {t('header.themeLabel', 'Tema')}
                            </div>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-accent/30 border border-border/50 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setTheme('system')}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                        theme === 'system' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                    )}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    <span>{t('header.system', 'Sistem')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('light')}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                        theme === 'light' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                    )}
                                >
                                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                                    <span>{t('header.lightMode', 'Açık')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('dark')}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                        theme === 'dark' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                    )}
                                >
                                    <Moon className="h-3.5 w-3.5 text-indigo-400" />
                                    <span>{t('header.darkMode', 'Koyu')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div className="pt-1 border-t border-border/40">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                                {t('settings.language.label', 'Dil')}
                            </div>
                            <div className="grid grid-cols-5 gap-1.5">
                                {languages.map(lang => {
                                    const isSelected = i18n.language?.startsWith(lang.code);
                                    return (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => i18n.changeLanguage(lang.code)}
                                            className={cn(
                                                "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs transition-all cursor-pointer gap-1",
                                                isSelected
                                                    ? "bg-accent border-primary/40 ring-1 ring-primary/20 shadow-xs font-bold text-foreground"
                                                    : "bg-background/60 hover:bg-accent/50 border-border/40 text-muted-foreground hover:text-foreground"
                                            )}
                                            title={lang.code.toUpperCase()}
                                        >
                                            <span className="text-lg leading-none">{lang.flag}</span>
                                            <span className="text-[10px]">{lang.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* App Settings Button */}
                        <div className="pt-1 border-t border-border/40">
                            <button
                                type="button"
                                onClick={() => handleActionClick(() => openSettings('folders'))}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/70 hover:bg-accent text-foreground transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold">{t('header.settings', 'Genel Ayarlar & Kurallar')}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">→</span>
                            </button>
                        </div>

                        {/* Data & Session Management */}
                        {hasFileLoaded && (
                            <div className="pt-1 border-t border-border/40 space-y-2">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                    {t('header.dataManagement', 'Veri & Oturum')}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick(openExportModal)}
                                    className="w-full h-9 text-xs font-medium justify-center border-border/70 hover:bg-accent cursor-pointer"
                                >
                                    <Download className="h-3.5 w-3.5 mr-2 text-sky-500" />
                                    <span>{t('header.export', 'Yer İmlerini Dışa Aktar (HTML/JSON/CSV)')}</span>
                                </Button>

                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleActionClick(closeFile)}
                                        className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground justify-center bg-muted/30 border border-border/40 cursor-pointer"
                                    >
                                        <LogOut className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                        <span className="truncate">{t('header.closeFile', 'Klasörü Kapat')}</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleActionClick(clearAll)}
                                        className="h-8 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-destructive hover:text-destructive-foreground justify-center bg-destructive/5 border border-destructive/20 cursor-pointer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="truncate">{t('common.clearAll', 'Tümünü Sıfırla')}</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className="relative inline-block" ref={menuRef}>
            {/* Trigger Button */}
            <Button
                variant={isOpen ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                    "rounded-full transition-all duration-200",
                    isOpen && "bg-accent shadow-xs text-foreground ring-1 ring-border"
                )}
                aria-label={t('common.actions', 'İşlemler')}
                title={t('common.actions', 'İşlemler')}
                onClick={() => setIsOpen(!isOpen)}
            >
                <MoreVertical className="h-5 w-5" />
            </Button>

            {/* Desktop Floating Popover (rendered inline attached to trigger) */}
            {isOpen && !isMobile && (
                <div
                    className="absolute right-0 top-full mt-2 w-[380px] max-h-[84vh] z-50 bg-card/98 backdrop-blur-2xl text-popover-foreground shadow-2xl border border-border/70 rounded-2xl flex flex-col ring-1 ring-white/10 dark:ring-white/5 animate-in slide-in-from-top-2 zoom-in-95 duration-150 origin-top-right"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('common.actions', 'İşlemler')}
                >
                    {menuContent}
                </div>
            )}

            {/* Mobile Bottom Sheet Drawer (Portaled directly to document.body to break out of header containing block) */}
            {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-100 flex flex-col justify-end">
                    {/* Darkened backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Bottom Sheet Drawer */}
                    <div
                        className="relative z-10 w-full bg-card/98 backdrop-blur-2xl text-popover-foreground shadow-2xl border-t border-border/70 rounded-t-3xl max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom duration-250 ease-out pb-6"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('common.actions', 'İşlemler')}
                    >
                        {/* Drag Handle */}
                        <div
                            className="w-full pt-3 pb-1.5 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                        </div>

                        {menuContent}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
