import React, { lazy, Suspense } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getStoredModel } from '../../lib/key-vault';

// Lazy loaded modal components
const SettingsModal = lazy(() => import('../SettingsModal').then(m => ({ default: m.SettingsModal })));
const ExportModal = lazy(() => import('./ExportModal').then(m => ({ default: m.ExportModal })));
const RuleModal = lazy(() => import('./RuleModal').then(m => ({ default: m.RuleModal })));
const RuleConflictModal = lazy(() => import('./RuleConflictModal').then(m => ({ default: m.RuleConflictModal })));
const ClearAllModal = lazy(() => import('./ClearAllModal').then(m => ({ default: m.ClearAllModal })));
const ShortcutsModal = lazy(() => import('./ShortcutsModal').then(m => ({ default: m.ShortcutsModal })));
const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));
const SortConfirmationModal = lazy(() => import('./SortConfirmationModal').then(m => ({ default: m.SortConfirmationModal })));
const CollectionModal = lazy(() => import('./CollectionModal').then(m => ({ default: m.CollectionModal })));
const EditBookmarkModal = lazy(() => import('../EditBookmarkModal').then(m => ({ default: m.EditBookmarkModal })));
const AICostModal = lazy(() => import('./AICostModal').then(m => ({ default: m.AICostModal })));
const ExtensionGuideModal = lazy(() => import('./ExtensionGuideModal').then(m => ({ default: m.ExtensionGuideModal })));
const RssReaderModal = lazy(() => import('./RssReaderModal').then(m => ({ default: m.RssReaderModal })));
const ReaderViewModal = lazy(() => import('./ReaderViewModal').then(m => ({ default: m.ReaderViewModal })));
const QrCodeModal = lazy(() => import('./QrCodeModal').then(m => ({ default: m.QrCodeModal })));
const ReminderModal = lazy(() => import('./ReminderModal').then(m => ({ default: m.ReminderModal })));
const ShareCollectionModal = lazy(() => import('./ShareCollectionModal').then(m => ({ default: m.ShareCollectionModal })));
const SnapshotViewerModal = lazy(() => import('./SnapshotViewerModal').then(m => ({ default: m.SnapshotViewerModal })));

