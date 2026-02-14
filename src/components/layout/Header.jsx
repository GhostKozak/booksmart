import { DropdownMenu, DropdownItem, DropdownSeparator, DropdownLabel } from '../ui/DropdownMenu'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Upload, Download, Plus, Settings, Layers, Activity, Loader2, HelpCircle, BarChart3, List, Undo2, Redo2, Search, LogOut, History as HistoryIcon, X, LayoutGrid, Image, Filter, Sparkles, MoreVertical, Trash2 } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { HistoryPanel } from '../HistoryPanel'
import { AdvancedSearch } from '../AdvancedSearch'
import { cn } from '../../lib/utils'

export function Header({
    // Theme
    theme, setTheme,
    // Undo/Redo
    canUndo, canRedo, undo, redo, past, future,
    // History
    isHistoryOpen, setIsHistoryOpen,
    // Search
    searchQuery, setSearchQuery, searchMode, searchInputRef,
    // Advanced Search
    isAdvancedSearchOpen, setIsAdvancedSearchOpen,
    setSearchMode, dateFilter, setDateFilter,
    // View mode
    viewMode, setViewMode, showThumbnails, setShowThumbnails,
    // Actions
    duplicateCount, removeDuplicates,
    cleanableCount, cleanAllUrls,
    checkAllLinks, isCheckingLinks,
    openExportModal,
    // File
    hasFileLoaded, closeFile, bookmarkCount, clearAll,
    // Settings
    openSettings,
    // Sidebar
    isSidebarOpen, setIsSidebarOpen,
    // Shortcuts
    setIsShortcutsOpen
}) {
    const { t, i18n } = useTranslation()

    const hasMaintenanceActions = duplicateCount > 0 || cleanableCount > 0

    return (
        <header className="border-b h-16 flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <Logo className="h-7 w-7 shrink-0" />
                <h1 className="font-bold text-xl tracking-tight hidden sm:block">{t('app.title')}</h1>
                <div className="flex items-center gap-1 ml-4 border-l pl-4">
                    {canUndo && (
                        <Button variant="ghost" size="icon" onClick={undo} title={t('header.undo')}>
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    )}
                    {canRedo && (
                        <Button variant="ghost" size="icon" onClick={redo} title={t('header.redo')}>
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    )}
                    {(past.length > 0 || future.length > 0) && (
                        <Button
                            variant={isHistoryOpen ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            title={t('header.history')}
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
            <div className="flex-1 max-w-md mx-2 sm:mx-4 flex flex-col relative z-20"
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsAdvancedSearchOpen(false)
                    }
                }}
            >
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={searchMode === 'regex' ? "e.g. ^https?://.*\\.dev" : t('app.searchPlaceholder')}
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
                <DropdownMenu
                    trigger={
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    }
                >
                    <DropdownLabel>{t('common.actions')}</DropdownLabel>

                    {hasMaintenanceActions && (
                        <>
                            <DropdownLabel>{t('header.maintenance')}</DropdownLabel>
                            {duplicateCount > 0 && (
                                <DropdownItem onClick={removeDuplicates} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                                    <Layers className="h-4 w-4 mr-2" />
                                    {t('header.removeDuplicates', { count: duplicateCount })}
                                </DropdownItem>
                            )}
                            {cleanableCount > 0 && (
                                <DropdownItem onClick={cleanAllUrls} className="text-amber-600 dark:text-amber-400">
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t('header.cleanUrls', { count: cleanableCount })}
                                </DropdownItem>
                            )}
                            <DropdownSeparator />
                        </>
                    )}

                    {bookmarkCount > 0 && (
                        <>
                            <DropdownLabel>{t('header.view')}</DropdownLabel>
                            <DropdownItem onClick={() => setViewMode('list')} className={viewMode === 'list' ? "bg-accent" : ""}>
                                <List className="h-4 w-4 mr-2" />
                                {t('header.listView')}
                            </DropdownItem>

                            <DropdownItem onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? "bg-accent" : ""}>
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                {t('header.gridView')}
                            </DropdownItem>

                            {viewMode === 'grid' && (
                                <DropdownItem onClick={() => setShowThumbnails(!showThumbnails)}>
                                    <Image className="h-4 w-4 mr-2" />
                                    {showThumbnails ? t('header.hideThumbnails') : t('header.showThumbnails')}
                                </DropdownItem>
                            )}

                            <DropdownItem onClick={() => setViewMode('analytics')} className={viewMode === 'analytics' ? "bg-accent" : ""}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                {t('header.analytics')}
                            </DropdownItem>

                            <DropdownSeparator />

                        </>
                    )}

                    <DropdownLabel>{t('settings.language.label')}</DropdownLabel>
                    <DropdownItem onClick={() => i18n.changeLanguage('tr')} className={i18n.language.startsWith('tr') ? "bg-accent" : ""}>
                        <span className="mr-2 text-lg">🇹🇷</span>
                        Türkçe
                    </DropdownItem>
                    <DropdownItem onClick={() => i18n.changeLanguage('en')} className={i18n.language.startsWith('en') ? "bg-accent" : ""}>
                        <span className="mr-2 text-lg">🇺🇸</span>
                        English
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownLabel>{t('header.tools')}</DropdownLabel>
                    <DropdownItem onClick={checkAllLinks} disabled={isCheckingLinks}>
                        {isCheckingLinks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                        {isCheckingLinks ? t('header.checking') : t('header.checkHealth')}
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem onClick={() => setIsShortcutsOpen(true)}>
                        <HelpCircle className="h-4 w-4 mr-2" />
                        {t('header.shortcuts')}
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownLabel>{t('header.system')}</DropdownLabel>
                    <DropdownItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                        {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </DropdownItem>

                    <DropdownSeparator />

                    <DropdownItem onClick={() => openSettings('folders')}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('header.settings')}
                    </DropdownItem>

                    {hasFileLoaded && (
                        <>
                            <DropdownSeparator />
                            <DropdownItem onClick={closeFile}>
                                <LogOut className="h-4 w-4 mr-2" />
                                {t('header.closeFile')}
                            </DropdownItem>

                            <DropdownItem onClick={clearAll} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('common.clearAll')}
                            </DropdownItem>
                        </>
                    )}
                </DropdownMenu>

                <div className="flex items-center border-l pl-1 ml-1 sm:pl-2 sm:ml-2">
                    {/* Mobile Menu Toggle (Moved Right) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <Settings className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        className="hidden lg:inline-flex gap-2"
                        onClick={openExportModal}
                        title={t('header.export')}
                    >
                        <Download className="h-5 w-5" />
                        {t('header.export')}
                    </Button>
                </div>
            </div>
        </header >
    )
}
