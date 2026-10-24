import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
    // --- UI Slice ---
    isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
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

    editingBookmark: null,
    setEditingBookmark: (bookmark) => set({ editingBookmark: bookmark }),

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

    isCommandPaletteOpen: false,
    setIsCommandPaletteOpen: (isOpen) => set((state) => ({
        isCommandPaletteOpen: typeof isOpen === 'function' ? isOpen(state.isCommandPaletteOpen) : isOpen
    })),

    showBackupModal: false,
    setShowBackupModal: (show) => set({ showBackupModal: show }),

    isExtensionGuideOpen: false,
    setIsExtensionGuideOpen: (isOpen) => set({ isExtensionGuideOpen: isOpen }),
    openExtensionGuide: () => set({ isExtensionGuideOpen: true }),

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

    // --- RSS & Newsletter Slice ---
    isRssReaderOpen: false,
    setIsRssReaderOpen: (isOpen) => set({ isRssReaderOpen: isOpen }),
    selectedFeedUrl: null,
    setSelectedFeedUrl: (url) => set({ selectedFeedUrl: url }),

    // --- Reader Mode ("Daha Sonra Oku" / Pocket Mode) Slice ---
    readerBookmark: null,
    setReaderBookmark: (bookmark) => set({ readerBookmark: bookmark }),
    openReaderMode: (bookmark) => set({ readerBookmark: bookmark }),
    closeReaderMode: () => set({ readerBookmark: null }),

    // --- QR Code Modal Slice ---
    qrModalBookmark: null,
    setQrModalBookmark: (bookmark) => set({ qrModalBookmark: bookmark }),
    openQrCode: (bookmark) => set({ qrModalBookmark: bookmark }),
    closeQrCode: () => set({ qrModalBookmark: null }),

    // --- Reminder Modal Slice ---
    reminderModalBookmark: null,
    setReminderModalBookmark: (bookmark) => set({ reminderModalBookmark: bookmark }),
    openReminderModal: (bookmark) => set({ reminderModalBookmark: bookmark }),
    closeReminderModal: () => set({ reminderModalBookmark: null }),

    // --- Public Link Hub / Bento Sharing Slice ---
    shareHubCollection: null,
    setShareHubCollection: (collection) => set({ shareHubCollection: collection }),
    openShareHub: (collection) => set({ shareHubCollection: collection }),
    closeShareHub: () => set({ shareHubCollection: null }),

    // --- Offline Snapshot Viewer Modal Slice ---
    snapshotModalBookmark: null,
    setSnapshotModalBookmark: (bookmark) => set({ snapshotModalBookmark: bookmark }),
    openSnapshotViewer: (bookmark) => set({ snapshotModalBookmark: bookmark }),
    closeSnapshotViewer: () => set({ snapshotModalBookmark: null }),

    // --- Highlights & Sticky Notes Hub Slice ---
    isHighlightsModalOpen: false,
    setIsHighlightsModalOpen: (isOpen) => set({ isHighlightsModalOpen: isOpen }),
    openHighlightsModal: () => set({ isHighlightsModalOpen: true }),
    closeHighlightsModal: () => set({ isHighlightsModalOpen: false }),

    // --- Similar / Content Duplicate Merge Slice ---
    isSimilarDuplicatesModalOpen: false,
    setIsSimilarDuplicatesModalOpen: (isOpen) => set({ isSimilarDuplicatesModalOpen: isOpen }),
    openSimilarDuplicatesModal: () => set({ isSimilarDuplicatesModalOpen: true }),
    closeSimilarDuplicatesModal: () => set({ isSimilarDuplicatesModalOpen: false }),


    // --- Theme Slice ---
    theme: localStorage.getItem("theme") || "system",
    resolvedTheme: "light",
    setTheme: (theme) => {
        localStorage.setItem("theme", theme)
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        let resolved = theme
        if (theme === "system") {
            resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        }
        root.classList.add(resolved)
        set({ theme, resolvedTheme: resolved })
    },
    initTheme: () => {
        get().setTheme(get().theme)

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleChange = (e) => {
            if (get().theme === "system") {
                const resolved = e.matches ? "dark" : "light"
                const root = window.document.documentElement
                root.classList.remove("light", "dark")
                root.classList.add(resolved)
                set({ resolvedTheme: resolved })
            }
        }

        if (window.__themeChangeListener) {
            mediaQuery.removeEventListener("change", window.__themeChangeListener)
        }
        window.__themeChangeListener = handleChange
        mediaQuery.addEventListener("change", handleChange)
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
