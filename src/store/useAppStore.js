import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
    // --- UI Slice ---
    isSidebarOpen: window.innerWidth >= 1024,
    setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

    collapsedSections: { tags: false, folders: false, filters: false, rules: false, collections: false },
    toggleSection: (section) => set((state) => ({
        collapsedSections: { ...state.collapsedSections, [section]: !state.collapsedSections[section] }
    })),

    viewMode: 'list',
    setViewMode: (mode) => set({ viewMode: mode }),

    showThumbnails: false,
    setShowThumbnails: (show) => set({ showThumbnails: show }),

    previewBookmark: null,
    setPreviewBookmark: (bookmark) => set({ previewBookmark: bookmark }),

    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    searchMode: 'simple',
    setSearchMode: (mode) => set({ searchMode: mode }),

    isAdvancedSearchOpen: false,
    setIsAdvancedSearchOpen: (isOpen) => set({ isAdvancedSearchOpen: isOpen }),

    dateFilter: { start: null, end: null },
    setDateFilter: (filter) => set({ dateFilter: filter }),

    smartFilter: null,
    setSmartFilter: (filter) => set({ smartFilter: filter }),

    sortBy: 'default',
    setSortBy: (sort) => set({ sortBy: sort }),

    activeFolder: null,
    setActiveFolder: (folder) => set({ activeFolder: folder }),

    activeTag: null,
    setActiveTag: (tag) => set({ activeTag: tag }),

    isShortcutsOpen: false,
    setIsShortcutsOpen: (isOpen) => set({ isShortcutsOpen: isOpen }),

    showBackupModal: false,
    setShowBackupModal: (show) => set({ showBackupModal: show }),

    isSettingsOpen: false,
    setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

    settingsTab: 'folders',
    setSettingsTab: (tab) => set({ settingsTab: tab }),

    openSettings: (tab = 'folders') => set({ settingsTab: tab, isSettingsOpen: true }),

    isConflictModalOpen: false,
    setIsConflictModalOpen: (isOpen) => set({ isConflictModalOpen: isOpen }),

    isHistoryOpen: false,
    setIsHistoryOpen: (isOpen) => set({ isHistoryOpen: isOpen }),

    activeCollection: null,
    setActiveCollection: (collection) => set({ activeCollection: collection }),

    isCollectionModalOpen: false,
    setIsCollectionModalOpen: (isOpen) => set({ isCollectionModalOpen: isOpen }),

    editingCollection: null,
    setEditingCollection: (collection) => set({ editingCollection: collection }),

    // --- Theme Slice ---
    theme: localStorage.getItem("theme") || "system",
    setTheme: (theme) => {
        localStorage.setItem("theme", theme)
        set({ theme })
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
            root.classList.add(systemTheme)
        } else {
            root.classList.add(theme)
        }
    },
    initTheme: () => {
        get().setTheme(get().theme)
    },

    // --- Onboarding Slice ---
    hasSeenOnboarding: localStorage.getItem('booksmart_onboarding_done') === 'true',
    showOnboarding: localStorage.getItem('booksmart_onboarding_done') !== 'true',
    setOnboardingComplete: () => {
        localStorage.setItem('booksmart_onboarding_done', 'true')
        set({ hasSeenOnboarding: true, showOnboarding: false })
    },
    resetOnboarding: () => {
        localStorage.removeItem('booksmart_onboarding_done')
        set({ hasSeenOnboarding: false, showOnboarding: true })
    },

    // --- Selection Slice ---
    selectedIds: new Set(),
    setSelectedIds: (ids) => set({ selectedIds: ids }),
    toggleSelection: (id) => set((state) => {
        const next = new Set(state.selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { selectedIds: next }
    }),
    toggleAll: (displayBookmarks) => set((state) => {
        if (state.selectedIds.size === displayBookmarks.length && displayBookmarks.length > 0) {
            return { selectedIds: new Set() }
        }
        return { selectedIds: new Set(displayBookmarks.map(b => b.id)) }
    }),
}))
