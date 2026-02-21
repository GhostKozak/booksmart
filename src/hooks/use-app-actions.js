import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { createBackup, downloadBackup } from '../lib/backup-manager'
import { toast } from 'sonner'

export function useAppActions({
    addCommand,
    setSmartFilter,
    setSearchQuery,
    setActiveTag,
    setShowBackupModal,
    workerSetLinkHealth,
    workerRuleConflicts,
    setIsConflictModalOpen,
    displayBookmarks,
}) {
    const { t } = useTranslation()

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState(new Set())

    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) { next.delete(id) } else { next.add(id) }
            return next
        })
    }, [])

    const toggleAll = useCallback(() => {
        setSelectedIds(prev => {
            if (prev.size === displayBookmarks.length) {
                return new Set()
            }
            return new Set(displayBookmarks.map(b => b.id))
        })
    }, [displayBookmarks])

    // ── Sort Confirmation ──
    const [pendingSortUpdates, setPendingSortUpdates] = useState(null)

    const handleSortPreview = useCallback((updates) => {
        setPendingSortUpdates(updates)
    }, [])

    const applySortUpdates = useCallback(async () => {
        if (!pendingSortUpdates) return

        const previousState = await db.bookmarks.bulkGet(pendingSortUpdates.map(u => u.id))

        const updatesToApply = pendingSortUpdates.map(u => ({
            ...u,
            newFolder: u.newFolder,
            tags: [...new Set([...(u.tags || []), ...(u.ruleTags || [])])],
            ruleTags: [],
            status: 'idle',
            suggestedFolder: null
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
        setSelectedIds(new Set())
        setPendingSortUpdates(null)
        toast.success(t('toast.sortApplied'))
    }, [pendingSortUpdates, addCommand, t])

    // ── Guarded Export ──
    const guardedExport = useCallback((exportFn) => {
        if (workerRuleConflicts.length > 0) {
            setIsConflictModalOpen(true)
            return
        }
        exportFn()
    }, [workerRuleConflicts, setIsConflictModalOpen])

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
        setSelectedIds(new Set())
        setShowBackupModal(false)
        toast.success(t('toast.clearedAll'))
    }, [t, setShowBackupModal])

    const clearAll = useCallback(() => setShowBackupModal(true), [setShowBackupModal])

    const closeFile = useCallback(() => {
        db.transaction('rw', db.bookmarks, db.rules, async () => {
            await db.bookmarks.clear()
            await db.rules.clear()
        })
        setSelectedIds(new Set())
        workerSetLinkHealth({})
        setSearchQuery('')
        setActiveTag(null)
        setSmartFilter(null)
    }, [workerSetLinkHealth, setSearchQuery, setActiveTag, setSmartFilter])

    return {
        // Selection
        selectedIds, setSelectedIds,
        toggleSelection, toggleAll,

        // Sort
        pendingSortUpdates, setPendingSortUpdates,
        handleSortPreview, applySortUpdates,

        // Export guard
        guardedExport,

        // Clear / Close
        confirmClearAll, clearAll, closeFile,
    }
}
