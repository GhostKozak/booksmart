import { Upload, Folder, Search } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/button'
import { BookmarkList } from '../BookmarkList'
import { BookmarkGrid } from '../BookmarkGrid'
import { PreviewPane } from '../PreviewPane'
import { AnalyticsDashboard } from '../AnalyticsDashboard'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function MainContent({
    hasFileLoaded,
    displayBookmarks,
    rawBookmarks,
    // Dropzone
    getRootProps, getInputProps, isDragActive,
    // View
    viewMode,
    showThumbnails,
    // Selection
    selectedIds, toggleSelection, toggleAll,
    // Link health
    linkHealth,
    ignoredUrls, toggleIgnoreUrl,
    // Folders/Tags
    availableFolders, availableTags,
    // Smart filter
    smartFilter,
    smartCounts,
    // Batch
    handleBatchMoveDocs,
    // Preview
    previewBookmark, handlePreview, setPreviewBookmark,
    // Actions
    clearAll, setSmartFilter, setViewMode,
    setSearchQuery, setActiveTag, setActiveFolder
}) {
    const { t } = useTranslation()
    if (!hasFileLoaded) {
        return (
            <main className="flex-1 overflow-auto bg-secondary/10 p-6 relative">
                <div className="h-full flex flex-col items-center justify-center p-8">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-4 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 max-w-2xl w-full",
                            isDragActive ? "border-primary bg-primary/10 scale-105" : "border-muted-foreground/25"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="bg-primary/10 p-6 rounded-full mb-6">
                            <Logo className="h-16 w-16" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{t('main.dropzone.title')}</h3>
                        <p className="text-muted-foreground max-w-md">
                            {t('main.dropzone.desc')}
                        </p>
                        <Button variant="outline" className="mt-8">{t('main.dropzone.browse')}</Button>
                    </div>
                </div>
            </main>
        )
    }

    if (displayBookmarks.length === 0) {
        return (
            <main className="flex-1 overflow-auto bg-secondary/10 p-6 relative">
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-muted p-6 rounded-full mb-4">
                        <Logo className="h-12 w-12 grayscale opacity-50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t('main.empty.title')}</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
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
        <main className="flex-1 overflow-auto bg-secondary/10 p-6 relative">
            <div className="space-y-4 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">{t('main.header.title')} ({displayBookmarks.length})</h2>
                    <div className="flex gap-2">
                        {smartFilter === 'docs' && displayBookmarks.length > 0 && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleBatchMoveDocs}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Folder className="h-4 w-4 mr-2" />
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
                    <div className="flex h-[calc(100vh-250px)] gap-4 transition-all duration-300">
                        <div className={cn("flex-1 min-w-0 h-full", previewBookmark ? "hidden xl:block xl:basis-3/5" : "basis-full")}>
                            {viewMode === 'list' ? (
                                <BookmarkList
                                    bookmarks={displayBookmarks}
                                    selectedIds={selectedIds}
                                    toggleSelection={toggleSelection}
                                    toggleAll={toggleAll}
                                    linkHealth={linkHealth}
                                    ignoredUrls={ignoredUrls}
                                    toggleIgnoreUrl={toggleIgnoreUrl}
                                    availableFolders={availableFolders}
                                    availableTags={availableTags}
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
                            <div className="flex-1 xl:basis-2/5 h-full min-w-0 border rounded-lg overflow-hidden shadow-lg animate-in fade-in slide-in-from-right-4">
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
