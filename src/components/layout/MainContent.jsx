import {
    Folder,
    CreditCard,
    TableProperties,
    FolderTree,
    BarChart3,
    List,
    Rows3,
    LayoutGrid,
    CheckCheck,
    CloudDownload,
    Sparkles
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
import { MainDropzone } from './MainDropzone'
import { MainEmptyState } from './MainEmptyState'
import { MainContentHeader } from './MainContentHeader'
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
    onMoveFolder,
    onMoveBookmark,
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
            <MainDropzone
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                isExtensionConnected={isExtensionConnected}
                importFromBrowser={importFromBrowser}
                isSyncing={isSyncing}
                openExtensionGuide={openExtensionGuide}
            />
        )
    }

    if (displayBookmarks.length === 0) {
        return (
            <MainEmptyState
                hasAnyActiveFilter={hasAnyActiveFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeFolder={activeFolder}
                setActiveFolder={setActiveFolder}
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                smartFilter={smartFilter}
                setSmartFilter={setSmartFilter}
                clearAllFilters={clearAllFilters}
            />
        )
    }

    return (
        <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-5 lg:p-6 focus:outline-none overflow-x-hidden overflow-y-auto flex flex-col min-h-0">
            <div className="space-y-3.5 mx-auto w-full max-w-[1600px] flex-1 flex flex-col min-h-0">
                {/* Modern Listing Header Bar */}
                <MainContentHeader
                    displayBookmarksCount={displayBookmarks.length}
                    displayBookmarks={displayBookmarks}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeFolder={activeFolder}
                    setActiveFolder={setActiveFolder}
                    activeTag={activeTag}
                    setActiveTag={setActiveTag}
                    smartFilter={smartFilter}
                    setSmartFilter={setSmartFilter}
                    handleBatchMoveDocs={handleBatchMoveDocs}
                    selectedIds={selectedIds}
                    toggleAll={toggleAll}
                    setSelectedIds={setSelectedIds}
                    showThumbnails={showThumbnails}
                    setShowThumbnails={setShowThumbnails}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    viewModes={viewModes}
                    currentSortField={currentSortField}
                    handleSortFieldChange={handleSortFieldChange}
                    isDesc={isDesc}
                    handleToggleSortDirection={handleToggleSortDirection}
                />

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
                                    onMergeDuplicate,
                                    onMoveFolder,
                                    onMoveBookmark
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
