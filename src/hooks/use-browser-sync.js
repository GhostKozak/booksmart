import { useState, useCallback, useEffect, useRef } from 'react'
import { db } from '../db'
import {
    getBrowserBookmarks,
    pushBookmarksToBrowser,
    syncBrowserBookmarks,
    isExtensionConnected,
    pingExtension
} from '../lib/extension-client'
import { normalizeUrl } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

/**
 * Deduplicates bookmarks both within the list and against existing library URLs.
 */
function deduplicateBookmarks(bookmarksList, existingUrlSet = new Set()) {
    const seen = new Set(existingUrlSet)
    const result = []
    for (const b of bookmarksList) {
        if (!b || !b.url) continue
        const norm = normalizeUrl(b.url)
        if (!norm) continue
        if (!seen.has(norm)) {
            seen.add(norm)
            result.push(b)
        }
    }
    return result
}

async function getEffectiveBookmarks(provided) {
    if (provided && provided.length > 0) return provided
    try {
        if (db?.bookmarks) {
            const fromDb = await db.bookmarks.toArray()
            if (fromDb && fromDb.length > 0) return fromDb
        }
    } catch {
        // Fallback
    }
    return provided || []
}

function isDomEvent(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return (
        'nativeEvent' in obj ||
        typeof obj.preventDefault === 'function' ||
        typeof obj.stopPropagation === 'function' ||
        (typeof Event !== 'undefined' && obj instanceof Event)
    );
}

export function useBrowserSync({ rawBookmarks = [], addCommand }) {
    const { t } = useTranslation()
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncResult, setLastSyncResult] = useState(null)
    const rawBookmarksRef = useRef(rawBookmarks)

    useEffect(() => {
        rawBookmarksRef.current = rawBookmarks
    }, [rawBookmarks])

    /**
     * Imports bookmarks from the browser into BookSmart with strict deduplication.
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

            const currentBookmarks = await getEffectiveBookmarks(rawBookmarksRef.current)
            const existingUrls = new Set(currentBookmarks.map(b => normalizeUrl(b.url)).filter(Boolean))
            const newBookmarks = deduplicateBookmarks(browserBookmarks, existingUrls)

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
                defaultValue: `Imported ${newBookmarks.length} bookmarks from browser`
            }))

            return { success: true, count: newBookmarks.length }
        } catch (err) {
            console.error('Failed to import bookmarks from browser:', err)
            toast.error(err.message || 'Failed to import browser bookmarks')
            return { success: false, error: err.message }
        } finally {
            setIsSyncing(false)
        }
    }, [addCommand, t])

    /**
     * Pushes BookSmart bookmarks to browser under a designated folder.
     */
    const pushToBrowser = useCallback(async (bookmarksToPush, options = {}) => {
        if (!isExtensionConnected()) {
            toast.error(t('settings.network.extensionNotDetected', 'Companion extension not detected.'))
            return { success: false, count: 0 }
        }

        const safeBookmarksInput = isDomEvent(bookmarksToPush) ? undefined : bookmarksToPush
        const safeOptions = isDomEvent(options) ? {} : (isDomEvent(bookmarksToPush) ? {} : options)

        const targetBookmarks = await getEffectiveBookmarks(safeBookmarksInput || rawBookmarksRef.current)
        if (!targetBookmarks || targetBookmarks.length === 0) {
            toast.info(t('notifications.noBookmarksToExport', 'No bookmarks to push.'))
            return { success: false, count: 0 }
        }

        setIsSyncing(true)
        try {
            const folderName = safeOptions.targetFolderName || 'BookSmart'
            const result = await pushBookmarksToBrowser(targetBookmarks, {
                targetFolderName: folderName,
                clean: safeOptions.clean ?? false
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
    }, [t])

    /**
     * Executes intelligent two-way synchronization.
     */
    const twoWaySync = useCallback(async (options = {}) => {
        if (!isExtensionConnected()) {
            toast.error(t('settings.network.extensionNotDetected', 'Companion extension not detected.'))
            return { success: false }
        }

        const safeOptions = isDomEvent(options) ? {} : options

        setIsSyncing(true)
        try {
            const currentBookmarks = await getEffectiveBookmarks(rawBookmarksRef.current)
            const result = await syncBrowserBookmarks(currentBookmarks, safeOptions)
            const rawImported = result.importedBookmarks || []
            const existingUrls = new Set(currentBookmarks.map(b => normalizeUrl(b.url)).filter(Boolean))
            const imported = deduplicateBookmarks(rawImported, existingUrls)

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

            return { success: true, ...result, importedBookmarks: imported }
        } catch (err) {
            console.error('Failed two-way sync with browser:', err)
            toast.error(err.message || 'Two-way sync failed')
            return { success: false, error: err.message }
        } finally {
            setIsSyncing(false)
        }
    }, [addCommand, t])

    // Auto-sync on mount if opened with ?sync=auto (e.g. from extension popup)
    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const params = new URLSearchParams(window.location.search)
            if (params.get('sync') === 'auto') {
                params.delete('sync')
                const newSearch = params.toString() ? `?${params.toString()}` : ''
                const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`
                window.history.replaceState({}, '', newUrl)

                const timer = setTimeout(async () => {
                    if (!isExtensionConnected()) {
                        await pingExtension(1500).catch(() => {})
                    }
                    if (isExtensionConnected()) {
                        twoWaySync()
                    }
                }, 300)
                return () => clearTimeout(timer)
            }
        } catch (err) {
            console.error('Failed to parse URL for auto-sync:', err)
        }
    }, [twoWaySync])

    // Listen for extension events (e.g. popup sync trigger, active tab capture)
    useEffect(() => {
        const handleExtensionEvent = async (event) => {
            if (event.source !== window || !event.data || event.data.source !== 'BOOKSMART_EXTENSION') {
                return
            }

            if (event.data.type === 'BOOKSMART_TRIGGER_SYNC') {
                twoWaySync()
            }

            if (event.data.type === 'BOOKSMART_TAB_CAPTURED' && event.data.bookmark) {
                const b = event.data.bookmark
                const norm = normalizeUrl(b.url)
                const currentBookmarks = await getEffectiveBookmarks(rawBookmarksRef.current)
                const exists = currentBookmarks.some(item => normalizeUrl(item.url) === norm)
                if (!exists) {
                    db.bookmarks.add(b).then(() => {
                        addCommand?.({
                            undo: () => db.bookmarks.delete(b.id),
                            redo: () => db.bookmarks.add(b),
                            description: `Save Tab: ${b.title || b.url}`
                        })
                        toast.success(t('notifications.tabCaptured', {
                            title: (b.title || b.url).slice(0, 30),
                            defaultValue: `Saved active tab: ${(b.title || b.url).slice(0, 30)}`
                        }))
                    }).catch(err => {
                        console.error('Failed to add captured tab to database:', err)
                    })
                }
            }
        }

        window.addEventListener('message', handleExtensionEvent)
        return () => window.removeEventListener('message', handleExtensionEvent)
    }, [twoWaySync, addCommand, t])

    return {
        isSyncing,
        lastSyncResult,
        importFromBrowser,
        pushToBrowser,
        twoWaySync
    }
}
