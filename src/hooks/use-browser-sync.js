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

            const updatedCount = result.updatedCount || 0
            if (updatedCount > 0) {
                toast.success(t('notifications.browserSyncedWithUpdates', {
                    imported: imported.length,
                    exported: result.exportedCount || 0,
                    updated: updatedCount,
                    defaultValue: `Synced: ${imported.length} imported, ${result.exportedCount || 0} exported, ${updatedCount} updated/moved in browser`
                }))
            } else {
                toast.success(t('notifications.browserSyncedSuccess', {
                    imported: imported.length,
                    exported: result.exportedCount || 0,
                    defaultValue: `Synced: ${imported.length} imported, ${result.exportedCount || 0} exported to browser`
                }))
            }

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

    // Cache library bookmarks in extension storage for instant duplicate detection
    useEffect(() => {
        if (typeof window === 'undefined' || !rawBookmarks || rawBookmarks.length === 0) return
        window.postMessage({
            source: 'BOOKSMART_PAGE',
            type: 'BOOKSMART_CACHE_BOOKMARKS',
            payload: {
                bookmarks: rawBookmarks.map(b => ({
                    id: b.id,
                    title: b.title,
                    url: b.url,
                    newFolder: b.newFolder,
                    originalFolder: b.originalFolder
                }))
            }
        }, '*')
    }, [rawBookmarks])

    // Listen for extension events (e.g. popup sync trigger, active tab capture, session save)
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
                    if (b.newFolder && b.newFolder !== 'BookSmart' && b.newFolder !== 'Root') {
                        try {
                            const folderExists = await db.folders?.where('name').equalsIgnoreCase(b.newFolder).first()
                            if (!folderExists && db.folders) {
                                await db.folders.add({
                                    id: 'f_' + Date.now(),
                                    name: b.newFolder,
                                    order: Date.now()
                                })
                            }
                        } catch {
                            // Ignored
                        }
                    }

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

            if (event.data.type === 'BOOKSMART_SESSION_SAVED') {
                const sessionName = event.data.sessionName || 'Araştırma Oturumu'
                const sessionBookmarks = event.data.bookmarks || []
                if (sessionBookmarks.length > 0) {
                    try {
                        // 1. Ensure folder in db.folders
                        if (db.folders) {
                            const existingFolder = await db.folders.where('name').equalsIgnoreCase(sessionName).first()
                            if (!existingFolder) {
                                await db.folders.add({
                                    id: 'f_' + Date.now(),
                                    name: sessionName,
                                    order: Date.now()
                                })
                            }
                        }

                        // 2. Ensure collection in db.collections
                        if (db.collections) {
                            const existingCollection = await db.collections.where('name').equalsIgnoreCase(sessionName).first()
                            if (!existingCollection) {
                                await db.collections.add({
                                    id: 'c_' + Date.now(),
                                    name: sessionName,
                                    order: Date.now()
                                })
                            }
                        }

                        // 3. Add bookmarks with deduplication
                        const currentBookmarks = await getEffectiveBookmarks(rawBookmarksRef.current)
                        const existingUrls = new Set(currentBookmarks.map(item => normalizeUrl(item.url)).filter(Boolean))
                        const toInsert = []

                        for (const b of sessionBookmarks) {
                            const norm = normalizeUrl(b.url)
                            if (norm && !existingUrls.has(norm)) {
                                existingUrls.add(norm)
                                toInsert.push({
                                    ...b,
                                    newFolder: sessionName,
                                    originalFolder: sessionName,
                                    collections: [sessionName],
                                    tags: Array.isArray(b.tags) ? b.tags : ['session']
                                })
                            }
                        }

                        if (toInsert.length > 0 && db.bookmarks) {
                            await db.bookmarks.bulkAdd(toInsert)
                            const insertedIds = toInsert.map(b => b.id)
                            addCommand?.({
                                undo: () => db.bookmarks.bulkDelete(insertedIds),
                                redo: () => db.bookmarks.bulkAdd(toInsert),
                                description: `Save Session: ${sessionName} (${toInsert.length})`
                            })
                        }

                        toast.success(t('notifications.sessionSavedSuccess', {
                            name: sessionName,
                            count: toInsert.length || sessionBookmarks.length,
                            defaultValue: `"${sessionName}" koleksiyonu kaydedildi (${toInsert.length || sessionBookmarks.length} sekme)`
                        }))
                    } catch (err) {
                        console.error('Failed to save session bookmarks:', err)
                    }
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
