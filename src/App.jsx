import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTheme } from './hooks/use-theme'
import { useUndoRedo } from './hooks/use-undo-redo'
import { useBookmarkWorker } from './hooks/use-bookmark-worker'
import { useBookmarkOperations } from './hooks/use-bookmark-operations'
import { useRuleManager } from './hooks/use-rule-manager'
import { useFileUpload } from './hooks/use-file-upload'
import { useExport } from './hooks/use-export'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, migrateFromLocalStorage, seedDefaults, deduplicateTaxonomy } from './db'
import { generateUUID } from './lib/utils'
import { saveAutoBackup, createBackup, downloadBackup } from './lib/backup-manager'

// Layout Components
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'

// Existing Components
import { FloatingActionBar } from './components/FloatingActionBar'
import { TaxonomyManager } from './components/TaxonomyManager'
import { BackupSettings } from './components/BackupSettings'
import { SimpleModal } from './components/ui/SimpleModal'
import { Button } from './components/ui/button'

// Modal Components
import { ExportModal } from './components/modals/ExportModal'
import { RuleModal } from './components/modals/RuleModal'
import { ClearAllModal } from './components/modals/ClearAllModal'
import { ShortcutsModal } from './components/modals/ShortcutsModal'

const EMPTY_ARRAY = [];

