/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { useMemo, useCallback, useEffect } from 'react'
import { useTheme } from './hooks/use-theme'
import { useUndoRedo } from './hooks/use-undo-redo'
import { useUIState } from './hooks/use-ui-state'
import { useTaxonomy } from './hooks/use-taxonomy'
import { useAppActions } from './hooks/use-app-actions'
import { useBookmarkWorker } from './hooks/use-bookmark-worker'
import { useBookmarkOperations } from './hooks/use-bookmark-operations'
import { useRuleManager } from './hooks/use-rule-manager'
import { useMagicSort } from './hooks/use-magic-sort'
import { useCollections } from './hooks/use-collections'
import { useAutoCategorize } from './hooks/use-auto-categorize'
import { useAITools } from './hooks/use-ai-tools'
import { useFileUpload } from './hooks/use-file-upload'
import { useExport } from './hooks/use-export'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, migrateFromLocalStorage, seedDefaults, deduplicateTaxonomy } from './db'
import { saveAutoBackup } from './lib/backup-manager'

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
import { ConflictNotificationBar } from './components/ConflictNotificationBar'

// Modal Components
import { ExportModal } from './components/modals/ExportModal'
import { RuleModal } from './components/modals/RuleModal'
import { RuleConflictModal } from './components/modals/RuleConflictModal'
import { ClearAllModal } from './components/modals/ClearAllModal'
import { ShortcutsModal } from './components/modals/ShortcutsModal'
import { AISettings } from './components/AISettings'
import { SortConfirmationModal } from './components/modals/SortConfirmationModal'
import { CollectionModal } from './components/modals/CollectionModal'

// PWA Components
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'

const EMPTY_ARRAY = []

