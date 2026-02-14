import { Sun, Moon, Upload, Download, Plus, Folder, Settings, Layers, Activity, Loader2, HelpCircle, BarChart3, List, Undo2, Redo2, Search, LogOut, History as HistoryIcon, X, LayoutGrid, Image, Filter, Sparkles } from 'lucide-react'
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
    hasFileLoaded, closeFile, bookmarkCount,
    // Settings
    openSettings,
    // Sidebar
    isSidebarOpen, setIsSidebarOpen,
    // Shortcuts
    setIsShortcutsOpen
}) {
    return (
        <header className="border-b h-16 flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-2">
                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden mr-2 -ml-2"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <Settings className="h-5 w-5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex mr-2"
                    onClick={() => openSettings('folders')}
                    title="Taxonomy Settings"
                >
                    <Settings className="h-5 w-5" />
                </Button>

                <Folder className="h-6 w-6 text-primary shrink-0" />
                <h1 className="font-bold text-xl tracking-tight hidden sm:block">BookSmart</h1>
                <div className="flex items-center gap-1 ml-4 border-l pl-4">
                    {canUndo && (
                        <Button variant="ghost" size="icon" onClick={undo} title="Undo (Ctrl+Z)">
                            <Undo2 className="h-4 w-4" />
                        </Button>
                    )}
                    {canRedo && (
                        <Button variant="ghost" size="icon" onClick={redo} title="Redo (Ctrl+Y)">
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant={isHistoryOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        title="Version History"
                        className={cn("ml-1", isHistoryOpen && "bg-muted")}
                    >
                        <HistoryIcon className="h-4 w-4" />
                    </Button>

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
                            placeholder={searchMode === 'regex' ? "e.g. ^https?://.*\\.dev" : "Search bookmarks..."}
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
                                title="Clear search"
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
                        title="Advanced Search Filters"
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
                {duplicateCount > 0 && (
                    <Button onClick={removeDuplicates} variant="destructive" size="sm" className="gap-2 hidden sm:flex">
                        <Layers className="h-4 w-4" />
                        <span className="hidden lg:inline">Remove {duplicateCount} Duplicates</span>
                        <span className="lg:hidden">{duplicateCount}</span>
                    </Button>
                )}

                {cleanableCount > 0 && (
                    <Button onClick={cleanAllUrls} variant="outline" size="sm" className="gap-2 hidden sm:flex border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden lg:inline">Clean {cleanableCount} URLs</span>
                        <span className="lg:hidden">{cleanableCount}</span>
                    </Button>
                )}

                {bookmarkCount > 0 && (
                    <div className="flex gap-1 sm:gap-2">
                        <div className="flex bg-muted/50 p-1 rounded-lg border mr-0 sm:mr-2 shrink-0">
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('list')}
                                title="List View"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('grid')}
                                title="Grid View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            {viewMode === 'grid' && (
                                <Button
                                    variant={showThumbnails ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setShowThumbnails(!showThumbnails)}
                                    title={showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
                                >
                                    <Image className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant={viewMode === 'analytics' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('analytics')}
                                title="Analytics"
                            >
                                <BarChart3 className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button onClick={checkAllLinks} disabled={isCheckingLinks} variant="outline" size="icon" className="hidden sm:flex gap-2 w-auto px-3">
                            {isCheckingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                            <span className="hidden lg:inline">{isCheckingLinks ? 'Checking...' : 'Check Health'}</span>
                        </Button>

                        <Button onClick={openExportModal} variant="default" size="icon" className="hidden sm:flex gap-2 w-auto px-3 shadow-lg shadow-primary/20">
                            <Download className="h-4 w-4" />
                            <span className="hidden lg:inline">Export</span>
                        </Button>
                    </div>
                )}

                {hasFileLoaded && (
                    <Button
                        onClick={closeFile}
                        variant="ghost"
                        size="icon"
                        className="ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Close File"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsShortcutsOpen(true)}
                    className="rounded-full shrink-0"
                    title="Keyboard Shortcuts (?)"
                >
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full shrink-0"
                >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
            </div>
        </header>
    )
}
