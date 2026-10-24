import React from 'react'
import {
    Folder,
    Search,
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
    Image as ImageIcon,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    ArrowUpDown
} from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function MainContentHeader({
    displayBookmarksCount,
    displayBookmarks,
    searchQuery,
    setSearchQuery,
    activeFolder,
    setActiveFolder,
    activeTag,
    setActiveTag,
    smartFilter,
    setSmartFilter,
    handleBatchMoveDocs,
    selectedIds,
    toggleAll,
    setSelectedIds,
    showThumbnails,
    setShowThumbnails,
    viewMode,
    setViewMode,
    viewModes,
    currentSortField,
    handleSortFieldChange,
    isDesc,
    handleToggleSortDirection
}) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Title & Active Context Chips */}
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-2" aria-live="polite">
                    <span>{t('main.header.title')}</span>
                    <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {displayBookmarksCount}
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
                {smartFilter === 'docs' && displayBookmarksCount > 0 && (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleBatchMoveDocs}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 px-3 text-xs shadow-xs"
                    >
                        <Folder className="mr-1.5 w-3.5 h-3.5" />
                        {t('main.header.moveDocs', { count: displayBookmarksCount })}
                    </Button>
                )}

                {/* Selection Quick Pill */}
                {selectedIds.size > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold shadow-2xs animate-in fade-in">
                        <span>{selectedIds.size} / {displayBookmarksCount} {t('common.select')}</span>
                        <button
                            type="button"
                            onClick={() => toggleAll(displayBookmarks)}
                            className="hover:underline text-[11px] font-normal cursor-pointer ml-1"
                        >
                            {selectedIds.size === displayBookmarksCount ? t('actionbar.selected') : t('common.selectAll')}
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
    )
}
