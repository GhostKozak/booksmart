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
        const previousMap = new Map((previousState || []).filter(Boolean).map(p => [p.id, p]))

        const updatesToApply = finalUpdates.map(u => {
            const prev = previousMap.get(u.id) || {}
            const hasFolderUpdate = Boolean(u.newFolder && u.newFolder !== (u.originalFolder || prev.originalFolder))
            const effectiveNewFolder = u.newFolder !== undefined
                ? u.newFolder
                : (u.suggestedFolder || prev.newFolder || prev.originalFolder || '')
            const effectiveOriginalFolder = u.originalFolder !== undefined
                ? u.originalFolder
                : (prev.originalFolder || '')

            return {
                ...prev,
                ...u,
                originalFolder: effectiveOriginalFolder,
                newFolder: effectiveNewFolder,
                tags: [...new Set([...(u.tags || prev.tags || []), ...(u.ruleTags || [])])],
                ruleTags: u.ruleTags || prev.ruleTags || [],
                status: u.status || (hasFolderUpdate ? 'ai-suggested' : (prev.status || 'unchanged')),
            }
        })

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
        await db.transaction('rw', db.bookmarks, db.rules, db.folders, db.tags, db.ignoredUrls, db.collections, async () => {
            await db.bookmarks.clear()
            await db.rules.clear()
            await db.folders.clear()
            await db.tags.clear()
            await db.ignoredUrls.clear()
            await db.collections.clear()
        })
        useAppStore.getState().setSelectedIds(new Set())
        useAppStore.getState().setShowBackupModal(false)
        toast.success(t('toast.clearedAll'))
    }, [t])

    const clearAll = useCallback(() => useAppStore.getState().setShowBackupModal(true), [])

    const closeFile = useCallback(() => {
        db.transaction('rw', db.bookmarks, db.rules, db.folders, db.tags, db.ignoredUrls, db.collections, async () => {
            await db.bookmarks.clear()
            await db.rules.clear()
            await db.folders.clear()
            await db.tags.clear()
            await db.ignoredUrls.clear()
            await db.collections.clear()
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
