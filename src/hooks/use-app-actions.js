import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { createBackup, downloadBackup } from '../lib/backup-manager'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

export function useAppActions({
    addCommand,
    workerSetLinkHealth,
    workerRuleConflicts,
    displayBookmarks,
}) {
    const { t } = useTranslation()

    // ── Sort Confirmation ──
    const [pendingSortUpdates, setPendingSortUpdates] = useState(null)

    const handleSortPreview = useCallback((updates) => {
        setPendingSortUpdates(updates)
    }, [])

    const applySortUpdates = useCallback(async (modifiedUpdates) => {
        const finalUpdates = Array.isArray(modifiedUpdates) ? modifiedUpdates : pendingSortUpdates;
        if (!finalUpdates || finalUpdates.length === 0) {
            setPendingSortUpdates(null);
            return;
        }

        const previousState = await db.bookmarks.bulkGet(finalUpdates.map(u => u.id))

        const updatesToApply = finalUpdates.map(({ originalTitle, originalFolder, originalTags, ...u }) => ({
            ...u,
            originalFolder: originalFolder,
            newFolder: u.newFolder || u.suggestedFolder,
            tags: [...new Set([...(u.tags || []), ...(u.ruleTags || [])])],
            ruleTags: u.ruleTags || [],
            status: 'ai-suggested',
        }))

        const execute = async () => {
            await db.bookmarks.bulkPut(updatesToApply)
        }

        const revert = async () => {
            await db.bookmarks.bulkPut(previousState)
        }

        await execute()

        addCommand({
            undo: revert,
            redo: execute,
            description: t('actionbar.magicSort')
        })

        console.log(`Applied ${updatesToApply.length} sort updates.`)
        useAppStore.getState().setSelectedIds(new Set())
        setPendingSortUpdates(null)
        toast.success(t('toast.sortApplied'))
    }, [pendingSortUpdates, addCommand, t])

    // ── Guarded Export ──
    const guardedExport = useCallback((exportFn) => {
        if (workerRuleConflicts.length > 0) {
            useAppStore.getState().setIsConflictModalOpen(true)
            return
        }
        exportFn()
    }, [workerRuleConflicts])

    // ── Clear / Close ──
    const confirmClearAll = useCallback(async (shouldBackup) => {
        if (shouldBackup) {
            try {
                const data = await createBackup()
                downloadBackup(data)
            } catch (e) {
                console.error("Backup failed before clear:", e)
                alert(t('backup.failed'))
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
        useAppStore.getState().setSelectedIds(new Set())
        useAppStore.getState().setShowBackupModal(false)
        toast.success(t('toast.clearedAll'))
    }, [t])

    const clearAll = useCallback(() => useAppStore.getState().setShowBackupModal(true), [])

    const closeFile = useCallback(() => {
        db.transaction('rw', db.bookmarks, db.rules, async () => {
            await db.bookmarks.clear()
            await db.rules.clear()
        })
        const store = useAppStore.getState()
        store.setSelectedIds(new Set())
        workerSetLinkHealth({})
        store.setSearchQuery('')
        store.setActiveTag(null)
        store.setSmartFilter(null)
    }, [workerSetLinkHealth])

    return {
        // Sort
        pendingSortUpdates, setPendingSortUpdates,
        handleSortPreview, applySortUpdates,

        // Export guard
        guardedExport,

        // Clear / Close
        confirmClearAll, clearAll, closeFile,
    }
}
