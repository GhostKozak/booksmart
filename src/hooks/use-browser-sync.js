import { useState, useCallback } from 'react'
import { db } from '../db'
import {
    getBrowserBookmarks,
    pushBookmarksToBrowser,
    syncBrowserBookmarks,
    isExtensionConnected
} from '../lib/extension-client'
import { normalizeUrl } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function useBrowserSync({ rawBookmarks = [], addCommand }) {
    const { t } = useTranslation()
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncResult, setLastSyncResult] = useState(null)

    /**
     * Imports bookmarks from the browser into BookSmart.
     */
    const importFromBrowser = useCallback(async () => {
        if (!isExtensionConnected()) {
            toast.error(t('settings.network.extensionNotDetected', 'Companion extension not detected.'))
            return { success: false, count: 0 }
        }

        setIsSyncing(true)
        try {
            const browserBookmarks = await getBrowserBookmarks()
            if (!browserBookmarks || browserBookmarks.length === 0) {
                toast.info(t('notifications.noBookmarksInBrowser', 'No bookmarks found in the browser.'))
                return { success: true, count: 0 }
            }

            if (rawBookmarks.length === 0) {
                // Initial import - load everything directly
                await db.transaction('rw', db.bookmarks, async () => {
                    await db.bookmarks.bulkAdd(browserBookmarks)
                })

                addCommand?.({
                    undo: () => db.bookmarks.clear(),
                    redo: () => db.bookmarks.bulkAdd(browserBookmarks),
                    description: `Import ${browserBookmarks.length} Browser Bookmarks`
                })

                toast.success(t('notifications.browserImportedSuccess', {
                    count: browserBookmarks.length,
                    defaultValue: `Imported ${browserBookmarks.length} bookmarks from browser`
                }))

                return { success: true, count: browserBookmarks.length }
            }

            // Existing library - merge non-duplicate bookmarks
            const existingUrls = new Set(rawBookmarks.map(b => normalizeUrl(b.url)).filter(Boolean))
            const newBookmarks = browserBookmarks.filter(b => {
                const norm = normalizeUrl(b.url)
                return norm && !existingUrls.has(norm)
            })

            if (newBookmarks.length === 0) {
                toast.info(t('notifications.allBookmarksAlreadyImported', 'All browser bookmarks are already in your library.'))
                return { success: true, count: 0 }
            }

            await db.transaction('rw', db.bookmarks, async () => {
                await db.bookmarks.bulkAdd(newBookmarks)
            })

            const newIds = newBookmarks.map(b => b.id)
            addCommand?.({
                undo: () => db.bookmarks.bulkDelete(newIds),
                redo: () => db.bookmarks.bulkAdd(newBookmarks),
                description: `Import ${newBookmarks.length} Browser Bookmarks`
            })

            toast.success(t('notifications.browserImportedSuccess', {
                count: newBookmarks.length,
                defaultValue: `Imported ${newBookmarks.length} new bookmarks from browser`
            }))

            return { success: true, count: newBookmarks.length }
        } catch (err) {
            console.error('Failed to import bookmarks from browser:', err)
            toast.error(err.message || 'Failed to import browser bookmarks')
            return { success: false, error: err.message }
        } finally {
            setIsSyncing(false)
        }
    }, [rawBookmarks, addCommand, t])

    /**
     * Pushes BookSmart bookmarks to browser under a designated folder.
     */
    const pushToBrowser = useCallback(async (bookmarksToPush, options = {}) => {
        if (!isExtensionConnected()) {
            toast.error(t('settings.network.extensionNotDetected', 'Companion extension not detected.'))
            return { success: false, count: 0 }
        }

        const targetBookmarks = bookmarksToPush || rawBookmarks
        if (!targetBookmarks || targetBookmarks.length === 0) {
            toast.info(t('notifications.noBookmarksToExport', 'No bookmarks to push.'))
            return { success: false, count: 0 }
        }

        setIsSyncing(true)
        try {
            const folderName = options.targetFolderName || 'BookSmart'
            const result = await pushBookmarksToBrowser(targetBookmarks, {
                targetFolderName: folderName,
                clean: options.clean ?? false
            })

            toast.success(t('notifications.browserPushedSuccess', {
                count: result.count,
                folder: result.folder,
                defaultValue: `Pushed ${result.count} bookmarks to browser folder "${result.folder}"`
            }))

            return { success: true, count: result.count, folder: result.folder }
        } catch (err) {
            console.error('Failed to push bookmarks to browser:', err)
            toast.error(err.message || 'Failed to push bookmarks to browser')
            return { success: false, error: err.message }
        } finally {
            setIsSyncing(false)
        }
    }, [rawBookmarks, t])

    /**
     * Executes intelligent two-way synchronization.
     */
    const twoWaySync = useCallback(async (options = {}) => {
        if (!isExtensionConnected()) {
            toast.error(t('settings.network.extensionNotDetected', 'Companion extension not detected.'))
            return { success: false }
        }

        setIsSyncing(true)
        try {
            const result = await syncBrowserBookmarks(rawBookmarks, options)
            const imported = result.importedBookmarks || []

            if (imported.length > 0) {
                await db.transaction('rw', db.bookmarks, async () => {
                    await db.bookmarks.bulkAdd(imported)
                })

                const importedIds = imported.map(b => b.id)
                addCommand?.({
                    undo: () => db.bookmarks.bulkDelete(importedIds),
                    redo: () => db.bookmarks.bulkAdd(imported),
                    description: `Sync ${imported.length} Browser Bookmarks`
                })
            }

            setLastSyncResult(result)

            toast.success(t('notifications.browserSyncedSuccess', {
                imported: imported.length,
                exported: result.exportedCount || 0,
                defaultValue: `Synced: ${imported.length} imported, ${result.exportedCount || 0} exported to browser`
            }))

            return { success: true, ...result }
        } catch (err) {
            console.error('Failed two-way sync with browser:', err)
            toast.error(err.message || 'Two-way sync failed')
            return { success: false, error: err.message }
        } finally {
            setIsSyncing(false)
        }
    }, [rawBookmarks, addCommand, t])

    return {
        isSyncing,
        lastSyncResult,
        importFromBrowser,
        pushToBrowser,
        twoWaySync
    }
}
