import { Upload, Folder, Search } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { BookmarkList } from '../BookmarkList'
import { BookmarkGrid } from '../BookmarkGrid'
import { PreviewPane } from '../PreviewPane'
import { AnalyticsDashboard } from '../AnalyticsDashboard'
import { OnboardingWizard } from '../OnboardingWizard'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'


export function MainContent({
    hasFileLoaded,
    displayBookmarks,
    rawBookmarks,
    // Dropzone
    getRootProps, getInputProps, isDragActive, openFileDialog,
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
    // Onboarding
    loadDemoData
}) {
    const { t } = useTranslation()
    const {
        viewMode, setViewMode, showThumbnails,
        selectedIds, toggleSelection, toggleAll,
        smartFilter, setSmartFilter,
        setSearchQuery, setActiveTag, setActiveFolder
    } = useAppStore()
    const showOnboarding = useAppStore(state => state.showOnboarding)
    const setOnboardingComplete = useAppStore(state => state.setOnboardingComplete)

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
                />
            </main>
        )
    }

    if (!hasFileLoaded) {
        return (
            <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
                <div className="flex flex-col justify-center items-center p-4 sm:p-8 h-full">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "flex flex-col justify-center items-center hover:bg-primary/5 p-8 sm:p-16 border-4 hover:border-primary/50 border-dashed rounded-3xl w-full max-w-2xl text-center transition-all cursor-pointer",
                            isDragActive ? "border-primary bg-primary/10 scale-105" : "border-muted-foreground/25"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="bg-primary/10 mb-4 sm:mb-6 p-4 sm:p-6 rounded-full">
                            <Logo className="w-12 sm:w-16 h-12 sm:h-16" />
                        </div>
                        <h3 className="mb-2 font-bold text-xl sm:text-2xl">{t('main.dropzone.title')}</h3>
                        <p className="max-w-md text-muted-foreground text-sm sm:text-base">
                            {t('main.dropzone.desc')}
                        </p>
                        <Button variant="outline" className="mt-6 sm:mt-8">{t('main.dropzone.browse')}</Button>
                    </div>
                </div>
            </main>
        )
    }

    if (displayBookmarks.length === 0) {
        return (
            <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
                <div className="slide-in-from-bottom-4 flex flex-col justify-center items-center p-8 h-full text-center animate-in duration-500 fade-in">
                    <div className="bg-muted shadow-sm mb-6 p-6 rounded-full animate-float">
                        <Logo className="opacity-50 grayscale w-12 h-12" />
                    </div>
                    <h3 className="mb-2 font-semibold text-xl">{t('main.empty.title')}</h3>
                    <p className="mb-6 max-w-sm text-muted-foreground">
                        {t('main.empty.desc')}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchQuery('')
                            setActiveTag(null)
                            setActiveFolder(null)
                            setSmartFilter(null)
                        }}
                    >
                        {t('main.empty.clearSearch')}
                    </Button>
                </div>
            </main>
        )
    }

    return (
        <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
            <div className="space-y-4 mx-auto max-w-[1600px]">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-2xl tracking-tight" aria-live="polite">{t('main.header.title')} ({displayBookmarks.length})</h2>
                    <div className="flex gap-2">
                        {smartFilter === 'docs' && displayBookmarks.length > 0 && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleBatchMoveDocs}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Folder className="mr-2 w-4 h-4" />
                                {t('main.header.moveDocs', { count: displayBookmarks.length })}
                            </Button>
                        )}
                    </div>
                </div>

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
                    <div className="flex gap-4 h-[calc(100vh-250px)] transition-all duration-300">
                        <div key={viewMode} className={cn("flex-1 min-w-0 h-full animate-in duration-300 fade-in zoom-in-[0.98]", previewBookmark ? "hidden xl:block xl:basis-3/5" : "basis-full")}>
                            {viewMode === 'list' ? (
                                <BookmarkList
                                    bookmarks={displayBookmarks}
                                    selectedIds={selectedIds}
                                    toggleSelection={toggleSelection}
                                    toggleAll={toggleAll}
                                    linkHealth={linkHealth}
                                    ignoredUrls={ignoredUrls}
                                    toggleIgnoreUrl={toggleIgnoreUrl}
                                    onPreview={handlePreview}
                                    availableFolders={availableFolders}
                                    availableTags={availableTags}
                                    allCollections={allCollections}
                                    onRemoveFromCollection={onRemoveFromCollection}
                                />
                            ) : (
                                <BookmarkGrid
                                    bookmarks={displayBookmarks}
                                    selectedIds={selectedIds}
                                    toggleSelection={toggleSelection}
                                    onPreview={handlePreview}
                                    showThumbnails={showThumbnails}
                                    availableFolders={availableFolders}
                                    availableTags={availableTags}
                                />
                            )}
                        </div>

                        {previewBookmark && (
                            <div className="slide-in-from-right-4 flex-1 shadow-lg border rounded-lg min-w-0 h-full overflow-hidden animate-in xl:basis-2/5 fade-in">
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
