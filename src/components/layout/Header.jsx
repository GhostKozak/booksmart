import React, { useState } from 'react'
import { HeaderActionsMenu } from './HeaderActionsMenu'
import { useTranslation } from 'react-i18next'
import {
    Download,
    Undo2,
    Redo2,
    Search,
    History as HistoryIcon,
    X,
    Filter,
    RefreshCw,
    Rss,
    Sparkles,
    PanelLeft,
    Command,
    Calendar
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { HistoryPanel } from '../HistoryPanel'
import { AdvancedSearch } from '../AdvancedSearch'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'

export function Header({
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    past = [],
    future = [],
    // Actions
    duplicateCount = 0,
    removeDuplicates,
    mergeDuplicates,
    cleanableCount = 0,
    cleanAllUrls,
    checkAllLinks,
    isCheckingLinks = false,
    isExtensionConnected = false,
    openExportModal,
    // Browser Sync
    importFromBrowser,
    pushToBrowser,
    twoWaySync,
    isSyncing = false,
    // File
    hasFileLoaded = false,
    closeFile,
    clearAll,
    searchInputRef
}) {
    const { t } = useTranslation()
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false)

    const {
        theme,
        setTheme,
        isHistoryOpen,
        setIsHistoryOpen,
        searchQuery,
        setSearchQuery,
        searchMode,
        setSearchMode,
        isAdvancedSearchOpen,
        setIsAdvancedSearchOpen,
        dateFilter,
        setDateFilter,
        openSettings,
        openExtensionGuide,
        isSidebarOpen,
        setIsSidebarOpen,
        setIsShortcutsOpen,
        setIsCommandPaletteOpen,
        setIsRssReaderOpen
    } = useAppStore()

    const totalUnreadRss = useLiveQuery(async () => {
        const feeds = await db.feeds.toArray()
        return feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0)
    }) || 0

    const hasMaintenanceActions = duplicateCount > 0 || cleanableCount > 0
    const hasHistoryActions = canUndo || canRedo || past.length > 0 || future.length > 0
    const hasDateFilter = Boolean(dateFilter.start || dateFilter.end)

    return (
        <header className="border-b h-14 sm:h-16 flex items-center justify-between px-3 sm:px-5 bg-card/80 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-2xs">
            {/* Left Section: Brand, Sidebar Toggle, Undo/Redo */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Sidebar Toggle Button (Desktop & Mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 text-muted-foreground hover:text-foreground transition-all cursor-pointer",
                        isSidebarOpen && "text-primary bg-primary/10"
                    )}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label={t('header.toggleSidebar', 'Kenar Çubuğunu Aç/Kapat')}
                    title={t('header.toggleSidebar', 'Kenar Çubuğunu Aç/Kapat')}
                >
                    <PanelLeft className="h-4.5 w-4.5" />
                </Button>

                {/* Brand Logo & Title */}
                <div className="flex items-center gap-2 select-none">
                    <Logo className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
                    <h1 className="font-bold text-base sm:text-lg tracking-tight hidden sm:block bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
                        {t('app.title')}
                    </h1>
                </div>

                {/* Undo / Redo / History Toolbar */}
                {hasHistoryActions && (
                    <div className="flex items-center gap-0.5 bg-muted/40 border border-border/50 rounded-lg p-0.5 ml-1 sm:ml-2 animate-in fade-in duration-200">
                        {canUndo && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={undo}
                                title={t('header.undo', 'Geri Al')}
                                aria-label={t('header.undo', 'Geri Al')}
                            >
                                <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {canRedo && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={redo}
                                title={t('header.redo', 'Yinele')}
                                aria-label={t('header.redo', 'Yinele')}
                            >
                                <Redo2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {(past.length > 0 || future.length > 0) && (
                            <>
                                <div className="w-px h-3.5 bg-border/60 mx-0.5" />
                                <Button
                                    variant={isHistoryOpen ? "secondary" : "ghost"}
                                    size="icon"
                                    className={cn("h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer", isHistoryOpen && "bg-muted text-foreground")}
                                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                    title={t('header.history', 'İşlem Geçmişi')}
                                    aria-label={t('header.history', 'İşlem Geçmişi')}
                                >
                                    <HistoryIcon className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}

                        <HistoryPanel
                            isOpen={isHistoryOpen}
                            onClose={() => setIsHistoryOpen(false)}
                            past={past}
                            future={future}
                            onUndo={undo}
                            onRedo={redo}
                        />
                    </div>
                )}
            </div>

            {/* Center Section: Search Bar & Advanced Search Popover */}
            <div
                className={cn(
                    "flex-1 max-w-lg mx-2 lg:mx-4 relative z-50",
                    isMobileSearchActive
                        ? "fixed inset-0 p-3 bg-background/95 backdrop-blur-md flex flex-col justify-start"
                        : "hidden sm:flex sm:flex-col"
                )}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsAdvancedSearchOpen(false)
                    }
                }}
            >
                <div className="flex items-center gap-1.5 w-full">
                    {/* Mobile Search Back/Close Button */}
                    {isMobileSearchActive && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 sm:hidden h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setIsMobileSearchActive(false)}
                            aria-label={t('common.close')}
                            title={t('common.close')}
                        >
                            <X className="h-4.5 w-4.5" />
                        </Button>
                    )}

                    <div className="relative flex-1 min-w-0 group">
                        {/* Search Icon / Mode Indicator */}
                        {searchMode === 'semantic' ? (
                            <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 animate-pulse pointer-events-none" />
                        ) : (
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
                        )}

                        <Input
                            ref={searchInputRef}
                            type="search"
                            aria-label={t('app.searchPlaceholder')}
                            placeholder={
                                searchMode === 'semantic'
                                    ? t('header.semanticPlaceholder', 'Anlamsal ara (örn: React hızlandırma)...')
                                    : searchMode === 'regex'
                                        ? t('header.regexPlaceholder')
                                        : t('app.searchPlaceholder')
                            }
                            className={cn(
                                "pl-8.5 pr-20 bg-muted/40 hover:bg-muted/60 focus:bg-background transition-all h-9 sm:h-9.5 text-xs sm:text-sm rounded-xl border-border/60",
                                searchMode === 'regex' && "font-mono text-xs",
                                searchMode === 'semantic' && "border-violet-500/40 focus:border-violet-500 focus-visible:ring-violet-500/20"
                            )}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        {/* Search Bar Right Controls: Mode Badge, Date Badge & Clear */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {searchMode === 'semantic' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xs select-none">
                                    AI
                                </span>
                            )}
                            {searchMode === 'regex' && (
                                <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-muted text-muted-foreground border select-none">
                                    .*
                                </span>
                            )}
                            {hasDateFilter && (
                                <span
                                    className="text-[10px] p-0.5 rounded bg-muted text-primary"
                                    title="Tarih filtresi aktif"
                                >
                                    <Calendar className="w-3 h-3" />
                                </span>
                            )}
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-muted cursor-pointer"
                                    title={t('header.clearSearch')}
                                    aria-label={t('header.clearSearch')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Advanced Search Options Filter Toggle */}
                    <Button
                        variant={isAdvancedSearchOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                        className={cn(
                            "shrink-0 h-9 w-9 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
                            (isAdvancedSearchOpen || searchMode !== 'simple' || hasDateFilter) && "bg-accent text-accent-foreground border-primary/40"
                        )}
                        title={t('header.advancedSearch')}
                        aria-label={t('header.advancedSearch')}
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                {/* Advanced Search Dropdown Panel */}
                <div className="absolute top-full left-0 right-0 mt-2 z-50">
                    <AdvancedSearch
                        isOpen={isAdvancedSearchOpen}
                        searchMode={searchMode}
                        setSearchMode={setSearchMode}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                    />
                </div>
            </div>

            {/* Right Section: Quick Tools & Actions Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Mobile Search Trigger Button */}
                {!isMobileSearchActive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => setIsMobileSearchActive(true)}
                        title={t('app.searchPlaceholder')}
                        aria-label={t('app.searchPlaceholder')}
                    >
                        <Search className="h-4.5 w-4.5" />
                    </Button>
                )}

                {/* Quick Command Palette Button (⌘K) */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 rounded-lg border border-border/50 cursor-pointer transition-colors"
                    title={t('commandPalette.title', 'Komut Paleti (Ctrl+K)')}
                    aria-label={t('commandPalette.title', 'Komut Paleti')}
                >
                    <Command className="w-3.5 h-3.5" />
                    <span className="font-medium hidden lg:inline">{t('commandPalette.shortTitle', 'Komutlar')}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border rounded shadow-2xs text-muted-foreground font-semibold">⌘K</kbd>
                </Button>

                {/* RSS Feed Reader Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRssReaderOpen(true)}
                    className="relative inline-flex items-center gap-1.5 h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-500/10 cursor-pointer rounded-lg border border-border/40 transition-colors"
                    title={t('rss.readerTitle', 'RSS & Bülten Akışları')}
                    aria-label={t('rss.readerTitle', 'RSS Reader')}
                >
                    <Rss className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden xl:inline font-medium">{t('rss.feedShort', 'Akışlar')}</span>
                    {totalUnreadRss > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white shrink-0 animate-pulse">
                            {totalUnreadRss}
                        </span>
                    )}
                </Button>

                {/* Browser Sync Quick Button (When companion extension is connected) */}
                {isExtensionConnected && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:inline-flex h-8 w-8 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        onClick={() => twoWaySync?.()}
                        disabled={isSyncing}
                        title={t('header.browserSync.twoWay', 'İki Yönlü Tarayıcı Eşitleme')}
                        aria-label={t('header.browserSync.twoWay', 'İki Yönlü Tarayıcı Eşitleme')}
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isSyncing && "animate-spin")} />
                    </Button>
                )}

                {/* Quick Export Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={openExportModal}
                    className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-foreground hover:bg-accent rounded-lg border-border/60 cursor-pointer"
                    title={t('header.export', 'Dışa Aktar')}
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('header.export', 'Dışa Aktar')}</span>
                </Button>

                {/* Mega Actions Menu (Desktop Dropdown + Mobile Bottom Sheet) */}
                <HeaderActionsMenu
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
                    theme={theme}
                    setTheme={setTheme}
                    openSettings={openSettings}
                    hasFileLoaded={hasFileLoaded}
                    openExportModal={openExportModal}
                    closeFile={closeFile}
                    clearAll={clearAll}
                />
            </div>
        </header>
    )
}
