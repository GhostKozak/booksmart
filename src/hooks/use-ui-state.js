import { useState, useRef } from 'react'

export function useUIState() {
    // Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [collapsedSections, setCollapsedSections] = useState({
        tags: false, folders: false, filters: false, rules: false
    })
    const toggleSection = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    // View
    const [viewMode, setViewMode] = useState('list')
    const [showThumbnails, setShowThumbnails] = useState(false)
    const [previewBookmark, setPreviewBookmark] = useState(null)

    // Search
    const [searchQuery, setSearchQuery] = useState('')
    const [searchMode, setSearchMode] = useState('simple')
    const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
    const [dateFilter, setDateFilter] = useState({ start: null, end: null })
    const [smartFilter, setSmartFilter] = useState(null)
    const [sortBy, setSortBy] = useState('default')
    const searchInputRef = useRef(null)

    // Navigation
    const [activeFolder, setActiveFolder] = useState(null)
    const [activeTag, setActiveTag] = useState(null)

    // Modals
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
    const [showBackupModal, setShowBackupModal] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [settingsTab, setSettingsTab] = useState('folders')
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    const openSettings = (tab = 'folders') => {
        setSettingsTab(tab)
        setIsSettingsOpen(true)
    }

    return {
        // Sidebar
        isSidebarOpen, setIsSidebarOpen,
        collapsedSections, toggleSection,

        // View
        viewMode, setViewMode,
        showThumbnails, setShowThumbnails,
        previewBookmark, setPreviewBookmark,

        // Search
        searchQuery, setSearchQuery,
        searchMode, setSearchMode,
        isAdvancedSearchOpen, setIsAdvancedSearchOpen,
        dateFilter, setDateFilter,
        smartFilter, setSmartFilter,
        sortBy, setSortBy,
        searchInputRef,

        // Navigation
        activeFolder, setActiveFolder,
        activeTag, setActiveTag,

        // Modals
        isShortcutsOpen, setIsShortcutsOpen,
        showBackupModal, setShowBackupModal,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        isConflictModalOpen, setIsConflictModalOpen,
        isHistoryOpen, setIsHistoryOpen,
        openSettings,
    }
}