function App() {
  const { theme, setTheme } = useTheme()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo()
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Initialization & Migration
  useEffect(() => {
    const init = async () => {
      await migrateFromLocalStorage()
      await deduplicateTaxonomy()
      await seedDefaults()
    }
    init()
  }, [])

  // Data from IndexedDB
  const rawBookmarks = useLiveQuery(() => db.bookmarks.toArray()) || EMPTY_ARRAY
  const rules = useLiveQuery(() => db.rules.toArray()) || EMPTY_ARRAY
  const availableFolders = useLiveQuery(() => db.folders.orderBy('order').toArray()) || EMPTY_ARRAY
  const availableTags = useLiveQuery(() => db.tags.orderBy('order').toArray()) || EMPTY_ARRAY

  // Ignored URLs
  const ignoredUrlsList = useLiveQuery(() => db.ignoredUrls.toArray()) || EMPTY_ARRAY
  const ignoredUrls = useMemo(() => new Set(ignoredUrlsList.map(i => i.url)), [ignoredUrlsList])

  // UI State
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [activeFolder, setActiveFolder] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState('list')
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [previewBookmark, setPreviewBookmark] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [smartFilter, setSmartFilter] = useState(null)
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState('simple')
  const [dateFilter, setDateFilter] = useState({ start: null, end: null })
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('folders')

  const searchInputRef = useRef(null)

  // Sidebar Accordion
  const [collapsedSections, setCollapsedSections] = useState({
    tags: false, folders: false, filters: false, rules: false
  })
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const hasFileLoaded = rawBookmarks.length > 0

  const openSettings = (tab = 'folders') => {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  // Fuse options for search
  const fuseOptions = useMemo(() => ({
    keys: ['title', 'url', 'tags', 'originalFolder'],
    threshold: 0.4,
    ignoreLocation: true
  }), [])

  // Auto-Backup Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStorage.getItem('booksmart_auto_backup_enabled') === 'true') {
        saveAutoBackup()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [rules, availableFolders, availableTags, ignoredUrlsList])

  // Preview handler
  const handlePreview = useCallback((bookmark) => {
    setPreviewBookmark(bookmark)
  }, [])

  // Ignored URL toggle
  const toggleIgnoreUrl = useCallback((url) => {
    if (ignoredUrls.has(url)) {
      db.ignoredUrls.where('url').equals(url).delete()
    } else {
      db.ignoredUrls.add({ url })
    }
  }, [ignoredUrls])

  // Taxonomy Helpers
  const setAvailableFolders = async (newFolders) => {
    await db.transaction('rw', db.folders, async () => {
      const existingIds = new Set((await db.folders.toArray()).map(f => f.id))
      const newIds = new Set(newFolders.map(f => f.id))
      const toDelete = [...existingIds].filter(id => !newIds.has(id))
      if (toDelete.length > 0) await db.folders.bulkDelete(toDelete)
      await db.folders.bulkPut(newFolders)
    })
  }

  const setAvailableTags = async (newTags) => {
    await db.transaction('rw', db.tags, async () => {
      const existingIds = new Set((await db.tags.toArray()).map(f => f.id))
      const newIds = new Set(newTags.map(f => f.id))
      const toDelete = [...existingIds].filter(id => !newIds.has(id))
      if (toDelete.length > 0) await db.tags.bulkDelete(toDelete)
      await db.tags.bulkPut(newTags)
    })
  }

  const saveToTaxonomy = async (name, type) => {
    if (type === 'tag') {
      await db.tags.add({ id: generateUUID(), name, color: '#10b981', order: availableTags.length })
    } else {
      await db.folders.add({ id: generateUUID(), name, color: '#3b82f6', order: availableFolders.length })
    }
  }

  // ── Custom Hooks ──

  const worker = useBookmarkWorker({
    rawBookmarks, rules, searchQuery, searchMode,
    activeTag, activeFolder, smartFilter, dateFilter, fuseOptions
  })

  const operations = useBookmarkOperations({
    rawBookmarks,
    bookmarks: worker.bookmarks,
    addCommand,
    selectedIds, setSelectedIds,
    availableFolders, availableTags,
    linkHealth: worker.linkHealth,
    setLinkHealth: worker.setLinkHealth,
    setSmartFilter
  })

  const ruleManager = useRuleManager({ rules, addCommand, availableFolders, saveToTaxonomy })

  const fileUpload = useFileUpload()

  const exporter = useExport({
    bookmarks: worker.bookmarks,
    selectedIds, setSelectedIds
  })

  useKeyboardShortcuts({
    selectedIds, setSelectedIds,
    bookmarks: worker.bookmarks,
    handleBatchDelete: operations.handleBatchDelete,
    undo, redo,
    searchInputRef,
    setIsShortcutsOpen
  })

  // ── Derived State ──

  const discoveredTags = useMemo(() => {
    const existingNames = new Set(availableTags.map(t => t.name))
    return worker.uniqueTags.filter(t => !existingNames.has(t.name))
  }, [worker.uniqueTags, availableTags])

  const discoveredFolders = useMemo(() => {
    const existingNames = new Set(availableFolders.map(f => f.name))
    return worker.uniqueFolders.filter(f => !existingNames.has(f.name))
  }, [worker.uniqueFolders, availableFolders])

  // Selection Logic
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) { newSelected.delete(id) } else { newSelected.add(id) }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === worker.displayBookmarks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(worker.displayBookmarks.map(b => b.id)))
    }
  }

  // Clear / Close
  const confirmClearAll = async (shouldBackup) => {
    if (shouldBackup) {
      try {
        const data = await createBackup()
        downloadBackup(data)
      } catch (e) {
        console.error("Backup failed before clear:", e)
        alert("Backup failed! Check console. Data was NOT cleared.")
        return
      }
    }
    await db.transaction('rw', db.bookmarks, db.rules, db.folders, db.tags, db.ignoredUrls, async () => {
      await db.bookmarks.clear()
      await db.rules.clear()
      await db.folders.clear()
      await db.tags.clear()
      await db.ignoredUrls.clear()
    })
    setSelectedIds(new Set())
    setShowBackupModal(false)
  }

  const clearAll = () => setShowBackupModal(true)

  const closeFile = () => {
    db.transaction('rw', db.bookmarks, db.rules, async () => {
      await db.bookmarks.clear()
      await db.rules.clear()
    })
    setSelectedIds(new Set())
    worker.setLinkHealth({})
    setSearchQuery('')
    setActiveTag(null)
    setSmartFilter(null)
  }

  // ── Render ──

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <Header
        theme={theme} setTheme={setTheme}
        canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo}
        past={past} future={future}
        isHistoryOpen={isHistoryOpen} setIsHistoryOpen={setIsHistoryOpen}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        searchMode={searchMode} searchInputRef={searchInputRef}
        isAdvancedSearchOpen={isAdvancedSearchOpen} setIsAdvancedSearchOpen={setIsAdvancedSearchOpen}
        setSearchMode={setSearchMode} dateFilter={dateFilter} setDateFilter={setDateFilter}
        viewMode={viewMode} setViewMode={setViewMode}
        showThumbnails={showThumbnails} setShowThumbnails={setShowThumbnails}
        duplicateCount={worker.duplicateCount} removeDuplicates={operations.removeDuplicates}
        cleanableCount={operations.cleanableCount} cleanAllUrls={operations.cleanAllUrls}
        checkAllLinks={worker.checkAllLinks} isCheckingLinks={worker.isCheckingLinks}
        openExportModal={exporter.openExportModal}
        hasFileLoaded={hasFileLoaded} closeFile={closeFile}
        bookmarkCount={worker.bookmarks.length}
        openSettings={openSettings}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        setIsShortcutsOpen={setIsShortcutsOpen}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
          collapsedSections={collapsedSections} toggleSection={toggleSection}
          uniqueTags={worker.uniqueTags} availableTags={availableTags}
          discoveredTags={discoveredTags} activeTag={activeTag} setActiveTag={setActiveTag}
          availableFolders={availableFolders} uniqueFolders={worker.uniqueFolders}
          discoveredFolders={discoveredFolders} bookmarks={worker.bookmarks}
          activeFolder={activeFolder} setActiveFolder={setActiveFolder}
          smartFilter={smartFilter} setSmartFilter={setSmartFilter}
          smartCounts={worker.smartCounts} deadLinkCount={worker.deadLinkCount}
          rules={rules} startEditing={ruleManager.startEditing}
          deleteRule={ruleManager.deleteRule} openNewRuleModal={ruleManager.openNewRuleModal}
          saveToTaxonomy={saveToTaxonomy}
        />

        <MainContent
          hasFileLoaded={hasFileLoaded}
          displayBookmarks={worker.displayBookmarks}
          rawBookmarks={rawBookmarks}
          getRootProps={fileUpload.getRootProps} getInputProps={fileUpload.getInputProps}
          isDragActive={fileUpload.isDragActive}
          viewMode={viewMode} showThumbnails={showThumbnails}
          selectedIds={selectedIds} toggleSelection={toggleSelection} toggleAll={toggleAll}
          linkHealth={worker.linkHealth} ignoredUrls={ignoredUrls} toggleIgnoreUrl={toggleIgnoreUrl}
          availableFolders={availableFolders} availableTags={availableTags}
          smartFilter={smartFilter} smartCounts={worker.smartCounts}
          handleBatchMoveDocs={operations.handleBatchMoveDocs}
          previewBookmark={previewBookmark} handlePreview={handlePreview} setPreviewBookmark={setPreviewBookmark}
          clearAll={clearAll} setSmartFilter={setSmartFilter} setViewMode={setViewMode}
          setSearchQuery={setSearchQuery} setActiveTag={setActiveTag} setActiveFolder={setActiveFolder}
        />

        <FloatingActionBar
          selectedCount={selectedIds.size}
          onDelete={operations.handleBatchDelete}
          onMove={operations.handleBatchMove}
          onClearSelection={() => setSelectedIds(new Set())}
          allFolders={availableFolders}
          allTags={availableTags}
          onOverrideStatus={operations.handleStatusOverride}
          onAddTags={operations.handleBatchAddTags}
          onExportSelected={exporter.openExportSelectedModal}
          onCleanUrls={operations.cleanSelectedUrls}
        />

        {/* Settings Modal */}
        <SimpleModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Settings"
        >
          {settingsTab === 'backup' ? (
            <BackupSettings />
          ) : (
            <TaxonomyManager
              folders={availableFolders}
              setFolders={setAvailableFolders}
              tags={availableTags}
              setTags={setAvailableTags}
              discoveredFolders={discoveredFolders}
              discoveredTags={discoveredTags}
              defaultTab={settingsTab}
            />
          )}
          <div className="flex justify-center gap-2 mt-4 border-t pt-2">
            <Button
              variant={settingsTab !== 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('folders')}
              className="text-xs h-7"
            >
              Taxonomy
            </Button>
            <Button
              variant={settingsTab === 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('backup')}
              className="text-xs h-7"
            >
              Backup & Data
            </Button>
          </div>
        </SimpleModal>

        <ClearAllModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          onConfirm={confirmClearAll}
        />

        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <ExportModal
          isOpen={exporter.isExportModalOpen}
          onClose={() => exporter.setIsExportModalOpen(false)}
          exportFormat={exporter.exportFormat}
          setExportFormat={exporter.setExportFormat}
          exportOnlySelected={exporter.exportOnlySelected}
          selectedCount={selectedIds.size}
          onExport={exporter.performExport}
        />

        <RuleModal
          isOpen={ruleManager.isRuleModalOpen}
          onClose={ruleManager.cancelEditing}
          editingRuleId={ruleManager.editingRuleId}
          newRule={ruleManager.newRule}
          setNewRule={ruleManager.setNewRule}
          onSave={ruleManager.addRule}
          availableFolders={availableFolders}
          availableTags={availableTags}
          discoveredFolders={discoveredFolders}
          saveToTaxonomy={saveToTaxonomy}
        />
      </div>
    </div>
  )
}

export default App
