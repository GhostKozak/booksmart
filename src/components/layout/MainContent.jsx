import {
    Folder,
    Search,
    CloudDownload,
    Sparkles,
    List,
    Rows3,
    LayoutGrid,
    CreditCard,
    TableProperties,
    FolderTree,
    BarChart3,
    Hash,
    Filter,
    X,
    CheckCheck,
    Image as ImageIcon,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    ArrowUpDown
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { BookmarkList } from '../BookmarkList'
import { BookmarkGrid } from '../BookmarkGrid'
import { PreviewPane } from '../PreviewPane'
import { AnalyticsDashboard } from '../AnalyticsDashboard'
import { OnboardingWizard } from '../OnboardingWizard'
import { BookmarkTable } from '../BookmarkTable'
import { BookmarkTree } from '../BookmarkTree'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function MainContent({
    hasFileLoaded,
    displayBookmarks,
    rawBookmarks,
    // Dropzone
    getRootProps, getInputProps, isDragActive, openFileDialog,
    // Browser Sync
    isExtensionConnected = false,
    importFromBrowser,
    isSyncing = false,
    openExtensionGuide,
    // Link health
    linkHealth,
    ignoredUrls, toggleIgnoreUrl,
    // Folders/Tags
    availableFolders, availableTags,
    // Collections
    allCollections,
    onRemoveFromCollection,
    // Smart filter (counts)
    smartCounts,
    // Batch
    handleBatchMoveDocs,
    // Preview
    previewBookmark, handlePreview, setPreviewBookmark,
    // Edit / Actions
    onEditBookmark,
    onMergeDuplicate,
    // Onboarding
    loadDemoData
}) {
    const { t } = useTranslation()
    const {
        viewMode, setViewMode, showThumbnails, setShowThumbnails,
        selectedIds, toggleSelection, toggleAll, setSelectedIds,
        smartFilter, setSmartFilter,
        searchQuery, setSearchQuery,
        activeTag, setActiveTag,
        activeFolder, setActiveFolder,
        activeCollection,
        sortBy, setSortBy
    } = useAppStore()

    const showOnboarding = useAppStore(state => state.showOnboarding)
    const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete)

    // Helper to extract sort field and direction from sortBy value
    const getSortFieldAndDirection = (sort) => {
        switch (sort) {
            case 'title-az':
                return { field: 'title', isDesc: false };
            case 'title-za':
                return { field: 'title', isDesc: true };
            case 'date-new':
                return { field: 'date', isDesc: true };
            case 'date-old':
                return { field: 'date', isDesc: false };
            case 'domain':
                return { field: 'domain', isDesc: false };
            case 'domain-desc':
                return { field: 'domain', isDesc: true };
            case 'folder':
                return { field: 'folder', isDesc: false };
            case 'folder-desc':
                return { field: 'folder', isDesc: true };
            default:
                return { field: 'default', isDesc: false };
        }
    };

    const { field: currentSortField, isDesc } = getSortFieldAndDirection(sortBy);

    const handleSortFieldChange = (newField) => {
        if (newField === 'default') {
            setSortBy('default');
            return;
        }
        if (newField === 'title') {
            setSortBy(isDesc ? 'title-za' : 'title-az');
        } else if (newField === 'date') {
            setSortBy(isDesc ? 'date-new' : 'date-old');
        } else if (newField === 'domain') {
            setSortBy(isDesc ? 'domain-desc' : 'domain');
        } else if (newField === 'folder') {
            setSortBy(isDesc ? 'folder-desc' : 'folder');
        }
    };

    const handleToggleSortDirection = () => {
        const nextDesc = !isDesc;
        if (currentSortField === 'title') {
            setSortBy(nextDesc ? 'title-za' : 'title-az');
        } else if (currentSortField === 'date') {
            setSortBy(nextDesc ? 'date-new' : 'date-old');
        } else if (currentSortField === 'domain') {
            setSortBy(nextDesc ? 'domain-desc' : 'domain');
        } else if (currentSortField === 'folder') {
            setSortBy(nextDesc ? 'folder-desc' : 'folder');
        } else {
            // When default is active, clicking sort direction starts sorting by title
            setSortBy(nextDesc ? 'title-za' : 'title-az');
        }
    };

    const viewModes = [
        { id: 'list', label: t('header.listView', 'Liste'), icon: List },
        { id: 'compact', label: t('header.compactView', 'Kompakt'), icon: Rows3 },
        { id: 'grid', label: t('header.gridView', 'Izgara'), icon: LayoutGrid },
        { id: 'card', label: t('header.cardView', 'Kartlar'), icon: CreditCard },
        { id: 'table', label: t('header.tableView', 'Tablo'), icon: TableProperties },
        { id: 'tree', label: t('header.treeView', 'Ağaç'), icon: FolderTree },
        { id: 'analytics', label: t('header.analytics', 'Analiz'), icon: BarChart3 }
    ]

    const clearAllFilters = () => {
        setSearchQuery('')
        setActiveTag(null)
        setActiveFolder(null)
        setSmartFilter(null)
    }

    const hasAnyActiveFilter = Boolean(searchQuery || activeTag || activeFolder || smartFilter)

    if (!hasFileLoaded && showOnboarding) {
        return (
            <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 focus:outline-none overflow-x-hidden overflow-y-auto">
                <OnboardingWizard
                    onUploadClick={openFileDialog}
                    onLoadDemo={() => {
                        setOnboardingComplete()
                        loadDemoData()
                    }}
                    getInputProps={getInputProps}
                    isExtensionConnected={isExtensionConnected}
                    importFromBrowser={importFromBrowser}
                    isSyncing={isSyncing}
                    openExtensionGuide={openExtensionGuide}
                />
            </main>
        )
    }

    if (!hasFileLoaded) {
        return (
            <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
                <div className="flex flex-col justify-center items-center p-4 sm:p-8 h-full max-w-4xl mx-auto">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "flex flex-col justify-center items-center p-8 sm:p-14 border-2 border-dashed rounded-3xl w-full text-center transition-all cursor-pointer backdrop-blur-xs bg-card/40 shadow-xs",
                            isDragActive
                                ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/10"
                                : "border-border/80 hover:border-primary/50 hover:bg-card/70"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="bg-primary/10 mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl ring-4 ring-primary/5 animate-float">
                            <Logo className="w-12 sm:w-16 h-12 sm:h-16" />
                        </div>
                        <h3 className="mb-2 font-bold text-xl sm:text-2xl tracking-tight text-foreground">{t('main.dropzone.title')}</h3>
                        <p className="max-w-md text-muted-foreground text-xs sm:text-sm leading-relaxed mb-6">
                            {t('main.dropzone.desc')}
                        </p>
                        <Button variant="outline" className="cursor-pointer rounded-xl font-medium px-5 h-9 border-primary/30 hover:border-primary hover:bg-primary/5">
                            {t('main.dropzone.browse')}
                        </Button>
                    </div>

                    {isExtensionConnected && importFromBrowser ? (
                        <div className="mt-6 flex flex-col items-center">
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>{t('main.dropzone.extensionConnected', 'Companion Extension Connected')}</span>
                            </div>
                            <Button
                                type="button"
                                variant="default"
                                disabled={isSyncing}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    importFromBrowser();
                                }}
                                className="gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                                <span>{t('main.dropzone.importFromBrowserDirect', 'Import Browser Bookmarks (1-Click)')}</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-6 flex flex-col items-center max-w-md text-center p-4 rounded-2xl bg-card/60 border border-border/60 shadow-xs">
                            <h4 className="text-sm font-semibold text-foreground mb-1">
                                {t('main.dropzone.pullWithoutFileTitle', 'Direct Browser Import')}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                {t('main.dropzone.pullWithoutFileDesc', 'Import bookmarks straight from your browser without exporting an HTML file first.')}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openExtensionGuide?.();
                                }}
                                className="gap-2 text-xs h-9 px-4 rounded-xl font-medium hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                            >
                                <CloudDownload className="h-3.5 w-3.5 text-primary" />
                                <span>{t('main.dropzone.setupExtensionBtn', 'Install Extension & Pull Bookmarks')}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        )
    }

    if (displayBookmarks.length === 0) {
        return (
            <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
                <div className="slide-in-from-bottom-4 flex flex-col justify-center items-center p-8 h-full max-w-md mx-auto text-center animate-in duration-500 fade-in">
                    <div className="bg-muted/70 ring-8 ring-muted/30 shadow-xs mb-6 p-6 rounded-2xl animate-float">
                        <Logo className="opacity-40 grayscale w-12 h-12" />
                    </div>
                    <h3 className="mb-2 font-bold text-xl tracking-tight text-foreground">{t('main.empty.title')}</h3>
                    <p className="mb-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {t('main.empty.desc')}
                    </p>

                    {/* Active Filter Chips in Empty State */}
                    {hasAnyActiveFilter && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5 max-w-sm">
                            {searchQuery && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground font-mono">
                                    <Search className="w-3 h-3 text-muted-foreground" />
                                    <span>&ldquo;{searchQuery}&rdquo;</span>
                                    <button type="button" onClick={() => setSearchQuery('')} className="hover:text-red-500 ml-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {activeFolder && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                    <Folder className="w-3 h-3 text-muted-foreground" />
                                    <span>{activeFolder}</span>
                                    <button type="button" onClick={() => setActiveFolder(null)} className="hover:text-red-500 ml-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {activeTag && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                    <Hash className="w-3 h-3 text-muted-foreground" />
                                    <span>{activeTag}</span>
                                    <button type="button" onClick={() => setActiveTag(null)} className="hover:text-red-500 ml-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {smartFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-muted border border-border/80 text-foreground">
                                    <Filter className="w-3 h-3 text-muted-foreground" />
                                    <span>{t(`sidebar.smartFilters.${smartFilter}`, smartFilter)}</span>
                                    <button type="button" onClick={() => setSmartFilter(null)} className="hover:text-red-500 ml-1">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        className="rounded-xl border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer font-medium text-xs sm:text-sm px-4 h-9"
                    >
                        {t('main.empty.clearSearch')}
                    </Button>
                </div>
            </main>
        )
    }

    return (
        <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-5 lg:p-6 focus:outline-none overflow-x-hidden overflow-y-auto flex flex-col min-h-0">
            <div className="space-y-3.5 mx-auto w-full max-w-[1600px] flex-1 flex flex-col min-h-0">
                {/* Modern Listing Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Title & Active Context Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-2" aria-live="polite">
                            <span>{t('main.header.title')}</span>
                            <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {displayBookmarks.length}
                            </span>
                        </h2>

                        {/* Active Filter Indicators */}
                        {searchQuery && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-card border border-border/80 text-foreground shadow-2xs animate-in fade-in">
                                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-mono truncate max-w-[150px]">&ldquo;{searchQuery}&rdquo;</span>
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5 hover:bg-muted"
                                    title={t('common.remove')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {activeFolder && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-card border border-border/80 text-foreground shadow-2xs animate-in fade-in">
                                <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium truncate max-w-[150px]">{activeFolder}</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveFolder(null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5 hover:bg-muted"
                                    title={t('common.remove')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {activeTag && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-card border border-border/80 text-foreground shadow-2xs animate-in fade-in">
                                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="font-medium truncate max-w-[150px]">#{activeTag}</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTag(null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5 hover:bg-muted"
                                    title={t('common.remove')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {smartFilter && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-card border border-border/80 text-foreground shadow-2xs animate-in fade-in">
                                <Filter className="w-3.5 h-3.5 text-purple-500" />
                                <span className="font-medium truncate max-w-[150px]">{t(`sidebar.smartFilters.${smartFilter}`, smartFilter)}</span>
                                <button
                                    type="button"
                                    onClick={() => setSmartFilter(null)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-0.5 hover:bg-muted"
                                    title={t('common.remove')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions, Selection Pill, View Mode Switcher */}
                    <div className="flex flex-wrap items-center gap-2">
                        {smartFilter === 'docs' && displayBookmarks.length > 0 && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleBatchMoveDocs}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 px-3 text-xs shadow-xs"
                            >
                                <Folder className="mr-1.5 w-3.5 h-3.5" />
                                {t('main.header.moveDocs', { count: displayBookmarks.length })}
                            </Button>
                        )}

                        {/* Selection Quick Pill */}
                        {selectedIds.size > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold shadow-2xs animate-in fade-in">
                                <span>{selectedIds.size} / {displayBookmarks.length} {t('common.select')}</span>
                                <button
                                    type="button"
                                    onClick={() => toggleAll(displayBookmarks)}
                                    className="hover:underline text-[11px] font-normal cursor-pointer ml-1"
                                >
                                    {selectedIds.size === displayBookmarks.length ? t('actionbar.selected') : t('common.selectAll')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="hover:text-red-500 cursor-pointer ml-0.5"
                                    title={t('common.clearAll')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {/* Thumbnail toggle button in Grid/Card mode */}
                        {(viewMode === 'grid' || viewMode === 'card') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowThumbnails(!showThumbnails)}
                                className={cn(
                                    "h-8 px-2.5 text-xs rounded-xl border border-border/60 cursor-pointer transition-colors",
                                    showThumbnails ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground"
                                )}
                                title={showThumbnails ? t('header.hideThumbnails', 'Küçük Resimleri Gizle') : t('header.showThumbnails', 'Küçük Resimleri Göster')}
                            >
                                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                                <span className="hidden sm:inline">{showThumbnails ? t('header.hideThumbnails') : t('header.showThumbnails')}</span>
                            </Button>
                        )}

                        {/* Sort By Select & ASC/DSC Direction Toggle */}
                        <div className="flex items-center p-0.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                            <div className="flex items-center pl-2 pr-1 gap-1 text-xs text-muted-foreground">
                                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 pointer-events-none" />
                                <select
                                    value={currentSortField}
                                    onChange={(e) => handleSortFieldChange(e.target.value)}
                                    className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer py-1 pr-1.5 rounded-lg appearance-none"
                                    aria-label={t('header.sort.label', 'Sırala')}
                                    title={t('header.sort.label', 'Sırala')}
                                >
                                    <option value="default" className="bg-popover text-popover-foreground">{t('header.sort.default', 'Varsayılan')}</option>
                                    <option value="title" className="bg-popover text-popover-foreground">{t('common.title', 'Başlık')}</option>
                                    <option value="date" className="bg-popover text-popover-foreground">{t('bookmarks.columns.added', 'Tarih')}</option>
                                    <option value="domain" className="bg-popover text-popover-foreground">{t('header.sort.domain', 'Alan Adı')}</option>
                                    <option value="folder" className="bg-popover text-popover-foreground">{t('sidebar.sections.folders', 'Klasör')}</option>
                                </select>
                            </div>

                            {/* ASC / DSC Direction Toggle Button */}
                            <button
                                type="button"
                                onClick={handleToggleSortDirection}
                                disabled={currentSortField === 'default'}
                                className={cn(
                                    "inline-flex items-center justify-center h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-lg text-xs transition-all cursor-pointer",
                                    currentSortField === 'default'
                                        ? "opacity-35 cursor-not-allowed text-muted-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95"
                                )}
                                title={isDesc ? t('header.sort.desc', 'Azalan Sıralama (Z→A, Yeni→Eski)') : t('header.sort.asc', 'Artan Sıralama (A→Z, Eski→Yeni)')}
                                aria-label={isDesc ? t('header.sort.desc', 'Azalan Sıralama') : t('header.sort.asc', 'Artan Sıralama')}
                            >
                                {isDesc ? (
                                    <ArrowDownWideNarrow className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                    <ArrowUpNarrowWide className="w-3.5 h-3.5 text-primary" />
                                )}
                            </button>
                        </div>

                        {/* View Mode Segmented Controls */}
                        <div className="flex items-center p-0.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                            {viewModes.map((mode) => {
                                const IconComponent = mode.icon
                                const isActive = viewMode === mode.id
                                return (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => setViewMode(mode.id)}
                                        className={cn(
                                            "inline-flex items-center justify-center h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-lg text-xs transition-all cursor-pointer",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                        )}
                                        title={mode.label}
                                        aria-label={mode.label}
                                    >
                                        <IconComponent className="w-3.5 h-3.5" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Active Collection Hub Banner */}
                {(() => {
                    const currentCollection = activeCollection ? allCollections?.find(c => c.id === activeCollection) : null;
                    if (!currentCollection) return null;

                    return (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-3">
                                <span
                                    className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl shadow-xs"
                                    style={{ backgroundColor: `${currentCollection.color || '#6366f1'}20` }}
                                >
                                    {currentCollection.icon || '📚'}
                                </span>
                                <div>
                                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                        {currentCollection.name}
                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            {displayBookmarks.length} {t('common.bookmarks', 'Yer İmi')}
                                        </span>
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => useAppStore.getState().openShareHub(currentCollection)}
                                    className="gap-2 text-xs h-8.5 rounded-xl border-primary/30 hover:bg-primary/10 hover:border-primary text-primary font-medium cursor-pointer shadow-2xs"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{t('collections.hub.shareAsHub', 'Bento / Linktree Hub Olarak Paylaş')}</span>
                                </Button>
                            </div>
                        </div>
                    );
                })()}

                {/* Viewport: Analytics vs List Views & Preview Split Pane */}
                {viewMode === 'analytics' ? (
                    <AnalyticsDashboard
                        bookmarks={rawBookmarks}
                        linkHealth={linkHealth}
                        onFilterOld={() => {
                            setSmartFilter('old')
                            setViewMode('list')
                        }}
                        oldBookmarksCount={smartCounts ? smartCounts.old : 0}
                    />
                ) : (
                    <div className="flex gap-4 flex-1 min-h-[calc(100vh-220px)] transition-all duration-300">
                        <div key={viewMode} className={cn("flex-1 min-w-0 h-full animate-in duration-300 fade-in zoom-in-[0.99]", previewBookmark ? "hidden xl:block xl:basis-3/5" : "basis-full")}>
                            {(() => {
                                const commonProps = {
                                    bookmarks: displayBookmarks,
                                    selectedIds,
                                    toggleSelection,
                                    toggleAll,
                                    linkHealth,
                                    ignoredUrls,
                                    toggleIgnoreUrl,
                                    onPreview: handlePreview,
                                    onEdit: onEditBookmark,
                                    availableFolders,
                                    availableTags,
                                    allCollections,
                                    onRemoveFromCollection,
                                    onMergeDuplicate
                                }
                                if (viewMode === 'list') {
                                    return <BookmarkList {...commonProps} compact={false} />
                                }
                                if (viewMode === 'compact') {
                                    return <BookmarkList {...commonProps} compact={true} />
                                }
                                if (viewMode === 'grid') {
                                    return <BookmarkGrid {...commonProps} detailed={false} showThumbnails={showThumbnails} />
                                }
                                if (viewMode === 'card') {
                                    return <BookmarkGrid {...commonProps} detailed={true} showThumbnails={true} />
                                }
                                if (viewMode === 'table') {
                                    return <BookmarkTable {...commonProps} />
                                }
                                if (viewMode === 'tree') {
                                    return <BookmarkTree {...commonProps} />
                                }
                                return null
                            })()}
                        </div>

                        {previewBookmark && (
                            <div className="slide-in-from-right-4 flex-1 shadow-lg border border-border/80 rounded-2xl min-w-0 h-full overflow-hidden animate-in xl:basis-2/5 fade-in bg-card">
                                <PreviewPane
                                    bookmark={previewBookmark}
                                    onClose={() => setPreviewBookmark(null)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}