export function AppModalContainer({
    taxonomy,
    worker,
    actions,
    operations,
    exporter,
    ruleManager,
    collectionsHook,
    browserSync,
    autoCategorize,
    aiTools,
    undoRedo,
    selectedIds,
    setSelectedIds,
    pendingAIOperation,
    setPendingAIOperation,
    requestAIOperation,
    handleMagicSort,
    handleEditSave,
    loadDemoData,
    handleEnrichPreviews
}) {
    const {
        settingsTab,
        isSettingsOpen,
        setSettingsTab,
        setIsSettingsOpen,
        openSettings,
        isConflictModalOpen,
        setIsConflictModalOpen,
        showBackupModal,
        setShowBackupModal,
        isShortcutsOpen,
        setIsShortcutsOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isCollectionModalOpen,
        setIsCollectionModalOpen,
        setEditingCollection,
        editingCollection,
        editingBookmark,
        setEditingBookmark,
        isExtensionGuideOpen,
        setIsExtensionGuideOpen,
        isRssReaderOpen,
        setIsRssReaderOpen,
        readerBookmark,
        closeReaderMode,
        qrModalBookmark,
        closeQrCode,
        reminderModalBookmark,
        closeReminderModal,
        shareHubCollection,
        closeShareHub,
        snapshotModalBookmark,
        closeSnapshotViewer
    } = useAppStore();

    const { undo, redo, canUndo, canRedo } = undoRedo;

    return (
        <Suspense fallback={null}>
            {/* Collection Create/Edit Modal */}
            {isCollectionModalOpen && (
                <CollectionModal
                    isOpen={isCollectionModalOpen}
                    onClose={() => {
                        setIsCollectionModalOpen(false);
                        setEditingCollection(null);
                    }}
                    editingCollection={editingCollection}
                    onSave={async (data) => {
                        if (data.id) {
                            await collectionsHook.updateCollection(data.id, {
                                name: data.name,
                                icon: data.icon,
                                color: data.color
                            });
                        } else {
                            await collectionsHook.createCollection(data);
                        }
                    }}
                />
            )}

            {/* Edit Bookmark Modal */}
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

            {/* Settings Modal */}
            {isSettingsOpen && (
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    activeTab={settingsTab}
                    onTabChange={setSettingsTab}
                    folders={taxonomy.availableFolders}
                    setFolders={taxonomy.setAvailableFolders}
                    tags={taxonomy.availableTags}
                    setTags={taxonomy.setAvailableTags}
                    discoveredFolders={taxonomy.discoveredFolders}
                    discoveredTags={taxonomy.discoveredTags}
                />
            )}

            {/* Clear All Data Modal */}
            {showBackupModal && (
                <ClearAllModal
                    isOpen={showBackupModal}
                    onClose={() => setShowBackupModal(false)}
                    onConfirm={actions.confirmClearAll}
                />
            )}

            {/* Keyboard Shortcuts Modal */}
            {isShortcutsOpen && (
                <ShortcutsModal
                    isOpen={isShortcutsOpen}
                    onClose={() => setIsShortcutsOpen(false)}
                />
            )}

            {/* Command Palette */}
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
                    onEnrichPreviews={handleEnrichPreviews}
                />
            )}

            {/* Export Modal */}
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

            {/* Rule Modal */}
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

            {/* Rule Conflict Modal */}
            {isConflictModalOpen && worker.ruleConflicts.length > 0 && (
                <RuleConflictModal
                    isOpen={isConflictModalOpen && worker.ruleConflicts.length > 0}
                    onClose={() => setIsConflictModalOpen(false)}
                    conflict={worker.ruleConflicts[0] || null}
                    availableFolders={taxonomy.availableFolders}
                    discoveredFolders={taxonomy.discoveredFolders}
                    onResolve={(id, folder) => {
                        worker.resolveConflict(id, folder);
                        if (worker.ruleConflicts.length <= 1) {
                            setIsConflictModalOpen(false);
                        }
                    }}
                    onSkip={() => setIsConflictModalOpen(false)}
                />
            )}

            {/* AI Cost Estimation Modal */}
            {pendingAIOperation && (
                <AICostModal
                    isOpen={!!pendingAIOperation}
                    onClose={() => setPendingAIOperation(null)}
                    operation={pendingAIOperation.operation}
                    bookmarks={pendingAIOperation.bookmarks}
                    currentModel={getStoredModel()}
                    onConfirm={(chosenModel) => {
                        const exec = pendingAIOperation.execute;
                        setPendingAIOperation(null);
                        exec(chosenModel);
                    }}
                />
            )}

            {/* Sort Confirmation Modal */}
            {!!actions.pendingSortUpdates && (
                <SortConfirmationModal
                    isOpen={!!actions.pendingSortUpdates}
                    onClose={() => actions.setPendingSortUpdates(null)}
                    onConfirm={actions.applySortUpdates}
                    updates={actions.pendingSortUpdates || []}
                />
            )}

            {/* Extension Guide Modal */}
            {isExtensionGuideOpen && (
                <ExtensionGuideModal
                    isOpen={isExtensionGuideOpen}
                    onClose={() => setIsExtensionGuideOpen(false)}
                    isConnected={worker.isExtensionConnected}
                />
            )}

            {/* RSS Reader Modal */}
            {isRssReaderOpen && (
                <RssReaderModal
                    isOpen={isRssReaderOpen}
                    onClose={() => setIsRssReaderOpen(false)}
                />
            )}

            {/* Reader View Modal */}
            {!!readerBookmark && (
                <ReaderViewModal
                    isOpen={!!readerBookmark}
                    bookmark={readerBookmark}
                    onClose={closeReaderMode}
                />
            )}

            {/* QR Code Modal */}
            {!!qrModalBookmark && (
                <QrCodeModal
                    isOpen={!!qrModalBookmark}
                    bookmark={qrModalBookmark}
                    onClose={closeQrCode}
                />
            )}

            {/* Reminder Modal */}
            {!!reminderModalBookmark && (
                <ReminderModal
                    isOpen={!!reminderModalBookmark}
                    bookmark={reminderModalBookmark}
                    onClose={closeReminderModal}
                />
            )}

            {/* Share Collection Hub Modal */}
            {!!shareHubCollection && (
                <ShareCollectionModal
                    isOpen={!!shareHubCollection}
                    collection={shareHubCollection}
                    onClose={closeShareHub}
                />
            )}

            {/* Snapshot Viewer Modal */}
            {!!snapshotModalBookmark && (
                <SnapshotViewerModal
                    isOpen={!!snapshotModalBookmark}
                    bookmark={snapshotModalBookmark}
                    onClose={closeSnapshotViewer}
                />
            )}
        </Suspense>
    );
}
