import { useState } from 'react'
import { HeaderActionsMenu } from './HeaderActionsMenu'
import { useTranslation } from 'react-i18next'
import { Download, Undo2, Redo2, Search, History as HistoryIcon, X, Filter, TextAlignStart, RefreshCw, Rss } from 'lucide-react'
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
    canUndo, canRedo, undo, redo, past, future,
    // Actions
    duplicateCount, removeDuplicates, mergeDuplicates,
    cleanableCount, cleanAllUrls,
    checkAllLinks, isCheckingLinks,
    isExtensionConnected = false,
    openExportModal,
    // Browser Sync
    importFromBrowser, pushToBrowser, twoWaySync, isSyncing = false,
    // File
    hasFileLoaded, closeFile, bookmarkCount, clearAll,
    searchInputRef
}) {
    const { t } = useTranslation()
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false)

    const {
        theme, setTheme,
        isHistoryOpen, setIsHistoryOpen,
        searchQuery, setSearchQuery, searchMode, setSearchMode,
        isAdvancedSearchOpen, setIsAdvancedSearchOpen,
        dateFilter, setDateFilter,
        viewMode, setViewMode, showThumbnails, setShowThumbnails,
        sortBy, setSortBy,
        openSettings,
        openExtensionGuide,
        isSidebarOpen, setIsSidebarOpen,
        setIsShortcutsOpen,
        setIsCommandPaletteOpen,
        setIsRssReaderOpen
    } = useAppStore()

    const totalUnreadRss = useLiveQuery(async () => {
        const feeds = await db.feeds.toArray();
        return feeds.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
    }) || 0;

    const hasMaintenanceActions = duplicateCount > 0 || cleanableCount > 0

    return (
        <header className="border-b h-16 flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2">



                <Logo className="h-7 w-7 shrink-0" />
                <h1 className="font-bold text-xl tracking-tight hidden sm:block">{t('app.title')}</h1>
                {/* Mobile Menu Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8 ml-1"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    aria-label={t('common.menu')}
                    title={t('common.menu')}
                >
                    <TextAlignStart className="h-5 w-5" />
                </Button>
                <div className={cn(
                    "flex items-center gap-1",
                    (canUndo || canRedo || past.length > 0 || future.length > 0) ? "ml-2 sm:ml-4 border-l pl-2 sm:pl-4" : ""
                )}>
                    {canUndo && (
                        <Button variant="ghost" size="icon" onClick={undo} title={t('header.undo')} aria-label={t('header.undo')}>
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    )}
                    {canRedo && (
                        <Button variant="ghost" size="icon" onClick={redo} title={t('header.redo')} aria-label={t('header.redo')}>
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    )}
                    {(past.length > 0 || future.length > 0) && (
                        <Button
                            variant={isHistoryOpen ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            title={t('header.history')}
                            aria-label={t('header.history')}
                            className={cn("ml-1", isHistoryOpen && "bg-muted")}
                        >
                            <HistoryIcon className="h-4 w-4" />
                        </Button>
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
            </div>

            {/* Search Bar */}
            <div className={cn(
                "flex-1 max-w-md sm:mx-4 relative z-50",
                isMobileSearchActive
                    ? "absolute inset-0 pt-3.5 px-2 bg-background sm:static sm:pt-0 sm:px-0 sm:bg-transparent flex flex-col"
                    : "hidden sm:flex sm:flex-col mx-2"
            )}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsAdvancedSearchOpen(false)
                    }
                }}
            >
                <div className="flex gap-1 sm:gap-2 w-full">
                    {isMobileSearchActive && (
                        <Button variant="ghost" size="icon" className="shrink-0 sm:hidden" onClick={() => setIsMobileSearchActive(false)} aria-label={t('common.close')} title={t('common.close')}>
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            type="search"
                            aria-label={t('app.searchPlaceholder')}
                            placeholder={searchMode === 'regex' ? t('header.regexPlaceholder') : t('app.searchPlaceholder')}
                            className={cn(
                                "pl-8 pr-8 bg-background/50 focus:bg-background transition-colors h-9 sm:h-10 text-sm",
                                searchMode === 'regex' && "font-mono text-xs"
                            )}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-muted"
                                title={t('header.clearSearch')}
                                aria-label={t('header.clearSearch')}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant={isAdvancedSearchOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
                        className="shrink-0"
                        title={t('header.advancedSearch')}
                        aria-label={t('header.advancedSearch')}
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                {/* Advanced Search Panel */}
                <div className="absolute top-full left-0 right-0 mt-2">
                    <AdvancedSearch
                        isOpen={isAdvancedSearchOpen}
                        searchMode={searchMode}
                        setSearchMode={setSearchMode}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                    />
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
                {!isMobileSearchActive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => setIsMobileSearchActive(true)}
                        title={t('app.searchPlaceholder')}
                        aria-label={t('app.searchPlaceholder')}
                    >
                        <Search className="h-5 w-5" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 rounded-lg border border-border/40"
                    title={t('commandPalette.title', 'Command Palette (Ctrl+K)')}
                    aria-label={t('commandPalette.title', 'Command Palette')}
                >
                    <Search className="w-3.5 h-3.5" />
                    <span className="font-medium">{t('commandPalette.shortTitle', 'Commands')}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border rounded shadow-2xs text-muted-foreground ml-1">⌘K</kbd>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRssReaderOpen(true)}
                    className="relative inline-flex items-center gap-1.5 h-9 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-amber-500/10 cursor-pointer rounded-lg border border-border/40"
                    title={t('rss.readerTitle', 'RSS & Bülten Akışları')}
                    aria-label={t('rss.readerTitle', 'RSS Reader')}
                >
                    <Rss className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden md:inline font-medium">{t('rss.feedShort', 'Akışlar')}</span>
                    {totalUnreadRss > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white shrink-0">
                            {totalUnreadRss}
                        </span>
                    )}
                </Button>

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
                    bookmarkCount={bookmarkCount}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    showThumbnails={showThumbnails}
                    setShowThumbnails={setShowThumbnails}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    theme={theme}
                    setTheme={setTheme}
                    openSettings={openSettings}
                    hasFileLoaded={hasFileLoaded}
                    openExportModal={openExportModal}
                    closeFile={closeFile}
                    clearAll={clearAll}
                />

                <div className="hidden sm:flex items-center border-l pl-2 ml-2 gap-1">
                    {isExtensionConnected && (
                        <Button
                            variant="ghost"
                            className="gap-2 px-3 text-xs"
                            onClick={() => twoWaySync()}
                            disabled={isSyncing}
                            title={t('header.browserSync.twoWay', 'Two-Way Browser Sync')}
                        >
                            <RefreshCw className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                            <span className="hidden xl:inline">{t('header.browserSync.syncBtn', 'Browser Sync')}</span>
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        className="gap-2 px-4"
                        onClick={openExportModal}
                        title={t('header.export')}
                    >
                        <Download className="h-5 w-5" />
                        <span className="hidden lg:inline">{t('header.export')}</span>
                    </Button>
                </div>
            </div >
        </header >
    )
}
