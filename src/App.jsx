/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { useUndoRedo } from './hooks/use-undo-redo'
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
import { demoBookmarks } from './lib/demo-bookmarks'
import { useAppStore } from './store/useAppStore'

// Layout Components
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'

// Existing Components
import { FloatingActionBar } from './components/FloatingActionBar'
import { SimpleModal } from './components/ui/SimpleModal'
import { Button } from './components/ui/button'
import { ConflictNotificationBar } from './components/ConflictNotificationBar'

// Lazy loaded components
const TaxonomyManager = lazy(() => import('./components/TaxonomyManager').then(m => ({ default: m.TaxonomyManager })))
const BackupSettings = lazy(() => import('./components/BackupSettings').then(m => ({ default: m.BackupSettings })))
const AISettings = lazy(() => import('./components/AISettings').then(m => ({ default: m.AISettings })))
const ExportModal = lazy(() => import('./components/modals/ExportModal').then(m => ({ default: m.ExportModal })))
const RuleModal = lazy(() => import('./components/modals/RuleModal').then(m => ({ default: m.RuleModal })))
const RuleConflictModal = lazy(() => import('./components/modals/RuleConflictModal').then(m => ({ default: m.RuleConflictModal })))
const ClearAllModal = lazy(() => import('./components/modals/ClearAllModal').then(m => ({ default: m.ClearAllModal })))
const ShortcutsModal = lazy(() => import('./components/modals/ShortcutsModal').then(m => ({ default: m.ShortcutsModal })))
const SortConfirmationModal = lazy(() => import('./components/modals/SortConfirmationModal').then(m => ({ default: m.SortConfirmationModal })))
const CollectionModal = lazy(() => import('./components/modals/CollectionModal').then(m => ({ default: m.CollectionModal })))

// PWA Components
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'

const EMPTY_ARRAY = []

