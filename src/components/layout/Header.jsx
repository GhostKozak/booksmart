import { useState } from 'react'
import { DropdownMenu, DropdownItem, DropdownSeparator, DropdownLabel } from '../ui/DropdownMenu'
import { useTranslation } from 'react-i18next'
import { Sun, Moon, Download, Settings, Layers, Activity, Loader2, HelpCircle, BarChart3, List, Undo2, Redo2, Search, LogOut, History as HistoryIcon, X, LayoutGrid, Image, Filter, Sparkles, MoreVertical, Trash2, TextAlignStart, ArrowUpDown } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { HistoryPanel } from '../HistoryPanel'
import { AdvancedSearch } from '../AdvancedSearch'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'

export function Header({
    // Undo/Redo
    canUndo, canRedo, undo, redo, past, future,
    // Actions
    duplicateCount, removeDuplicates,
    cleanableCount, cleanAllUrls,
    checkAllLinks, isCheckingLinks,
    openExportModal,
    // File
    hasFileLoaded, closeFile, bookmarkCount, clearAll,
}) {
    const { t, i18n } = useTranslation()
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
        isSidebarOpen, setIsSidebarOpen,
        setIsShortcutsOpen
    } = useAppStore()

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
                >
                    <TextAlignStart className="h-5 w-5" />
                </Button>
                <div className={cn(
                    "flex items-center gap-1",
                    (canUndo || canRedo || past.length > 0 || future.length > 0) ? "ml-2 sm:ml-4 border-l pl-2 sm:pl-4" : ""
                )}>
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
                        <Button variant="ghost" size="icon" className="shrink-0 sm:hidden" onClick={() => setIsMobileSearchActive(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
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
                {!isMobileSearchActive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => setIsMobileSearchActive(true)}
                        title={t('app.searchPlaceholder')}
                    >
                        <Search className="h-5 w-5" />
                    </Button>
                )}

                <DropdownMenu
                    trigger={
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    }
                >
                    <DropdownLabel>{t('common.actions')}</DropdownLabel>

                    {hasMaintenanceActions && (
                        <div className="bg-muted/30 rounded-lg p-1 sm:p-2 my-1">
                            <DropdownLabel className="text-[10px] sm:text-[11px] uppercase tracking-wider mb-1 px-1">{t('header.maintenance')}</DropdownLabel>
                            {duplicateCount > 0 && (
                                <DropdownItem onClick={removeDuplicates} className="text-red-600 dark:text-red-400 py-1.5 sm:py-2 text-[11px] sm:text-sm">
                                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    {t('header.removeDuplicates', { count: duplicateCount })}
                                </DropdownItem>
                            )}
                            {cleanableCount > 0 && (
                                <DropdownItem onClick={cleanAllUrls} className="text-amber-600 dark:text-amber-400 py-1.5 sm:py-2 text-[11px] sm:text-sm">
                                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    {t('header.cleanUrls', { count: cleanableCount })}
                                </DropdownItem>
                            )}
                        </div>
                    )}

                    {bookmarkCount > 0 && (
                        <>
                            <DropdownLabel className="text-[10px] sm:text-[11px] uppercase tracking-wider px-1">{t('header.view')}</DropdownLabel>
                            <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-1">
                                <DropdownItem onClick={() => setViewMode('list')} className={cn("justify-center py-1.5 sm:py-2 text-[11px] sm:text-sm", viewMode === 'list' && "bg-accent")}>
                                    <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    <span>{t('header.listView')}</span>
                                </DropdownItem>
                                <DropdownItem onClick={() => setViewMode('grid')} className={cn("justify-center py-1.5 sm:py-2 text-[11px] sm:text-sm", viewMode === 'grid' && "bg-accent")}>
                                    <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    <span>{t('header.gridView')}</span>
                                </DropdownItem>
                            </div>

                            <div className={cn("grid gap-1 sm:gap-2 mb-1", viewMode === 'grid' ? "grid-cols-2" : "grid-cols-1")}>
                                <DropdownItem onClick={() => setViewMode('analytics')} className={cn("py-1.5 sm:py-2 text-[11px] sm:text-sm justify-center", viewMode === 'analytics' && "bg-accent")}>
                                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    {t('header.analytics')}
                                </DropdownItem>

                                {viewMode === 'grid' && (
                                    <DropdownItem onClick={() => setShowThumbnails(!showThumbnails)} className="py-1.5 sm:py-2 text-[11px] sm:text-sm justify-center">
                                        <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                        {showThumbnails ? t('header.hideThumbnails') : t('header.showThumbnails')}
                                    </DropdownItem>
                                )}
                            </div>

                            <DropdownSeparator />

                            <DropdownLabel className="text-[10px] sm:text-[11px] uppercase tracking-wider px-1">{t('header.sort.label')}</DropdownLabel>
                            <div className="grid grid-cols-2 gap-1 sm:gap-2 max-h-40 sm:max-h-60 overflow-y-auto pr-1">
                                {[
                                    { key: 'default', label: t('header.sort.default') },
                                    { key: 'title-az', label: t('header.sort.titleAz') },
                                    { key: 'title-za', label: t('header.sort.titleZa') },
                                    { key: 'date-new', label: t('header.sort.dateNew') },
                                    { key: 'date-old', label: t('header.sort.dateOld') },
                                    { key: 'domain', label: t('header.sort.domain') },
                                    { key: 'folder', label: t('header.sort.folder') },
                                ].map(opt => (
                                    <DropdownItem
                                        key={opt.key}
                                        onClick={() => setSortBy(opt.key)}
                                        className={cn("text-[10px] sm:text-[11px] py-1.5 sm:py-2 h-auto truncate justify-center sm:justify-start", sortBy === opt.key && "bg-accent text-accent-foreground font-bold border border-accent-foreground/10")}
                                    >
                                        {opt.label}
                                    </DropdownItem>
                                ))}
                            </div>

                            <DropdownSeparator />
                        </>
                    )}

                    <DropdownLabel className="text-[10px] sm:text-[11px] uppercase tracking-wider px-1">{t('settings.language.label')}</DropdownLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 mb-1 px-1">
                        {[
                            { code: 'tr', flag: '🇹🇷' },
                            { code: 'en', flag: '🇺🇸' },
                            { code: 'es', flag: '🇪🇸' },
                            { code: 'fr', flag: '🇫🇷' },
                            { code: 'de', flag: '🇩🇪' },
                        ].map(lang => (
                            <DropdownItem
                                key={lang.code}
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className={cn("justify-center py-1.5 sm:py-2 h-10 sm:h-12 text-lg sm:text-xl", i18n.language.startsWith(lang.code) && "bg-accent border")}
                            >
                                <span className="drop-shadow-sm">{lang.flag}</span>
                            </DropdownItem>
                        ))}
                    </div>

                    <DropdownSeparator />

                    <div className="grid grid-cols-2 gap-1 sm:gap-2 px-1">
                        <DropdownItem onClick={checkAllLinks} disabled={isCheckingLinks} className="py-1.5 sm:py-2 text-[11px] sm:text-sm">
                            {isCheckingLinks ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 animate-spin" /> : <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-rose-500" />}
                            <span>{isCheckingLinks ? t('header.checking') : t('header.checkHeart')}</span>
                        </DropdownItem>

                        <DropdownItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="py-1.5 sm:py-2 text-[11px] sm:text-sm">
                            {theme === "dark" ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />}
                            <span>{theme === "dark" ? t('header.lightMode') : t('header.darkMode')}</span>
                        </DropdownItem>
                    </div>

                    <DropdownSeparator />

                    <div className="grid grid-cols-2 gap-1 sm:gap-2 px-1">
                        <DropdownItem onClick={() => setIsShortcutsOpen(true)} className="py-1.5 sm:py-2 text-[11px] sm:text-sm">
                            <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            {t('header.shortcuts')}
                        </DropdownItem>

                        <DropdownItem onClick={() => openSettings('folders')} className="py-1.5 sm:py-2 text-[11px] sm:text-sm">
                            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            {t('header.settings')}
                        </DropdownItem>
                    </div>

                    {hasFileLoaded && (
                        <>
                            <DropdownSeparator />
                            <div className="grid grid-cols-2 gap-1 sm:gap-2 px-1 mb-1">
                                <DropdownItem onClick={openExportModal} className="sm:hidden py-1.5 sm:py-2 text-[11px] sm:text-sm">
                                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    {t('header.export')}
                                </DropdownItem>

                                <DropdownItem onClick={closeFile} className="py-1.5 sm:py-2 text-[11px] sm:text-sm">
                                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                    <span>{t('header.closeFile')}</span>
                                </DropdownItem>
                            </div>

                            <DropdownItem onClick={clearAll} className="text-red-600 dark:text-red-400 py-1.5 sm:py-2 text-[11px] sm:text-sm">
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                {t('common.clearAll')}
                            </DropdownItem>
                        </>
                    )}
                </DropdownMenu>

                <div className="hidden sm:flex items-center border-l pl-2 ml-2">

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
