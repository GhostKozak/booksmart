import { useState, useMemo, useCallback } from 'react'
import { db } from '../db'
import { generateUUID } from '../lib/utils'
import { cleanUrl, countCleanableUrls } from '../lib/url-cleaner'

export function useBookmarkOperations({
    rawBookmarks,
    bookmarks,
    addCommand,
    selectedIds,
    setSelectedIds,
    availableFolders,
    availableTags,
    linkHealth,
    setLinkHealth,
    setSmartFilter
}) {
    const cleanableCount = useMemo(() => countCleanableUrls(rawBookmarks), [rawBookmarks])

    const removeDuplicates = async () => {
        const urls = new Set()
        const toDeleteIds = []
        const sortedBookmarks = [...rawBookmarks].sort((a, b) => a.addDate - b.addDate)

        sortedBookmarks.forEach(b => {
            if (urls.has(b.url)) {
                toDeleteIds.push(b.id)
            } else {
                urls.add(b.url)
            }
        })

        if (toDeleteIds.length > 0) {
            const bookmarksToDelete = await db.bookmarks.bulkGet(toDeleteIds)
            await db.bookmarks.bulkDelete(toDeleteIds)

            addCommand({
                undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
                redo: () => db.bookmarks.bulkDelete(toDeleteIds),
                description: `Remove ${toDeleteIds.length} Duplicate Bookmarks`
            })
        }
    }

    const cleanAllUrls = async () => {
        const updates = []
        const originalStates = []

        for (const b of rawBookmarks) {
            const { cleaned, changed } = cleanUrl(b.url)
            if (changed) {
                originalStates.push({ id: b.id, url: b.url })
                updates.push({ id: b.id, url: cleaned })
            }
        }

        if (updates.length === 0) return

        await db.transaction('rw', db.bookmarks, async () => {
            for (const u of updates) {
                await db.bookmarks.update(u.id, { url: u.url })
            }
        })

        addCommand({
            undo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const s of originalStates) {
                    await db.bookmarks.update(s.id, { url: s.url })
                }
            }),
            redo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const u of updates) {
                    await db.bookmarks.update(u.id, { url: u.url })
                }
            }),
            description: `Clean ${updates.length} URLs (remove tracking params)`
        })
    }

    const cleanSelectedUrls = async () => {
        const selectedBookmarks = await db.bookmarks.bulkGet([...selectedIds])
        const updates = []
        const originalStates = []

        for (const b of selectedBookmarks) {
            if (!b) continue
            const { cleaned, changed } = cleanUrl(b.url)
            if (changed) {
                originalStates.push({ id: b.id, url: b.url })
                updates.push({ id: b.id, url: cleaned })
            }
        }

        if (updates.length === 0) return

        await db.transaction('rw', db.bookmarks, async () => {
            for (const u of updates) {
                await db.bookmarks.update(u.id, { url: u.url })
            }
        })

        addCommand({
            undo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const s of originalStates) {
                    await db.bookmarks.update(s.id, { url: s.url })
                }
            }),
            redo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const u of updates) {
                    await db.bookmarks.update(u.id, { url: u.url })
                }
            }),
            description: `Clean ${updates.length} selected URLs (remove tracking params)`
        })

        setSelectedIds(new Set())
    }

    const handleBatchDelete = useCallback(async () => {
        const idsToDelete = [...selectedIds]
        if (idsToDelete.length > 0) {
            const bookmarksToDelete = await db.bookmarks.bulkGet(idsToDelete)
            await db.bookmarks.bulkDelete(idsToDelete)

            addCommand({
                undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
                redo: () => db.bookmarks.bulkDelete(idsToDelete),
                description: `Delete ${idsToDelete.length} bookmarks`
            })

            setSelectedIds(new Set())
        }
    }, [selectedIds, addCommand, setSelectedIds])

    const handleBatchMove = async (targetFolder) => {
        const idsToMove = [...selectedIds]
        if (idsToMove.length > 0) {
            const folderExists = availableFolders.some(f => f.name === targetFolder)
            if (targetFolder && !folderExists) {
                await db.folders.add({
                    id: generateUUID(),
                    name: targetFolder,
                    color: '#64748b',
                    order: availableFolders.length
                })
            }

            const bookmarksToMove = await db.bookmarks.bulkGet(idsToMove)
            const originalStates = bookmarksToMove.map(b => ({ id: b.id, originalFolder: b.originalFolder, newFolder: b.newFolder }))

            await db.transaction('rw', db.bookmarks, async () => {
                await db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: targetFolder, newFolder: targetFolder })
            })

            addCommand({
                undo: () => db.transaction('rw', db.bookmarks, async () => {
                    for (const state of originalStates) {
                        await db.bookmarks.update(state.id, { originalFolder: state.originalFolder, newFolder: state.newFolder })
                    }
                }),
                redo: () => db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: targetFolder, newFolder: targetFolder }),
                description: `Move ${idsToMove.length} bookmarks`
            })

            setSelectedIds(new Set())
        }
    }

    const handleBatchMoveDocs = async () => {
        const refFolderExists = availableFolders.some(f => f.name === 'References')
        if (!refFolderExists) {
            await db.folders.add({
                id: generateUUID(),
                name: 'References',
                color: '#3b82f6',
                order: availableFolders.length
            })
        }

        const isDoc = (url) => {
            url = (url || '').toLowerCase()
            return url.endsWith('.pdf') ||
                url.endsWith('.doc') || url.endsWith('.docx') ||
                url.endsWith('.xls') || url.endsWith('.xlsx') ||
                url.endsWith('.ppt') || url.endsWith('.pptx') ||
                url.includes('docs.google.com')
        }

        const bookmarksToMove = await db.bookmarks.filter(b => isDoc(b.url)).toArray()

        if (bookmarksToMove.length > 0) {
            const idsToMove = bookmarksToMove.map(b => b.id)
            const originalStates = bookmarksToMove.map(b => ({ id: b.id, originalFolder: b.originalFolder, newFolder: b.newFolder }))

            await db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: 'References', newFolder: 'References' })

            addCommand({
                undo: () => db.transaction('rw', db.bookmarks, async () => {
                    for (const state of originalStates) {
                        await db.bookmarks.update(state.id, { originalFolder: state.originalFolder, newFolder: state.newFolder })
                    }
                }),
                redo: () => db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: 'References', newFolder: 'References' }),
                description: `Move ${idsToMove.length} documents to References`
            })
        }

        setSmartFilter(null)
    }

    const handleStatusOverride = (status) => {
        const newHealth = { ...linkHealth }
        selectedIds.forEach(id => {
            const bookmark = bookmarks.find(b => b.id === id)
            if (bookmark) {
                newHealth[bookmark.url] = status
            }
        })
        setLinkHealth(newHealth)
        setSelectedIds(new Set())
    }

    const handleBatchAddTags = async (tagsString) => {
        const newTags = tagsString.split(',').map(t => t.trim()).filter(Boolean)
        if (newTags.length === 0) return

        const idsToUpdate = [...selectedIds]
        if (idsToUpdate.length > 0) {
            const bookmarksToUpdate = await db.bookmarks.bulkGet(idsToUpdate)
            const originalStates = bookmarksToUpdate.map(b => ({ id: b.id, tags: b.tags }))

            await db.transaction('rw', db.bookmarks, db.tags, async () => {
                const distinctColor = '#10b981'
                const allExistingTags = await db.tags.toArray()
                const existingTagNames = new Set(allExistingTags.map(t => t.name))

                const tagsToCreate = newTags.filter(t => !existingTagNames.has(t))
                if (tagsToCreate.length > 0) {
                    await db.tags.bulkAdd(tagsToCreate.map(t => ({
                        id: generateUUID(),
                        name: t,
                        color: distinctColor,
                        order: allExistingTags.length
                    })))
                }

                const updates = bookmarksToUpdate.map(bookmark => {
                    let currentTags = []
                    if (Array.isArray(bookmark.tags)) {
                        currentTags = bookmark.tags
                    } else if (typeof bookmark.tags === 'string') {
                        currentTags = bookmark.tags.split(',').map(t => t.trim()).filter(Boolean)
                    }
                    const mergedTags = [...new Set([...currentTags, ...newTags])]
                    return { ...bookmark, tags: mergedTags }
                })
                await db.bookmarks.bulkPut(updates)
            })

            addCommand({
                undo: () => db.transaction('rw', db.bookmarks, async () => {
                    for (const state of originalStates) {
                        await db.bookmarks.update(state.id, { tags: state.tags })
                    }
                }),
                redo: () => db.transaction('rw', db.bookmarks, async () => {
                    const bookmarks = await db.bookmarks.bulkGet(idsToUpdate)
                    const updates = bookmarks.map(bookmark => {
                        let currentTags = []
                        if (Array.isArray(bookmark.tags)) {
                            currentTags = bookmark.tags
                        } else if (typeof bookmark.tags === 'string') {
                            currentTags = bookmark.tags.split(',').map(t => t.trim()).filter(Boolean)
                        }
                        const mergedTags = [...new Set([...currentTags, ...newTags])]
                        return { ...bookmark, tags: mergedTags }
                    })
                    await db.bookmarks.bulkPut(updates)
                }),
                description: `Add tags to ${idsToUpdate.length} bookmarks`
            })

            setSelectedIds(new Set())
        }
    }

    return {
        cleanableCount,
        removeDuplicates,
        cleanAllUrls,
        cleanSelectedUrls,
        handleBatchDelete,
        handleBatchMove,
        handleBatchMoveDocs,
        handleStatusOverride,
        handleBatchAddTags
    }
}