function App() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo()

  // ── UI State ──
  const ui = useUIState()

  // ── Initialization & Migration ──
  useEffect(() => {
    const init = async () => {
      await migrateFromLocalStorage()
      await deduplicateTaxonomy()
      await seedDefaults()
    }
    init()
  }, [])

  // ── Data from IndexedDB ──
  const rawBookmarks = useLiveQuery(() => db.bookmarks.toArray()) || EMPTY_ARRAY
  const rules = useLiveQuery(() => db.rules.toArray()) || EMPTY_ARRAY

  // ── Fuse options for search ──
  const fuseOptions = useMemo(() => ({
    keys: ['title', 'url', 'tags', 'originalFolder'],
    threshold: 0.4,
    ignoreLocation: true
  }), [])

  // ── Worker ──
  const worker = useBookmarkWorker({
    rawBookmarks, rules,
    searchQuery: ui.searchQuery, searchMode: ui.searchMode,
    activeTag: ui.activeTag, activeFolder: ui.activeFolder,
    smartFilter: ui.smartFilter, dateFilter: ui.dateFilter,
    sortBy: ui.sortBy, fuseOptions
  })

  // ── Taxonomy ──
  const taxonomy = useTaxonomy({
    workerUniqueTags: worker.uniqueTags,
    workerUniqueFolders: worker.uniqueFolders,
  })

  // ── App Actions (selection, sort, clear) ──
  const actions = useAppActions({
    addCommand,
    setSmartFilter: ui.setSmartFilter,
    setSearchQuery: ui.setSearchQuery,
    setActiveTag: ui.setActiveTag,
    setShowBackupModal: ui.setShowBackupModal,
    workerSetLinkHealth: worker.setLinkHealth,
    workerRuleConflicts: worker.ruleConflicts,
    setIsConflictModalOpen: ui.setIsConflictModalOpen,
    displayBookmarks: worker.displayBookmarks,
  })

  // ── Operations ──
  const operations = useBookmarkOperations({
    rawBookmarks,
    bookmarks: worker.bookmarks,
    addCommand,
    selectedIds: actions.selectedIds, setSelectedIds: actions.setSelectedIds,
    availableFolders: taxonomy.availableFolders,
    linkHealth: worker.linkHealth,
    setLinkHealth: worker.setLinkHealth,
    setSmartFilter: ui.setSmartFilter
  })

  const ruleManager = useRuleManager({ rules, addCommand })
  const fileUpload = useFileUpload()
  const collectionsHook = useCollections({ addCommand })

  const exporter = useExport({
    bookmarks: worker.bookmarks,
    selectedIds: actions.selectedIds,
    setSelectedIds: actions.setSelectedIds
  })

  const { handleMagicSort, cancelMagicSort, isProcessingAI } = useMagicSort({
    selectedIds: actions.selectedIds,
    setSelectedIds: actions.setSelectedIds,
    rawBookmarks,
    openSettings: ui.openSettings,
    onSortPreview: actions.handleSortPreview
  })

  const autoCategorize = useAutoCategorize({
    selectedIds: actions.selectedIds,
    setSelectedIds: actions.setSelectedIds,
    rawBookmarks,
    onSortPreview: actions.handleSortPreview
  })

  const aiTools = useAITools({
    selectedIds: actions.selectedIds,
    setSelectedIds: actions.setSelectedIds,
    rawBookmarks,
    openSettings: ui.openSettings,
    onSortPreview: actions.handleSortPreview
  })

  const handleCancelAITasks = useCallback(() => {
    cancelMagicSort();
    if (aiTools.cancelAITools) aiTools.cancelAITools();
  }, [cancelMagicSort, aiTools]);

  useKeyboardShortcuts({
    selectedIds: actions.selectedIds,
    setSelectedIds: actions.setSelectedIds,
    bookmarks: worker.bookmarks,
    handleBatchDelete: operations.handleBatchDelete,
    undo, redo,
    searchInputRef: ui.searchInputRef,
    setIsShortcutsOpen: ui.setIsShortcutsOpen
  })

  // ── Auto-Backup ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStorage.getItem('booksmart_auto_backup_enabled') === 'true') {
        saveAutoBackup()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [rules, taxonomy.availableFolders, taxonomy.availableTags, taxonomy.ignoredUrlsList, collectionsHook.collections])

  // ── Preview handler ──
  const handlePreview = useCallback((bookmark) => {
    ui.setPreviewBookmark(bookmark)
  }, [ui])

  const hasFileLoaded = rawBookmarks.length > 0

  // ── Collection filtering ──
  const collectionFilteredBookmarks = useMemo(() => {
    if (!ui.activeCollection) return worker.displayBookmarks
    return worker.displayBookmarks.filter(b =>
      b.collections && b.collections.includes(ui.activeCollection)
    )
  }, [worker.displayBookmarks, ui.activeCollection])

  // ── Render ──
  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <Header
        theme={theme} setTheme={setTheme}
        canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo}
        past={past} future={future}
        isHistoryOpen={ui.isHistoryOpen} setIsHistoryOpen={ui.setIsHistoryOpen}
        searchQuery={ui.searchQuery} setSearchQuery={ui.setSearchQuery}
        searchMode={ui.searchMode} searchInputRef={ui.searchInputRef}
        isAdvancedSearchOpen={ui.isAdvancedSearchOpen} setIsAdvancedSearchOpen={ui.setIsAdvancedSearchOpen}
        setSearchMode={ui.setSearchMode} dateFilter={ui.dateFilter} setDateFilter={ui.setDateFilter}
        viewMode={ui.viewMode} setViewMode={ui.setViewMode}
        showThumbnails={ui.showThumbnails} setShowThumbnails={ui.setShowThumbnails}
        sortBy={ui.sortBy} setSortBy={ui.setSortBy}
        duplicateCount={worker.duplicateCount} removeDuplicates={operations.removeDuplicates}
        cleanableCount={operations.cleanableCount} cleanAllUrls={operations.cleanAllUrls}
        checkAllLinks={worker.checkAllLinks} isCheckingLinks={worker.isCheckingLinks}
        openExportModal={() => actions.guardedExport(exporter.openExportModal)}
        hasFileLoaded={hasFileLoaded} closeFile={actions.closeFile}
        bookmarkCount={worker.bookmarks.length}
        openSettings={ui.openSettings}
        isSidebarOpen={ui.isSidebarOpen} setIsSidebarOpen={ui.setIsSidebarOpen}
        setIsShortcutsOpen={ui.setIsShortcutsOpen}
        clearAll={actions.clearAll}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          isSidebarOpen={ui.isSidebarOpen} setIsSidebarOpen={ui.setIsSidebarOpen}
          collapsedSections={ui.collapsedSections} toggleSection={ui.toggleSection}
          uniqueTags={worker.uniqueTags} availableTags={taxonomy.availableTags}
          discoveredTags={taxonomy.discoveredTags} activeTag={ui.activeTag} setActiveTag={ui.setActiveTag}
          availableFolders={taxonomy.availableFolders} uniqueFolders={worker.uniqueFolders}
          discoveredFolders={taxonomy.discoveredFolders} bookmarks={worker.bookmarks}
          activeFolder={ui.activeFolder} setActiveFolder={ui.setActiveFolder}
          smartFilter={ui.smartFilter} setSmartFilter={ui.setSmartFilter}
          smartCounts={worker.smartCounts} deadLinkCount={worker.deadLinkCount}
          rules={rules} startEditing={ruleManager.startEditing}
          deleteRule={ruleManager.deleteRule} openNewRuleModal={ruleManager.openNewRuleModal}
          saveToTaxonomy={taxonomy.saveToTaxonomy}
          collections={collectionsHook.collections}
          activeCollection={ui.activeCollection}
          setActiveCollection={ui.setActiveCollection}
          onCreateCollection={() => {
            ui.setEditingCollection(null)
            ui.setIsCollectionModalOpen(true)
          }}
          onEditCollection={(collection) => {
            ui.setEditingCollection(collection)
            ui.setIsCollectionModalOpen(true)
          }}
          onDeleteCollection={collectionsHook.deleteCollection}
          onShareCollection={collectionsHook.shareCollection}
        />

        <MainContent
          hasFileLoaded={hasFileLoaded}
          displayBookmarks={collectionFilteredBookmarks}
          rawBookmarks={rawBookmarks}
          getRootProps={fileUpload.getRootProps} getInputProps={fileUpload.getInputProps}
          isDragActive={fileUpload.isDragActive}
          viewMode={ui.viewMode} showThumbnails={ui.showThumbnails}
          selectedIds={actions.selectedIds} toggleSelection={actions.toggleSelection} toggleAll={actions.toggleAll}
          linkHealth={worker.linkHealth} ignoredUrls={taxonomy.ignoredUrls} toggleIgnoreUrl={taxonomy.toggleIgnoreUrl}
          availableFolders={taxonomy.availableFolders} availableTags={taxonomy.availableTags}
          allCollections={collectionsHook.collections}
          onRemoveFromCollection={collectionsHook.removeBookmarkFromCollection}
          smartFilter={ui.smartFilter} smartCounts={worker.smartCounts}
          handleBatchMoveDocs={operations.handleBatchMoveDocs}
          previewBookmark={ui.previewBookmark} handlePreview={handlePreview} setPreviewBookmark={ui.setPreviewBookmark}
          clearAll={actions.clearAll} setSmartFilter={ui.setSmartFilter} setViewMode={ui.setViewMode}
          setSearchQuery={ui.setSearchQuery} setActiveTag={ui.setActiveTag} setActiveFolder={ui.setActiveFolder}
        />

        <FloatingActionBar
          selectedCount={actions.selectedIds.size}
          onDelete={operations.handleBatchDelete}
          onMove={operations.handleBatchMove}
          onClearSelection={() => actions.setSelectedIds(new Set())}
          allFolders={taxonomy.availableFolders}
          allTags={taxonomy.availableTags}
          onOverrideStatus={operations.handleStatusOverride}
          onAddTags={operations.handleBatchAddTags}
          onExportSelected={() => actions.guardedExport(exporter.openExportSelectedModal)}
          onCleanUrls={operations.cleanSelectedUrls}
          onAutoSort={autoCategorize.handleAutoCategorize}
          onMagicSort={handleMagicSort}
          isProcessingAI={isProcessingAI}
          onFixTitles={aiTools.handleFixTitles}
          onFindSmartDuplicates={aiTools.handleFindSmartDuplicates}
          isProcessingAITitles={aiTools.isProcessingAITitles}
          isProcessingAIDupes={aiTools.isProcessingAIDupes}
          onCancelAITasks={handleCancelAITasks}
          allCollections={collectionsHook.collections}
          onAddToCollection={(collectionId) =>
            collectionsHook.addBookmarksToCollection(actions.selectedIds, collectionId)
          }
          onRemoveFromCollection={(collectionId) =>
            collectionsHook.removeBookmarksFromCollection(actions.selectedIds, collectionId)
          }
        />

        <CollectionModal
          isOpen={ui.isCollectionModalOpen}
          onClose={() => {
            ui.setIsCollectionModalOpen(false)
            ui.setEditingCollection(null)
          }}
          editingCollection={ui.editingCollection}
          onSave={async (data) => {
            if (data.id) {
              await collectionsHook.updateCollection(data.id, {
                name: data.name,
                icon: data.icon,
                color: data.color
              })
            } else {
              await collectionsHook.createCollection(data)
            }
          }}
        />

        {/* Settings Modal */}
        <SimpleModal
          isOpen={ui.isSettingsOpen}
          onClose={() => ui.setIsSettingsOpen(false)}
          title={t('settings.title')}
        >
          {ui.settingsTab === 'backup' ? (
            <BackupSettings />
          ) : ui.settingsTab === 'ai' ? (
            <AISettings />
          ) : (
            <TaxonomyManager
              folders={taxonomy.availableFolders}
              setFolders={taxonomy.setAvailableFolders}
              tags={taxonomy.availableTags}
              setTags={taxonomy.setAvailableTags}
              discoveredFolders={taxonomy.discoveredFolders}
              discoveredTags={taxonomy.discoveredTags}
              defaultTab={ui.settingsTab}
            />
          )}
          <div className="flex justify-center gap-2 mt-4 border-t pt-2">
            <Button
              variant={ui.settingsTab === 'folders' || ui.settingsTab === 'tags' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => ui.setSettingsTab('folders')}
              className="text-xs h-7"
            >
              {t('sidebar.sections.library')}
            </Button>
            <Button
              variant={ui.settingsTab === 'ai' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => ui.setSettingsTab('ai')}
              className="text-xs h-7"
            >
              {t('settings.tabs.ai')}
            </Button>
            <Button
              variant={ui.settingsTab === 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => ui.setSettingsTab('backup')}
              className="text-xs h-7"
            >
              {t('settings.tabs.backup')}
            </Button>
          </div>
        </SimpleModal>

        <ClearAllModal
          isOpen={ui.showBackupModal}
          onClose={() => ui.setShowBackupModal(false)}
          onConfirm={actions.confirmClearAll}
        />

        <ShortcutsModal
          isOpen={ui.isShortcutsOpen}
          onClose={() => ui.setIsShortcutsOpen(false)}
        />

        <ExportModal
          isOpen={exporter.isExportModalOpen}
          onClose={() => exporter.setIsExportModalOpen(false)}
          exportFormat={exporter.exportFormat}
          setExportFormat={exporter.setExportFormat}
          exportOnlySelected={exporter.exportOnlySelected}
          selectedCount={actions.selectedIds.size}
          onExport={exporter.performExport}
        />

        <RuleModal
          isOpen={ruleManager.isRuleModalOpen}
          onClose={ruleManager.cancelEditing}
          editingRuleId={ruleManager.editingRuleId}
          newRule={ruleManager.newRule}
          setNewRule={ruleManager.setNewRule}
          onSave={ruleManager.addRule}
          availableFolders={taxonomy.availableFolders}
          availableTags={taxonomy.availableTags}
          discoveredFolders={taxonomy.discoveredFolders}
          saveToTaxonomy={taxonomy.saveToTaxonomy}
        />

        <RuleConflictModal
          isOpen={ui.isConflictModalOpen && worker.ruleConflicts.length > 0}
          onClose={() => ui.setIsConflictModalOpen(false)}
          conflict={worker.ruleConflicts[0] || null}
          availableFolders={taxonomy.availableFolders}
          discoveredFolders={taxonomy.discoveredFolders}
          onResolve={(id, folder) => {
            worker.resolveConflict(id, folder)
            if (worker.ruleConflicts.length <= 1) {
              ui.setIsConflictModalOpen(false)
            }
          }}
          onSkip={() => ui.setIsConflictModalOpen(false)}
        />

        {/* Non-intrusive conflict notification */}
        {worker.ruleConflicts.length > 0 && !ui.isConflictModalOpen && actions.selectedIds.size === 0 && (
          <ConflictNotificationBar
            conflictCount={worker.ruleConflicts.length}
            onResolve={() => ui.setIsConflictModalOpen(true)}
          />
        )}

        <SortConfirmationModal
          isOpen={!!actions.pendingSortUpdates}
          onClose={() => actions.setPendingSortUpdates(null)}
          onConfirm={actions.applySortUpdates}
          updates={actions.pendingSortUpdates || []}
        />

        <OfflineIndicator />
        <PWAUpdatePrompt />
      </div>
      <Toaster position="bottom-right" richColors closeButton theme={theme} />
    </div>
  )
}

export default App
