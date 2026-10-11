/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
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
import { useBrowserSync } from './hooks/use-browser-sync'
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
const CommandPalette = lazy(() => import('./components/modals/CommandPalette').then(m => ({ default: m.CommandPalette })))
const SortConfirmationModal = lazy(() => import('./components/modals/SortConfirmationModal').then(m => ({ default: m.SortConfirmationModal })))
const CollectionModal = lazy(() => import('./components/modals/CollectionModal').then(m => ({ default: m.CollectionModal })))
const EditBookmarkModal = lazy(() => import('./components/EditBookmarkModal').then(m => ({ default: m.EditBookmarkModal })))
const AICostModal = lazy(() => import('./components/modals/AICostModal').then(m => ({ default: m.AICostModal })))
const ExtensionGuideModal = lazy(() => import('./components/modals/ExtensionGuideModal').then(m => ({ default: m.ExtensionGuideModal })))
import { ExtensionPromptBanner } from './components/modals/ExtensionPromptBanner'

// PWA Components
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

import { useTranslation } from 'react-i18next'
import { Toaster, toast } from 'sonner'
import { getEffectiveApiKey, getStoredProvider, getStoredModel, isVaultUnlocked, hasVault } from './lib/key-vault'

const EMPTY_ARRAY = []

function App() {
  const { t } = useTranslation()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo()

  // ── UI State from Store ──
  const {
    searchQuery, searchMode, activeTag, activeFolder, smartFilter,
    dateFilter, sortBy, activeCollection, resolvedTheme, initTheme,
    settingsTab, isSettingsOpen, setSettingsTab, setIsSettingsOpen, openSettings,
    isConflictModalOpen, setIsConflictModalOpen,
    showBackupModal, setShowBackupModal,
    isShortcutsOpen, setIsShortcutsOpen,
    isCommandPaletteOpen, setIsCommandPaletteOpen,
    isCollectionModalOpen, setIsCollectionModalOpen, setEditingCollection, editingCollection,
    editingBookmark, setEditingBookmark,
    previewBookmark, setPreviewBookmark,
    isExtensionGuideOpen, setIsExtensionGuideOpen, openExtensionGuide,
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
  const searchInputRef = useRef(null)
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
    activeTag, activeFolder, activeCollection,
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
  const browserSync = useBrowserSync({ rawBookmarks, addCommand })

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

  const [pendingAIOperation, setPendingAIOperation] = useState(null)

  const requestAIOperation = useCallback(async (operationType, executeFn) => {
    const selectedBookmarks = rawBookmarks.filter(b => selectedIds.has(b.id))
    if (selectedBookmarks.length === 0) {
      toast.info(t('modals.sortConf.selectMore', 'Please select at least one bookmark first'))
      return
    }

    const provider = getStoredProvider()
    const apiKey = await getEffectiveApiKey(provider)
    if ((!apiKey && provider !== 'ollama') || (hasVault() && !isVaultUnlocked() && !apiKey)) {
      useAppStore.getState().openSettings('ai')
      return
    }

    const skipConfirm = sessionStorage.getItem('bs_skip_ai_cost_confirm') === 'true'
    if (skipConfirm) {
      executeFn()
      return
    }

    setPendingAIOperation({
      operation: operationType,
      bookmarks: selectedBookmarks,
      execute: (model) => executeFn(model)
    })
  }, [rawBookmarks, selectedIds, t])

  useKeyboardShortcuts({
    selectedIds,
    setSelectedIds,
    bookmarks: worker.bookmarks,
    handleBatchDelete: operations.handleBatchDelete,
    undo, redo,
    searchInputRef,
    setIsShortcutsOpen,
    setIsCommandPaletteOpen
  })

  const handlePreview = useCallback((bookmark) => {
    setPreviewBookmark(bookmark)
  }, [setPreviewBookmark])

  const handleEdit = useCallback((bookmark) => {
    setEditingBookmark(bookmark)
  }, [setEditingBookmark])

  const handleEditSave = useCallback(async ({ id, title, url, note, folder, tags }) => {
    const previous = await db.bookmarks.get(id)
    const updates = { title, url, note }
    if (folder !== undefined) updates.newFolder = folder
    if (tags !== undefined) updates.tags = tags
    await db.bookmarks.update(id, updates)
    addCommand({
      undo: async () => {
        if (previous) await db.bookmarks.update(id, previous)
      },
      redo: async () => {
        await db.bookmarks.update(id, updates)
      },
      description: t('bookmarks.editModal.undoDesc', { title: previous?.title || title })
    })
  }, [addCommand, t])

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

  // ── Merge pending AI sort preview updates ──
  const collectionFilteredBookmarks = useMemo(() => {
    if (actions.pendingSortUpdates && actions.pendingSortUpdates.length > 0) {
      const updatesMap = new Map(actions.pendingSortUpdates.map(u => [u.id, u]))
      return worker.displayBookmarks.map(b => {
        const update = updatesMap.get(b.id)
        if (update) {
          return { ...b, ...update }
        }
        return b
      })
    }
    return worker.displayBookmarks
  }, [worker.displayBookmarks, actions.pendingSortUpdates])

  // ── Render ──
  return (
    <div className="flex flex-col bg-background h-dvh overflow-hidden font-sans text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only top-0 left-0 focus:z-100 focus:absolute focus:bg-background shadow-lg focus:p-4 rounded-br focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-semibold focus:text-foreground"
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
          mergeDuplicates={operations.mergeDuplicates}
          cleanableCount={operations.cleanableCount} cleanAllUrls={operations.cleanAllUrls}
          checkAllLinks={worker.checkAllLinks} isCheckingLinks={worker.isCheckingLinks}
          isExtensionConnected={worker.isExtensionConnected}
          importFromBrowser={browserSync.importFromBrowser}
          pushToBrowser={browserSync.pushToBrowser}
          twoWaySync={browserSync.twoWaySync}
          isSyncing={browserSync.isSyncing}
          openExportModal={() => actions.guardedExport(exporter.openExportModal)}
          hasFileLoaded={hasFileLoaded} closeFile={actions.closeFile}
          bookmarkCount={worker.bookmarks.length}
          clearAll={actions.clearAll}
          searchInputRef={searchInputRef}
        />
      </div>

      <div className="relative flex flex-1 overflow-hidden">
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
          getRootProps={fileUpload.getRootProps} getInputProps={fileUpload.getInputProps} openFileDialog={fileUpload.open}
          isDragActive={fileUpload.isDragActive}
          isExtensionConnected={worker.isExtensionConnected}
          importFromBrowser={browserSync.importFromBrowser}
          isSyncing={browserSync.isSyncing}
          openExtensionGuide={openExtensionGuide}
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
          onEditBookmark={handleEdit}
          onMergeDuplicate={operations.mergeDuplicateGroup}
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
          onMagicSort={() => requestAIOperation('magicSort', handleMagicSort)}
          isProcessingAI={isProcessingAI}
          onFixTitles={() => requestAIOperation('fixTitles', aiTools.handleFixTitles)}
          onFindSmartDuplicates={() => requestAIOperation('smartDuplicates', aiTools.handleFindSmartDuplicates)}
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

          {editingBookmark && (
            <EditBookmarkModal
              isOpen={!!editingBookmark}
              onClose={() => setEditingBookmark(null)}
              bookmark={editingBookmark}
              onSave={handleEditSave}
              availableFolders={taxonomy.availableFolders}
              availableTags={taxonomy.availableTags}
            />
          )}
        </Suspense>

        {/* Settings Modal */}
        <SimpleModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title={t('settings.title')}
        >
          <Suspense fallback={<div className="p-8 text-muted-foreground text-center">{t('common.loading', 'Loading...')}</div>}>
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
          <div className="flex justify-center gap-2 mt-4 pt-2 border-t">
            <Button
              variant={settingsTab === 'folders' || settingsTab === 'tags' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('folders')}
              className="h-7 text-xs"
            >
              {t('sidebar.sections.library')}
            </Button>
            <Button
              variant={settingsTab === 'ai' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('ai')}
              className="h-7 text-xs"
            >
              {t('settings.tabs.ai')}
            </Button>
            <Button
              variant={settingsTab === 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('backup')}
              className="h-7 text-xs"
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

          {isCommandPaletteOpen && (
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              setViewMode={useAppStore.getState().setViewMode}
              toggleAll={useAppStore.getState().toggleAll}
              bookmarks={worker.bookmarks}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              handleBatchDelete={operations.handleBatchDelete}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              mergeDuplicates={operations.mergeDuplicates}
              removeDuplicates={operations.removeDuplicates}
              duplicateCount={worker.duplicateCount}
              cleanAllUrls={operations.cleanAllUrls}
              cleanableCount={operations.cleanableCount}
              checkAllLinks={worker.checkAllLinks}
              isCheckingLinks={worker.isCheckingLinks}
              openExportModal={() => actions.guardedExport(exporter.openExportModal)}
              isExtensionConnected={worker.isExtensionConnected}
              importFromBrowser={browserSync.importFromBrowser}
              pushToBrowser={browserSync.pushToBrowser}
              twoWaySync={browserSync.twoWaySync}
              handleAutoCategorize={autoCategorize.handleAutoCategorize}
              handleMagicSort={() => requestAIOperation('magicSort', handleMagicSort)}
              handleFixTitles={() => requestAIOperation('fixTitles', aiTools.handleFixTitles)}
              handleFindSmartDuplicates={() => requestAIOperation('smartDuplicates', aiTools.handleFindSmartDuplicates)}
              setTheme={useAppStore.getState().setTheme}
              setIsShortcutsOpen={setIsShortcutsOpen}
              openSettings={openSettings}
              clearAll={actions.clearAll}
              loadDemoData={loadDemoData}
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
              selectedFolder={exporter.selectedFolder}
              setSelectedFolder={exporter.setSelectedFolder}
              availableFolders={taxonomy.availableFolders}
              dataToExport={exporter.dataToExport}
              exportPayload={exporter.exportPayload}
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
          {pendingAIOperation && (
            <AICostModal
              isOpen={!!pendingAIOperation}
              onClose={() => setPendingAIOperation(null)}
              operation={pendingAIOperation.operation}
              bookmarks={pendingAIOperation.bookmarks}
              currentModel={getStoredModel()}
              onConfirm={(chosenModel) => {
                const exec = pendingAIOperation.execute
                setPendingAIOperation(null)
                exec(chosenModel)
              }}
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

        <ExtensionPromptBanner
          isExtensionConnected={worker.isExtensionConnected}
          onOpenGuide={openExtensionGuide}
        />

        <Suspense fallback={null}>
          {isExtensionGuideOpen && (
            <ExtensionGuideModal
              isOpen={isExtensionGuideOpen}
              onClose={() => setIsExtensionGuideOpen(false)}
              isConnected={worker.isExtensionConnected}
            />
          )}
        </Suspense>
      </div>
      <Toaster position="bottom-right" richColors closeButton theme={resolvedTheme} />
    </div>
  )
}

export default App
