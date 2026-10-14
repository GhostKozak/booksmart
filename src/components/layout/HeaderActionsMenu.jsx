import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MoreVertical, X, Sparkles, Settings, Sliders } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { HeaderMenuActionsTab } from './header/HeaderMenuActionsTab';
import { HeaderMenuPreferencesTab } from './header/HeaderMenuPreferencesTab';

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
    const { t } = useTranslation();
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
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
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
                {activeTab === 'actions' && (
                    <HeaderMenuActionsTab
                        isExtensionConnected={isExtensionConnected}
                        twoWaySync={twoWaySync}
                        isSyncing={isSyncing}
                        importFromBrowser={importFromBrowser}
                        pushToBrowser={pushToBrowser}
                        openExtensionGuide={openExtensionGuide}
                        hasMaintenanceActions={hasMaintenanceActions}
                        duplicateCount={duplicateCount}
                        mergeDuplicates={mergeDuplicates}
                        removeDuplicates={removeDuplicates}
                        cleanableCount={cleanableCount}
                        cleanAllUrls={cleanAllUrls}
                        checkAllLinks={checkAllLinks}
                        isCheckingLinks={isCheckingLinks}
                        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
                        setIsShortcutsOpen={setIsShortcutsOpen}
                        setIsRssReaderOpen={setIsRssReaderOpen}
                        totalUnreadRss={totalUnreadRss}
                        onActionClick={handleActionClick}
                    />
                )}

                {activeTab === 'preferences' && (
                    <HeaderMenuPreferencesTab
                        theme={theme}
                        setTheme={setTheme}
                        openSettings={openSettings}
                        hasFileLoaded={hasFileLoaded}
                        openExportModal={openExportModal}
                        closeFile={closeFile}
                        clearAll={clearAll}
                        onActionClick={handleActionClick}
                    />
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
                    "rounded-full transition-all duration-200 cursor-pointer",
                    isOpen && "bg-accent shadow-xs text-foreground ring-1 ring-border"
                )}
                aria-label={t('common.actions', 'İşlemler')}
                title={t('common.actions', 'İşlemler')}
                onClick={() => setIsOpen(!isOpen)}
            >
                <MoreVertical className="h-5 w-5" />
            </Button>

            {/* Desktop Floating Popover */}
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

            {/* Mobile Bottom Sheet Drawer */}
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
