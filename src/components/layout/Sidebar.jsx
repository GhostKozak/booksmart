import React, { useState, useMemo } from 'react'
import {
    LayoutGrid,
    Inbox,
    X,
    Search,
    HelpCircle,
    ChevronLeft,
    Bookmark,
    Folder,
    Tag,
    Library,
    Archive
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { SidebarTags } from './SidebarTags'
import { SidebarFolders } from './SidebarFolders'
import { SidebarCollections } from './SidebarCollections'
import { SmartFilters } from './SmartFilters'
import { RulesPanel } from './RulesPanel'
import packageJson from '../../../package.json'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from 'react-i18next'

export function Sidebar({
    // Tags
    uniqueTags = [],
    availableTags = [],
    discoveredTags = [],
    // Folders
    availableFolders = [],
    uniqueFolders = [],
    discoveredFolders = [],
    bookmarks = [],
    // Smart Filters
    smartCounts = {},
    deadLinkCount = 0,
    // Rules
    rules = [],
    startEditing,
    deleteRule,
    openNewRuleModal,
    // Taxonomy
    saveToTaxonomy,
    // Collections
    collections = [],
    onCreateCollection,
    onEditCollection,
    onDeleteCollection,
    onShareCollection
}) {
    const {
        isSidebarOpen,
        setIsSidebarOpen,
        activeFolder,
        setActiveFolder,
        activeTag,
        setActiveTag,
        activeCollection,
        setActiveCollection,
        smartFilter,
        setSmartFilter,
        setIsShortcutsOpen
    } = useAppStore()
    const { t } = useTranslation()

    const [filterSearch, setFilterSearch] = useState('')

    // Bookmark stats
    const totalBookmarks = bookmarks.length
    const uncategorizedCount = useMemo(() => {
        return bookmarks.filter(b => {
            const folder = b.newFolder || b.originalFolder
            return !folder || folder === 'Uncategorized' || folder === 'Kategorisiz'
        }).length
    }, [bookmarks])

    // Detect if any filter is active
    const hasActiveFilter = Boolean(activeFolder || activeTag || activeCollection || smartFilter)

    const clearAllFilters = () => {
        setActiveFolder(null)
        setActiveTag(null)
        setActiveCollection(null)
        setSmartFilter(null)
    }

    const handleItemSelect = () => {
        // Automatically close sidebar on mobile screens upon selection
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsSidebarOpen(false)
        }
    }

    // Determine active filter label & type for the banner
    const activeFilterInfo = useMemo(() => {
        if (activeFolder) {
            return {
                type: t('common.folder', 'Klasör'),
                name: activeFolder,
                icon: Folder,
                color: 'text-amber-500'
            }
        }
        if (activeTag) {
            return {
                type: t('common.tag', 'Etiket'),
                name: `#${activeTag}`,
                icon: Tag,
                color: 'text-blue-500'
            }
        }
        if (activeCollection) {
            const found = collections.find(c => c.id === activeCollection)
            return {
                type: t('sidebar.sections.collections', 'Koleksiyon'),
                name: found ? found.name : activeCollection,
                icon: Library,
                color: 'text-purple-500'
            }
        }
        if (smartFilter) {
            return {
                type: t('sidebar.sections.smartFilters', 'Akıllı Filtre'),
                name: t(`sidebar.smartFilters.${smartFilter}`, smartFilter),
                icon: Archive,
                color: 'text-emerald-500'
            }
        }
        return null
    }, [activeFolder, activeTag, activeCollection, smartFilter, collections, t])

    return (
        <aside
            className={cn(
                "bg-card/95 backdrop-blur-md border-r flex flex-col transition-all duration-300 ease-in-out z-40 h-full",
                // Mobile layout
                "fixed inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl lg:shadow-none",
                // Desktop layout
                "lg:static lg:flex",
                isSidebarOpen
                    ? "translate-x-0 w-72 lg:w-80"
                    : "-translate-x-full lg:-translate-x-full w-0 p-0 overflow-hidden pointer-events-none"
            )}
        >
            {/* Top Bar: Mobile Brand & Close Button / Desktop Quick Actions */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="font-bold text-sm tracking-tight text-foreground">
                        {t('sidebar.sections.library', 'Kütüphane')}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-full">
                        {totalBookmarks}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    {/* Keyboard shortcuts trigger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hidden sm:inline-flex cursor-pointer"
                        onClick={() => setIsShortcutsOpen(true)}
                        title={t('sidebar.shortcutsHint', 'Klavye Kısayolları (?)')}
                        aria-label={t('sidebar.shortcutsHint', 'Klavye Kısayolları (?)')}
                    >
                        <HelpCircle className="h-4 w-4" />
                    </Button>

                    {/* Mobile Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label={t('common.close')}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    {/* Desktop Collapse Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:inline-flex h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        onClick={() => setIsSidebarOpen(false)}
                        title={t('common.close')}
                        aria-label={t('common.close')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Quick Navigation Hub (All Bookmarks & Inbox) */}
            <div className="px-3 pt-2.5 pb-1 space-y-1 shrink-0">
                {/* All Bookmarks Button */}
                <button
                    type="button"
                    onClick={() => {
                        clearAllFilters()
                        handleItemSelect()
                    }}
                    className={cn(
                        "flex items-center justify-between w-full px-2.5 py-2 text-xs rounded-lg transition-all text-left font-medium select-none cursor-pointer",
                        !hasActiveFilter
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                        <span>{t('sidebar.allBookmarks', 'Tüm Yer İmleri')}</span>
                    </div>
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                        !hasActiveFilter ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                        {totalBookmarks}
                    </span>
                </button>

                {/* Inbox / Uncategorized Button */}
                <button
                    type="button"
                    onClick={() => {
                        setActiveTag(null)
                        setActiveCollection(null)
                        setSmartFilter(null)
                        setActiveFolder(activeFolder === 'Uncategorized' ? null : 'Uncategorized')
                        handleItemSelect()
                    }}
                    className={cn(
                        "flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg transition-all text-left select-none cursor-pointer",
                        activeFolder === 'Uncategorized'
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <Inbox className="h-4 w-4 shrink-0 text-slate-500" />
                        <span>{t('sidebar.uncategorized', 'Kategorisiz')}</span>
                    </div>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded-full font-medium">
                        {uncategorizedCount}
                    </span>
                </button>
            </div>

            {/* Active Filter Pill / Banner */}
            {hasActiveFilter && activeFilterInfo && (
                <div className="px-3 pt-1 pb-1 shrink-0">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <activeFilterInfo.icon className={cn("h-3.5 w-3.5 shrink-0", activeFilterInfo.color)} />
                            <span className="font-semibold text-primary truncate max-w-[170px]" title={activeFilterInfo.name}>
                                {activeFilterInfo.name}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="p-1 rounded-md text-primary/70 hover:text-primary hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
                            title={t('sidebar.clearFilter', 'Filtreyi Temizle')}
                            aria-label={t('sidebar.clearFilter', 'Filtreyi Temizle')}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Inline Quick Filter Search */}
            <div className="px-3 py-1.5 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input
                        type="text"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder={t('sidebar.filterSearchPlaceholder', 'Klasör, etiket ara...')}
                        className="h-8 pl-8 pr-7 text-xs bg-muted/30 focus:bg-background transition-colors rounded-lg border-border/60"
                    />
                    {filterSearch && (
                        <button
                            type="button"
                            onClick={() => setFilterSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                            aria-label="Aramayı Temizle"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Unified Smooth Scroll Container for All Sections */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin px-3 py-1 space-y-3">
                {/* 1. Collections */}
                <SidebarCollections
                    collections={collections}
                    onCreateCollection={onCreateCollection}
                    onEditCollection={onEditCollection}
                    onDeleteCollection={onDeleteCollection}
                    onShareCollection={onShareCollection}
                    filterSearch={filterSearch}
                    onItemSelect={handleItemSelect}
                />

                <div className="border-t border-border/40" />

                {/* 2. Folders */}
                <SidebarFolders
                    availableFolders={availableFolders}
                    uniqueFolders={uniqueFolders}
                    discoveredFolders={discoveredFolders}
                    bookmarks={bookmarks}
                    saveToTaxonomy={saveToTaxonomy}
                    filterSearch={filterSearch}
                    onItemSelect={handleItemSelect}
                />

                <div className="border-t border-border/40" />

                {/* 3. Tags */}
                <SidebarTags
                    uniqueTags={uniqueTags}
                    availableTags={availableTags}
                    discoveredTags={discoveredTags}
                    saveToTaxonomy={saveToTaxonomy}
                    filterSearch={filterSearch}
                    onItemSelect={handleItemSelect}
                />

                <div className="border-t border-border/40" />

                {/* 4. Smart Filters */}
                <SmartFilters
                    smartCounts={smartCounts}
                    deadLinkCount={deadLinkCount}
                    filterSearch={filterSearch}
                    onItemSelect={handleItemSelect}
                />

                <div className="border-t border-border/40" />

                {/* 5. Automation Rules */}
                <RulesPanel
                    rules={rules}
                    startEditing={startEditing}
                    deleteRule={deleteRule}
                    openNewRuleModal={openNewRuleModal}
                    filterSearch={filterSearch}
                />
            </div>

            {/* Footer */}
            <div className="px-3.5 py-2.5 border-t border-border/50 shrink-0 bg-muted/10">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 font-medium">
                    <a
                        href="https://github.com/GhostKozak/booksmart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors inline-flex items-center gap-1 font-semibold"
                        title="GitHub Deposu"
                    >
                        <span>BookSmart</span>
                        <span className="text-[10px] text-muted-foreground/60 font-normal">v{packageJson.version}</span>
                    </a>

                    <button
                        type="button"
                        onClick={() => setIsShortcutsOpen(true)}
                        className="hover:text-foreground transition-colors cursor-pointer text-[10px] text-muted-foreground/60"
                        title="Klavye Kısayolları"
                    >
                        {t('sidebar.shortcutsHint', 'Kısayollar')} (?)
                    </button>
                </div>
            </div>
        </aside>
    )
}