function App() {
  const { t } = useTranslation()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo()

  // ── UI State from Store ──
  const {
    searchQuery, searchMode, activeTag, activeFolder, smartFilter,
    dateFilter, sortBy, activeCollection, theme, initTheme,
    settingsTab, isSettingsOpen, setSettingsTab, setIsSettingsOpen,
    isConflictModalOpen, setIsConflictModalOpen,
    showBackupModal, setShowBackupModal,
    isShortcutsOpen, setIsShortcutsOpen,
    isCollectionModalOpen, setIsCollectionModalOpen, setEditingCollection, editingCollection,
    previewBookmark, setPreviewBookmark,
    showOnboarding
  } = useAppStore()

  // Selection
  const selectedIds = useAppStore(state => state.selectedIds)
  const setSelectedIds = useAppStore(state => state.setSelectedIds)

  // ── Initialization & Migration ──
  useEffect(() => {
    initTheme()
    const init = async () => {
      await migrateFromLocalStorage()
      await deduplicateTaxonomy()
      await seedDefaults()
    }
    init()
  }, [initTheme])

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
    searchQuery, searchMode,
    activeTag, activeFolder,
    smartFilter, dateFilter,
    sortBy, fuseOptions
  })

  // ── Taxonomy ──
  const taxonomy = useTaxonomy({
    workerUniqueTags: worker.uniqueTags,
    workerUniqueFolders: worker.uniqueFolders,
  })

  // ── App Actions (sort, clear) ──
  const actions = useAppActions({
    addCommand,
    workerSetLinkHealth: worker.setLinkHealth,
    workerRuleConflicts: worker.ruleConflicts,
    displayBookmarks: worker.displayBookmarks,
  })

  // ── Operations ──
  const operations = useBookmarkOperations({
    rawBookmarks,
    bookmarks: worker.bookmarks,
    addCommand,
    selectedIds,
    setSelectedIds,
    availableFolders: taxonomy.availableFolders,
    linkHealth: worker.linkHealth,
    setLinkHealth: worker.setLinkHealth,
    setSmartFilter: useAppStore.getState().setSmartFilter
  })

  const ruleManager = useRuleManager({ rules, addCommand })
  const fileUpload = useFileUpload()
  const collectionsHook = useCollections({ addCommand })

  const loadDemoData = useCallback(async () => {
    await db.transaction('rw', db.bookmarks, async () => {
      await db.bookmarks.clear()
      await db.bookmarks.bulkAdd(demoBookmarks)
    })
  }, [])

  const exporter = useExport({
    bookmarks: worker.bookmarks,
    selectedIds,
    setSelectedIds
  })

  const { handleMagicSort, cancelMagicSort, isProcessingAI } = useMagicSort({
    selectedIds,
    setSelectedIds,
    rawBookmarks,
    openSettings: useAppStore.getState().openSettings,
    onSortPreview: actions.handleSortPreview
  })

  const autoCategorize = useAutoCategorize({
    selectedIds,
    setSelectedIds,
    rawBookmarks,
    onSortPreview: actions.handleSortPreview
  })

  const aiTools = useAITools({
    selectedIds,
    setSelectedIds,
    rawBookmarks,
    openSettings: useAppStore.getState().openSettings,
    onSortPreview: actions.handleSortPreview
  })

  const handleCancelAITasks = useCallback(() => {
    cancelMagicSort();
    if (aiTools.cancelAITools) aiTools.cancelAITools();
  }, [cancelMagicSort, aiTools]);

  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    bookmarks: worker.bookmarks,
    handleBatchDelete: operations.handleBatchDelete,
    undo, redo,
    searchInputRef: { current: document.querySelector('input[type="search"]') },
    setIsShortcutsOpen
  })

  const handlePreview = useCallback((bookmark) => {
    setPreviewBookmark(bookmark)
  }, [setPreviewBookmark])

  // ── Auto-Backup ──
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStorage.getItem('booksmart_auto_backup_enabled') === 'true') {
        saveAutoBackup()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [rules, taxonomy.availableFolders, taxonomy.availableTags, taxonomy.ignoredUrlsList, collectionsHook.collections])

  const hasFileLoaded = rawBookmarks.length > 0
  const isOnboardingActive = !hasFileLoaded && showOnboarding

  // ── Collection filtering ──
  const collectionFilteredBookmarks = useMemo(() => {
    let base = worker.displayBookmarks
    if (activeCollection) {
      base = base.filter(b => b.collections && b.collections.includes(activeCollection))
    }

    // Merge pending AI updates so we see "Eski -> Yeni" transitions in the list
    if (actions.pendingSortUpdates && actions.pendingSortUpdates.length > 0) {
      const updatesMap = new Map(actions.pendingSortUpdates.map(u => [u.id, u]))
      return base.map(b => {
        const update = updatesMap.get(b.id)
        if (update) {
          return { ...b, ...update }
        }
        return b
      })
    }

    return base
  }, [worker.displayBookmarks, activeCollection, actions.pendingSortUpdates])

  // ── Render ──
  return (
    <div className="h-dvh bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:p-4 focus:bg-background focus:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-br shadow-lg top-0 left-0 font-semibold"
      >
        {t('accessibility.skipToMain')}
      </a>
      <div
        className={`header-slide relative z-40 ${isOnboardingActive ? 'h-0 overflow-hidden opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Header
          canUndo={canUndo} canRedo={canRedo} undo={undo} redo={redo}
          past={past} future={future}
          duplicateCount={worker.duplicateCount} removeDuplicates={operations.removeDuplicates}
          cleanableCount={operations.cleanableCount} cleanAllUrls={operations.cleanAllUrls}
          checkAllLinks={worker.checkAllLinks} isCheckingLinks={worker.isCheckingLinks}
          openExportModal={() => actions.guardedExport(exporter.openExportModal)}
          hasFileLoaded={hasFileLoaded} closeFile={actions.closeFile}
          bookmarkCount={worker.bookmarks.length}
          clearAll={actions.clearAll}
        />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div
          className={`sidebar-slide relative z-30 ${isOnboardingActive ? '-translate-x-full opacity-0 pointer-events-none w-0 overflow-hidden' : 'translate-x-0 opacity-100'}`}
        >
          <Sidebar
            uniqueTags={worker.uniqueTags} availableTags={taxonomy.availableTags}
            discoveredTags={taxonomy.discoveredTags}
            availableFolders={taxonomy.availableFolders} uniqueFolders={worker.uniqueFolders}
            discoveredFolders={taxonomy.discoveredFolders} bookmarks={worker.bookmarks}
            smartCounts={worker.smartCounts} deadLinkCount={worker.deadLinkCount}
            rules={rules} startEditing={ruleManager.startEditing}
            deleteRule={ruleManager.deleteRule} openNewRuleModal={ruleManager.openNewRuleModal}
            saveToTaxonomy={taxonomy.saveToTaxonomy}
            collections={collectionsHook.collections}
            onCreateCollection={() => {
              setEditingCollection(null)
              setIsCollectionModalOpen(true)
            }}
            onEditCollection={(collection) => {
              setEditingCollection(collection)
              setIsCollectionModalOpen(true)
            }}
            onDeleteCollection={collectionsHook.deleteCollection}
            onShareCollection={collectionsHook.shareCollection}
          />
        </div>

        <MainContent
          hasFileLoaded={hasFileLoaded}
          displayBookmarks={collectionFilteredBookmarks}
          rawBookmarks={rawBookmarks}
          getRootProps={fileUpload.getRootProps} getInputProps={fileUpload.getInputProps}
          isDragActive={fileUpload.isDragActive}
          linkHealth={worker.linkHealth} ignoredUrls={taxonomy.ignoredUrls} toggleIgnoreUrl={taxonomy.toggleIgnoreUrl}
          availableFolders={taxonomy.availableFolders} availableTags={taxonomy.availableTags}
          allCollections={collectionsHook.collections}
          onRemoveFromCollection={collectionsHook.removeBookmarkFromCollection}
          smartCounts={worker.smartCounts}
          handleBatchMoveDocs={operations.handleBatchMoveDocs}
          clearAll={actions.clearAll}
          loadDemoData={loadDemoData}
          previewBookmark={previewBookmark}
          setPreviewBookmark={setPreviewBookmark}
          handlePreview={handlePreview}
        />

        <FloatingActionBar
          onDelete={operations.handleBatchDelete}
          onMove={operations.handleBatchMove}
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
            collectionsHook.addBookmarksToCollection(selectedIds, collectionId)
          }
          onRemoveFromCollection={(collectionId) =>
            collectionsHook.removeBookmarksFromCollection(selectedIds, collectionId)
          }
        />

        <Suspense fallback={null}>
          {isCollectionModalOpen && (
            <CollectionModal
              isOpen={isCollectionModalOpen}
              onClose={() => {
                setIsCollectionModalOpen(false)
                setEditingCollection(null)
              }}
              editingCollection={editingCollection}
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
          )}
        </Suspense>

        {/* Settings Modal */}
        <SimpleModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title={t('settings.title')}
        >
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">{t('common.loading', 'Loading...')}</div>}>
            {settingsTab === 'backup' ? (
              <BackupSettings />
            ) : settingsTab === 'ai' ? (
              <AISettings />
            ) : (
              <TaxonomyManager
                folders={taxonomy.availableFolders}
                setFolders={taxonomy.setAvailableFolders}
                tags={taxonomy.availableTags}
                setTags={taxonomy.setAvailableTags}
                discoveredFolders={taxonomy.discoveredFolders}
                discoveredTags={taxonomy.discoveredTags}
                defaultTab={settingsTab}
              />
            )}
          </Suspense>
          <div className="flex justify-center gap-2 mt-4 border-t pt-2">
            <Button
              variant={settingsTab === 'folders' || settingsTab === 'tags' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('folders')}
              className="text-xs h-7"
            >
              {t('sidebar.sections.library')}
            </Button>
            <Button
              variant={settingsTab === 'ai' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('ai')}
              className="text-xs h-7"
            >
              {t('settings.tabs.ai')}
            </Button>
            <Button
              variant={settingsTab === 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('backup')}
              className="text-xs h-7"
            >
              {t('settings.tabs.backup')}
            </Button>
          </div>
        </SimpleModal>

        <Suspense fallback={null}>
          {showBackupModal && (
            <ClearAllModal
              isOpen={showBackupModal}
              onClose={() => setShowBackupModal(false)}
              onConfirm={actions.confirmClearAll}
            />
          )}

          {isShortcutsOpen && (
            <ShortcutsModal
              isOpen={isShortcutsOpen}
              onClose={() => setIsShortcutsOpen(false)}
            />
          )}

          {exporter.isExportModalOpen && (
            <ExportModal
              isOpen={exporter.isExportModalOpen}
              onClose={() => exporter.setIsExportModalOpen(false)}
              exportFormat={exporter.exportFormat}
              setExportFormat={exporter.setExportFormat}
              exportOnlySelected={exporter.exportOnlySelected}
              selectedCount={selectedIds.size}
              onExport={exporter.performExport}
            />
          )}

          {ruleManager.isRuleModalOpen && (
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
          )}

          {isConflictModalOpen && worker.ruleConflicts.length > 0 && (
            <RuleConflictModal
              isOpen={isConflictModalOpen && worker.ruleConflicts.length > 0}
              onClose={() => setIsConflictModalOpen(false)}
              conflict={worker.ruleConflicts[0] || null}
              availableFolders={taxonomy.availableFolders}
              discoveredFolders={taxonomy.discoveredFolders}
              onResolve={(id, folder) => {
                worker.resolveConflict(id, folder)
                if (worker.ruleConflicts.length <= 1) {
                  setIsConflictModalOpen(false)
                }
              }}
              onSkip={() => setIsConflictModalOpen(false)}
            />
          )}
        </Suspense>

        {/* Non-intrusive conflict notification */}
        {worker.ruleConflicts.length > 0 && !isConflictModalOpen && selectedIds.size === 0 && (
          <ConflictNotificationBar
            conflictCount={worker.ruleConflicts.length}
            onResolve={() => setIsConflictModalOpen(true)}
          />
        )}

        <Suspense fallback={null}>
          {!!actions.pendingSortUpdates && (
            <SortConfirmationModal
              isOpen={!!actions.pendingSortUpdates}
              onClose={() => actions.setPendingSortUpdates(null)}
              onConfirm={actions.applySortUpdates}
              updates={actions.pendingSortUpdates || []}
            />
          )}
        </Suspense>

        <OfflineIndicator />
        <PWAUpdatePrompt />
      </div>
      <Toaster position="bottom-right" richColors closeButton theme={theme} />
    </div>
  )
}

export default App
