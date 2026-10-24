import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Search,
    List,
    AlignJustify,
    LayoutGrid,
    Image,
    Table,
    FolderTree,
    BarChart3,
    CheckSquare,
    Trash2,
    X,
    Undo2,
    Redo2,
    GitMerge,
    Layers,
    Sparkles,
    Download,
    Activity,
    Sun,
    Moon,
    Monitor,
    Keyboard,
    Settings,
    FileText,
    Pencil,
    RefreshCw,
    CloudDownload,
    CloudUpload,
    Highlighter
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { getStoredShortcuts } from '../../lib/shortcuts'
import { useAppStore } from '../../store/useAppStore'

export function CommandPalette({
    isOpen,
    onClose,
    // Actions & callbacks
    setViewMode,
    toggleAll,
    bookmarks = [],
    selectedIds,
    setSelectedIds,
    handleBatchDelete,
    undo,
    redo,
    canUndo,
    canRedo,
    mergeDuplicates,
    removeDuplicates,
    duplicateCount = 0,
    cleanAllUrls,
    cleanableCount = 0,
    checkAllLinks,
    isCheckingLinks,
    openExportModal,
    // Browser Sync
    isExtensionConnected = false,
    importFromBrowser,
    pushToBrowser,
    twoWaySync,
    handleAutoCategorize,
    handleMagicSort,
    handleFixTitles,
    handleFindSmartDuplicates,
    setTheme,
    setIsShortcutsOpen,
    openSettings,
    clearAll,
    loadDemoData,
    onEnrichPreviews
}) {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef(null)
    const listRef = useRef(null)

    const shortcuts = useMemo(() => getStoredShortcuts(), [])

    const allCommands = useMemo(() => {
        return [
            // Views
            {
                id: 'view-list',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.listView', 'List View'),
                icon: List,
                action: () => setViewMode?.('list')
            },
            {
                id: 'view-compact',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.compactView', 'Compact List'),
                icon: AlignJustify,
                action: () => setViewMode?.('compact')
            },
            {
                id: 'view-grid',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.gridView', 'Grid View'),
                icon: LayoutGrid,
                action: () => setViewMode?.('grid')
            },
            {
                id: 'view-card',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.cardView', 'Card View'),
                icon: Image,
                action: () => setViewMode?.('card')
            },
            {
                id: 'view-table',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.tableView', 'Table View'),
                icon: Table,
                action: () => setViewMode?.('table')
            },
            {
                id: 'view-tree',
                category: t('commandPalette.categories.views', 'Views'),
                title: t('header.treeView', 'Folder Tree'),
                icon: FolderTree,
                action: () => setViewMode?.('tree')
            },

            // Maintenance & Actions
            {
                id: 'action-select-all',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('common.selectAll', 'Select All'),
                icon: CheckSquare,
                shortcut: shortcuts.selectAll?.display,
                action: () => toggleAll?.(bookmarks)
            },
            {
                id: 'action-clear-selection',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('modals.shortcuts.clearSelection', 'Clear Selection'),
                icon: X,
                shortcut: shortcuts.clearSelection?.display,
                disabled: selectedIds?.size === 0,
                action: () => setSelectedIds?.(new Set())
            },
            {
                id: 'action-delete-selected',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('modals.shortcuts.deleteSelected', 'Delete Selected Bookmarks'),
                icon: Trash2,
                shortcut: shortcuts.deleteSelected?.display,
                disabled: selectedIds?.size === 0,
                action: () => handleBatchDelete?.()
            },
            {
                id: 'action-undo',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('modals.shortcuts.undo', 'Undo'),
                icon: Undo2,
                shortcut: shortcuts.undo?.display,
                disabled: !canUndo,
                action: () => undo?.()
            },
            {
                id: 'action-redo',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('modals.shortcuts.redo', 'Redo'),
                icon: Redo2,
                shortcut: shortcuts.redo?.display,
                disabled: !canRedo,
                action: () => redo?.()
            },
            {
                id: 'action-merge-duplicates',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('header.mergeDuplicates', { count: duplicateCount || 0 }),
                icon: GitMerge,
                disabled: duplicateCount === 0,
                action: () => mergeDuplicates?.()
            },
            {
                id: 'action-similar-duplicates',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('similarDuplicates.modalTitle', 'Yinelenen ve Benzer İçerikleri Birleştir'),
                icon: GitMerge,
                action: () => useAppStore.getState().openSimilarDuplicatesModal()
            },
            {
                id: 'action-remove-duplicates',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('header.removeDuplicates', { count: duplicateCount || 0 }),
                icon: Layers,
                disabled: duplicateCount === 0,
                action: () => removeDuplicates?.()
            },
            {
                id: 'action-clean-urls',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('header.cleanUrls', { count: cleanableCount || 0 }),
                icon: Sparkles,
                disabled: cleanableCount === 0,
                action: () => cleanAllUrls?.()
            },
            {
                id: 'action-check-links',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: isCheckingLinks ? t('header.checking', 'Checking...') : t('header.checkHealth', 'Health Check'),
                icon: Activity,
                disabled: isCheckingLinks || bookmarks.length === 0,
                action: () => checkAllLinks?.()
            },
            {
                id: 'action-export',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('header.export', 'Export Bookmarks'),
                icon: Download,
                action: () => openExportModal?.()
            },
            {
                id: 'action-highlights',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('highlights.modalTitle', 'Vurgular & Yapışkan Notlar (Obsidian)'),
                icon: Highlighter,
                action: () => useAppStore.getState().openHighlightsModal()
            },
            {
                id: 'action-enrich-previews',
                category: t('commandPalette.categories.actions', 'Actions'),
                title: t('commandPalette.enrichPreviews', 'Fetch OpenGraph Previews & Favicons'),
                icon: Image,
                disabled: bookmarks.length === 0,
                action: () => onEnrichPreviews?.()
            },
            ...(isExtensionConnected ? [
                {
                    id: 'action-browser-sync',
                    category: t('commandPalette.categories.actions', 'Actions'),
                    title: t('commandPalette.browserTwoWaySync', 'Two-Way Browser Sync'),
                    icon: RefreshCw,
                    action: () => twoWaySync?.()
                },
                {
                    id: 'action-browser-import',
                    category: t('commandPalette.categories.actions', 'Actions'),
                    title: t('commandPalette.browserImport', 'Import Bookmarks from Browser'),
                    icon: CloudDownload,
                    action: () => importFromBrowser?.()
                },
                {
                    id: 'action-browser-push',
                    category: t('commandPalette.categories.actions', 'Actions'),
                    title: t('commandPalette.browserPush', 'Push Bookmarks to Browser'),
                    icon: CloudUpload,
                    disabled: bookmarks.length === 0,
                    action: () => pushToBrowser?.()
                }
            ] : []),

            // AI Tools
            {
                id: 'ai-auto-sort',
                category: t('commandPalette.categories.ai', 'AI Tools'),
                title: t('actionbar.autoSort', 'Auto Categorize'),
                icon: Sparkles,
                action: () => handleAutoCategorize?.()
            },
            {
                id: 'ai-magic-sort',
                category: t('commandPalette.categories.ai', 'AI Tools'),
                title: t('actionbar.magicSort', 'AI Magic Sort'),
                icon: Sparkles,
                action: () => handleMagicSort?.()
            },
            {
                id: 'ai-fix-titles',
                category: t('commandPalette.categories.ai', 'AI Tools'),
                title: t('actionbar.fixTitles', 'AI Fix Titles'),
                icon: Pencil,
                action: () => handleFixTitles?.()
            },
            {
                id: 'ai-find-duplicates',
                category: t('commandPalette.categories.ai', 'AI Tools'),
                title: t('actionbar.smartDuplicates', 'AI Semantic Duplicates'),
                icon: Layers,
                action: () => handleFindSmartDuplicates?.()
            },

            // Theme & Preferences
            {
                id: 'theme-light',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('settings.theme.light', 'Light Theme'),
                icon: Sun,
                action: () => setTheme?.('light')
            },
            {
                id: 'theme-dark',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('settings.theme.dark', 'Dark Theme'),
                icon: Moon,
                action: () => setTheme?.('dark')
            },
            {
                id: 'theme-system',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('settings.theme.system', 'System Theme'),
                icon: Monitor,
                action: () => setTheme?.('system')
            },
            {
                id: 'pref-shortcuts',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('modals.shortcuts.title', 'Keyboard Shortcuts'),
                icon: Keyboard,
                shortcut: shortcuts.help?.display,
                action: () => setIsShortcutsOpen?.(true)
            },
            {
                id: 'pref-settings',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('settings.title', 'Settings'),
                icon: Settings,
                action: () => openSettings?.('folders')
            },
            {
                id: 'system-demo-data',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('onboarding.getStarted.demo', 'Load Demo Data'),
                icon: FileText,
                action: () => loadDemoData?.()
            },
            {
                id: 'system-clear-all',
                category: t('commandPalette.categories.system', 'Preferences & System'),
                title: t('modals.clearAll.title', 'Clear All Data'),
                icon: Trash2,
                action: () => clearAll?.()
            }
        ]
    }, [
        t,
        shortcuts,
        setViewMode,
        toggleAll,
        bookmarks,
        selectedIds,
        setSelectedIds,
        handleBatchDelete,
        undo,
        redo,
        canUndo,
        canRedo,
        mergeDuplicates,
        removeDuplicates,
        duplicateCount,
        cleanAllUrls,
        cleanableCount,
        checkAllLinks,
        isCheckingLinks,
        openExportModal,
        handleAutoCategorize,
        handleMagicSort,
        handleFixTitles,
        handleFindSmartDuplicates,
        setTheme,
        setIsShortcutsOpen,
        openSettings,
        clearAll,
        loadDemoData,
        isExtensionConnected,
        twoWaySync,
        importFromBrowser,
        pushToBrowser,
        onEnrichPreviews
    ])

    const filteredCommands = useMemo(() => {
        if (!query.trim()) return allCommands
        const q = query.toLowerCase()
        return allCommands.filter(cmd =>
            cmd.title.toLowerCase().includes(q) ||
            cmd.category.toLowerCase().includes(q)
        )
    }, [allCommands, query])

    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    const [prevQuery, setPrevQuery] = useState(query)

    if (prevIsOpen !== isOpen) {
        setPrevIsOpen(isOpen)
        if (isOpen) {
            setQuery('')
            setSelectedIndex(0)
        }
    }

    if (prevQuery !== query) {
        setPrevQuery(query)
        setSelectedIndex(0)
    }

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 50)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    const executeCommand = (cmd) => {
        if (!cmd || cmd.disabled) return
        onClose()
        cmd.action()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filteredCommands[selectedIndex]) {
                executeCommand(filteredCommands[selectedIndex])
            }
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('commandPalette.title', 'Command Palette')}
                className="relative w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
                onKeyDown={handleKeyDown}
            >
                {/* Search Bar */}
                <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3 bg-muted/20">
                    <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('commandPalette.placeholder', 'Type a command or search...')}
                        className="w-full bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground/60 text-foreground"
                    />
                    <kbd className="px-2 py-0.5 text-[11px] font-mono bg-muted border rounded shadow-sm text-muted-foreground shrink-0">
                        ESC
                    </kbd>
                </div>

                {/* Commands List */}
                <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
                >
                    {filteredCommands.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            {t('commandPalette.noResults', 'No commands found.')}
                        </div>
                    ) : (
                        filteredCommands.map((cmd, idx) => {
                            const Icon = cmd.icon
                            const isSelected = idx === selectedIndex
                            return (
                                <button
                                    key={cmd.id}
                                    type="button"
                                    disabled={cmd.disabled}
                                    onClick={() => executeCommand(cmd)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-100",
                                        cmd.disabled && "opacity-40 cursor-not-allowed",
                                        isSelected && !cmd.disabled
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-muted/60 text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                            isSelected && !cmd.disabled ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{cmd.title}</div>
                                            <div className={cn(
                                                "text-[10px] truncate",
                                                isSelected && !cmd.disabled ? "text-primary-foreground/70" : "text-muted-foreground/60"
                                            )}>
                                                {cmd.category}
                                            </div>
                                        </div>
                                    </div>
                                    {cmd.shortcut && (
                                        <kbd className={cn(
                                            "px-2 py-0.5 text-xs font-mono font-medium rounded border shadow-xs ml-2 shrink-0",
                                            isSelected && !cmd.disabled
                                                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                                : "bg-muted text-muted-foreground border-border/80"
                                        )}>
                                            {cmd.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>

                {/* Footer instructions */}
                <div className="px-4 py-2 bg-muted/40 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span>↑↓ {t('commandPalette.navigate', 'to navigate')}</span>
                        <span>•</span>
                        <span>↵ {t('commandPalette.select', 'to select')}</span>
                    </div>
                    <span>{t('commandPalette.footer', 'BookSmart Palette')}</span>
                </div>
            </div>
        </div>
    )
}
