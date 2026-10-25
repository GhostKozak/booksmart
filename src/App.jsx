/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
import { refreshAllFeeds } from './lib/rss-service'
import { checkAndNotifyDueReminders } from './lib/reminder-service'
import { demoBookmarks } from './lib/demo-bookmarks'
import { useAppStore } from './store/useAppStore'

// Layout Components
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'

// Existing Components
import { FloatingActionBar } from './components/FloatingActionBar'
import { ConflictNotificationBar } from './components/ConflictNotificationBar'

// Modal Container
import { AppModalContainer } from './components/modals/AppModalContainer'
import { ExtensionPromptBanner } from './components/modals/ExtensionPromptBanner'

// PWA Components
import OfflineIndicator from './components/OfflineIndicator'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'

import { useTranslation } from 'react-i18next'
import { Toaster, toast } from 'sonner'
import { getEffectiveApiKey, getStoredProvider, isVaultUnlocked, hasVault, isLocalAIProvider } from './lib/key-vault'
import { useMetadataEnricher } from './hooks/use-metadata-enricher'

const EMPTY_ARRAY = []

function App() {
  const { t } = useTranslation()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo()

  // ── UI State from Store ──
  const {
    isSidebarOpen, setIsSidebarOpen,
    searchQuery, searchMode, activeTag, activeFolder, smartFilter,
    dateFilter, sortBy, activeCollection, resolvedTheme, initTheme,
    isConflictModalOpen, setIsConflictModalOpen,
    setIsShortcutsOpen,
    setIsCommandPaletteOpen,
    setIsCollectionModalOpen, setEditingCollection,
    setEditingBookmark,
    previewBookmark, setPreviewBookmark,
    openExtensionGuide,
    openReaderMode,
    showOnboarding
  } = useAppStore()

  // Selection
  const selectedIds = useAppStore(state => state.selectedIds)
  const setSelectedIds = useAppStore(state => state.setSelectedIds)

  // ── URL Search Param Handler (?search=...) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('search');
      if (urlQuery && urlQuery.trim()) {
        const setSearchQuery = useAppStore.getState().setSearchQuery;
        if (setSearchQuery) {
          setSearchQuery(urlQuery.trim());
        }
        params.delete('search');
        const newSearch = params.toString() ? `?${params.toString()}` : '';
        const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {
      // Ignored
    }
  }, []);

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

  // ── Background Due-Reminders Polling (startup & every 60s) ──
  useEffect(() => {
    const checkReminders = () => {
      checkAndNotifyDueReminders({
        t,
        onOpenBookmark: (b) => openReaderMode(b)
      });
    };

    const initialTimer = setTimeout(checkReminders, 3000);
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [t, openReaderMode]);

  // ── Background RSS Feeds Auto-Polling (startup & every 60 mins) ──
  useEffect(() => {
    const checkFeeds = async () => {
      try {
        const feeds = await db.feeds.toArray();
        if (!feeds || feeds.length === 0) return;

        const now = Date.now();
        const minLastChecked = Math.min(...feeds.map(f => f.lastChecked || 0));
        // Refresh if feeds have not been checked in the last 45 minutes
        if (now - minLastChecked > 45 * 60 * 1000) {
          await refreshAllFeeds({ silent: false });
        }
      } catch (err) {
        console.warn('[RSS] Background feed poll error:', err);
      }
    };

    const initialTimer = setTimeout(checkFeeds, 5000);
    const interval = setInterval(checkFeeds, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // ── Data from IndexedDB ──
  const searchInputRef = useRef(null)
  const rawBookmarks = useLiveQuery(() => db.bookmarks.toArray()) || EMPTY_ARRAY
  const rules = useLiveQuery(() => db.rules.toArray()) || EMPTY_ARRAY

  // ── Fuse options for search ──
  const fuseOptions = useMemo(() => ({
    keys: ['title', 'url', 'tags', 'note', 'originalFolder'],
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
    availableFolders: taxonomy.allFolders,
    linkHealth: worker.linkHealth,
    setLinkHealth: worker.setLinkHealth,
    setSmartFilter: useAppStore.getState().setSmartFilter
  })

  const ruleManager = useRuleManager({ rules, rawBookmarks, addCommand })
  const fileUpload = useFileUpload()
  const collectionsHook = useCollections({ addCommand })
  const browserSync = useBrowserSync({ rawBookmarks, bookmarks: worker.bookmarks, addCommand })

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
    if ((!apiKey && !isLocalAIProvider(provider)) || (hasVault() && !isVaultUnlocked() && !apiKey)) {
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
    if (folder !== undefined) {
      updates.newFolder = folder
      updates.originalFolder = folder
    }
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
  }, [rawBookmarks, rules, taxonomy.availableFolders, taxonomy.availableTags, taxonomy.ignoredUrlsList, collectionsHook.collections])

  // ── Bulk Favicon & Metadata Enricher ──
  const metadataEnricher = useMetadataEnricher(rawBookmarks, selectedIds)
  const isEnrichingPreviews = metadataEnricher.status === 'running'

  const handleEnrichPreviews = useCallback(() => {
    metadataEnricher.openModal()
  }, [metadataEnricher])

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
          clearAll={actions.clearAll}
          searchInputRef={searchInputRef}
          openMetadataEnricher={handleEnrichPreviews}
          isEnrichingPreviews={isEnrichingPreviews}
        />
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && !isOnboardingActive && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={`sidebar-slide relative z-30 shrink-0 min-w-0 overflow-hidden ${isOnboardingActive ? '-translate-x-full opacity-0 pointer-events-none w-0 overflow-hidden' : 'translate-x-0 opacity-100'}`}
        >
          <Sidebar
            uniqueTags={worker.uniqueTags} availableTags={taxonomy.availableTags}
            discoveredTags={taxonomy.discoveredTags}
            availableFolders={taxonomy.availableFolders} uniqueFolders={worker.uniqueFolders}
            discoveredFolders={taxonomy.discoveredFolders} bookmarks={worker.bookmarks}
            smartCounts={worker.smartCounts} deadLinkCount={worker.deadLinkCount}
            rules={rules}
            suggestedRules={ruleManager.suggestedRules}
            onOpenSuggestions={ruleManager.openSuggestionsModal}
            startEditing={ruleManager.startEditing}
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
          onMoveFolder={operations.moveFolder}
          onMoveBookmark={operations.moveBookmark}
        />

        <FloatingActionBar
          onDelete={operations.handleBatchDelete}
          onMove={operations.handleBatchMove}
          allFolders={taxonomy.allFolders}
          allTags={taxonomy.allTags}
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
          onEnrichPreviews={handleEnrichPreviews}
          isEnrichingPreviews={isEnrichingPreviews}
        />

        <AppModalContainer
          taxonomy={taxonomy}
          worker={worker}
          actions={actions}
          operations={operations}
          exporter={exporter}
          ruleManager={ruleManager}
          collectionsHook={collectionsHook}
          browserSync={browserSync}
          autoCategorize={autoCategorize}
          aiTools={aiTools}
          undoRedo={{ undo, redo, canUndo, canRedo }}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          pendingAIOperation={pendingAIOperation}
          setPendingAIOperation={setPendingAIOperation}
          requestAIOperation={requestAIOperation}
          handleMagicSort={handleMagicSort}
          handleEditSave={handleEditSave}
          loadDemoData={loadDemoData}
          handleEnrichPreviews={handleEnrichPreviews}
          metadataEnricher={metadataEnricher}
        />

        {/* Non-intrusive conflict notification */}
        {worker.ruleConflicts.length > 0 && !isConflictModalOpen && selectedIds.size === 0 && (
          <ConflictNotificationBar
            conflictCount={worker.ruleConflicts.length}
            onResolve={() => setIsConflictModalOpen(true)}
          />
        )}

        <OfflineIndicator />
        <PWAUpdatePrompt />

        <ExtensionPromptBanner
          isExtensionConnected={worker.isExtensionConnected}
          onOpenGuide={openExtensionGuide}
        />
      </div>
      <Toaster position="bottom-right" richColors closeButton theme={resolvedTheme} />
    </div>
  )
}

export default App
