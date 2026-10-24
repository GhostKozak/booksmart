import { useMemo, useCallback } from 'react'
import { db } from '../db'
import { generateUUID, pickTagColor, normalizeUrl } from '../lib/utils'
import { cleanUrl, countCleanableUrls } from '../lib/url-cleaner'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAppStore } from '../store/useAppStore'

export function useBookmarkOperations({
    rawBookmarks,
    bookmarks,
    addCommand,
    selectedIds,
    setSelectedIds,
    availableFolders,
    linkHealth,
    setLinkHealth,
    setSmartFilter
}) {
    const { t } = useTranslation()
    const cleanableCount = useMemo(() => countCleanableUrls(rawBookmarks), [rawBookmarks])

    const removeDuplicates = async () => {
        const urls = new Set()
        const toDeleteIds = []
        const sortedBookmarks = [...rawBookmarks].sort((a, b) => (parseInt(b.addDate) || 0) - (parseInt(a.addDate) || 0))

        sortedBookmarks.forEach(b => {
            const normalized = normalizeUrl(b.url)
            if (!normalized) return
            if (urls.has(normalized)) {
                toDeleteIds.push(b.id)
            } else {
                urls.add(normalized)
            }
        })

        if (toDeleteIds.length > 0) {
            const bookmarksToDelete = (await db.bookmarks.bulkGet(toDeleteIds)).filter(Boolean)
            await db.bookmarks.bulkDelete(toDeleteIds)

            addCommand({
                undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
                redo: () => db.bookmarks.bulkDelete(toDeleteIds),
                description: `Remove ${toDeleteIds.length} Duplicate Bookmarks`
            })
        }
    }

    const mergeDuplicates = async () => {
        const groups = new Map()
        const sortedBookmarks = [...rawBookmarks].sort((a, b) => (parseInt(b.addDate) || 0) - (parseInt(a.addDate) || 0))

        sortedBookmarks.forEach(b => {
            const normalized = normalizeUrl(b.url)
            if (!normalized) return
            if (!groups.has(normalized)) {
                groups.set(normalized, [])
            }
            groups.get(normalized).push(b)
        })

        const primaryUpdates = []
        const toDeleteIds = []
        const bookmarksToDelete = []
        const allNewTags = new Set()

        for (const [, items] of groups) {
            if (items.length <= 1) continue

            const primary = items[0]
            const duplicates = items.slice(1)

            // Merge tags
            const primaryTags = Array.isArray(primary.tags)
                ? primary.tags
                : (typeof primary.tags === 'string' && primary.tags ? primary.tags.split(',').map(t => t.trim()) : [])
            const mergedTagsSet = new Set(primaryTags.filter(Boolean))

            duplicates.forEach(d => {
                const dTags = Array.isArray(d.tags)
                    ? d.tags
                    : (typeof d.tags === 'string' && d.tags ? d.tags.split(',').map(t => t.trim()) : [])
                dTags.filter(Boolean).forEach(t => {
                    mergedTagsSet.add(t)
                    allNewTags.add(t)
                })
            })
            const mergedTags = Array.from(mergedTagsSet)

            // Merge notes
            const notes = [primary.note, ...duplicates.map(d => d.note)]
                .map(n => (n || '').trim())
                .filter(Boolean)
            const uniqueNotes = Array.from(new Set(notes))
            const mergedNote = uniqueNotes.join('\n\n---\n\n')

            // Fallback description
            const mergedDescription = primary.description || duplicates.find(d => (d.description || '').trim())?.description || ''

            // Collections merge
            const primaryCollections = Array.isArray(primary.collections) ? primary.collections : []
            const mergedCollectionsSet = new Set(primaryCollections)
            duplicates.forEach(d => {
                if (Array.isArray(d.collections)) {
                    d.collections.forEach(c => mergedCollectionsSet.add(c))
                }
            })
            const mergedCollections = Array.from(mergedCollectionsSet)

            primaryUpdates.push({
                id: primary.id,
                original: { ...primary },
                updated: {
                    tags: mergedTags,
                    note: mergedNote,
                    description: mergedDescription,
                    collections: mergedCollections
                }
            })

            duplicates.forEach(d => {
                toDeleteIds.push(d.id)
                bookmarksToDelete.push({ ...d })
            })
        }

        if (toDeleteIds.length === 0) return

        await db.transaction('rw', [db.bookmarks, db.tags], async () => {
            for (const { id, updated } of primaryUpdates) {
                await db.bookmarks.update(id, updated)
            }
            await db.bookmarks.bulkDelete(toDeleteIds)

            if (allNewTags.size > 0 && db.tags) {
                const existingTags = await db.tags.toArray()
                const existingTagNames = new Set((existingTags || []).map(t => t.name?.toLowerCase()))
                const tagsToAdd = []
                for (const tagName of allNewTags) {
                    if (!existingTagNames.has(tagName.toLowerCase())) {
                        tagsToAdd.push({ id: generateUUID(), name: tagName, color: pickTagColor() })
                        existingTagNames.add(tagName.toLowerCase())
                    }
                }
                if (tagsToAdd.length > 0) {
                    await db.tags.bulkAdd(tagsToAdd)
                }
            }
        })

        toast.success(t('notifications.duplicatesMerged', { count: toDeleteIds.length }) || `Merged ${toDeleteIds.length} duplicate bookmarks`)

        addCommand({
            undo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    for (const { id, original } of primaryUpdates) {
                        await db.bookmarks.update(id, {
                            tags: original.tags,
                            note: original.note,
                            description: original.description,
                            collections: original.collections
                        })
                    }
                    await db.bookmarks.bulkAdd(bookmarksToDelete)
                })
            },
            redo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    for (const { id, updated } of primaryUpdates) {
                        await db.bookmarks.update(id, updated)
                    }
                    await db.bookmarks.bulkDelete(toDeleteIds)
                })
            },
            description: `Merge ${toDeleteIds.length} Duplicate Bookmarks`
        })
    }

    const mergeDuplicateGroup = async (targetBookmarkOrUrl) => {
        const targetUrl = typeof targetBookmarkOrUrl === 'string' ? targetBookmarkOrUrl : targetBookmarkOrUrl?.url
        if (!targetUrl) return
        const normalizedTarget = normalizeUrl(targetUrl)
        if (!normalizedTarget) return

        const matching = rawBookmarks.filter(b => {
            return normalizeUrl(b.url) === normalizedTarget
        }).sort((a, b) => (parseInt(b.addDate) || 0) - (parseInt(a.addDate) || 0))

        if (matching.length <= 1) return

        const primary = matching[0]
        const duplicates = matching.slice(1)
        const toDeleteIds = duplicates.map(d => d.id)
        const bookmarksToDelete = duplicates.map(d => ({ ...d }))

        // Merge tags
        const primaryTags = Array.isArray(primary.tags)
            ? primary.tags
            : (typeof primary.tags === 'string' && primary.tags ? primary.tags.split(',').map(t => t.trim()) : [])
        const mergedTagsSet = new Set(primaryTags.filter(Boolean))
        const allNewTags = new Set()

        duplicates.forEach(d => {
            const dTags = Array.isArray(d.tags)
                ? d.tags
                : (typeof d.tags === 'string' && d.tags ? d.tags.split(',').map(t => t.trim()) : [])
            dTags.filter(Boolean).forEach(t => {
                mergedTagsSet.add(t)
                allNewTags.add(t)
            })
        })
        const mergedTags = Array.from(mergedTagsSet)

        // Merge notes
        const notes = [primary.note, ...duplicates.map(d => d.note)]
            .map(n => (n || '').trim())
            .filter(Boolean)
        const uniqueNotes = Array.from(new Set(notes))
        const mergedNote = uniqueNotes.join('\n\n---\n\n')

        // Fallback description
        const mergedDescription = primary.description || duplicates.find(d => (d.description || '').trim())?.description || ''

        // Collections
        const primaryCollections = Array.isArray(primary.collections) ? primary.collections : []
        const mergedCollectionsSet = new Set(primaryCollections)
        duplicates.forEach(d => {
            if (Array.isArray(d.collections)) {
                d.collections.forEach(c => mergedCollectionsSet.add(c))
            }
        })
        const mergedCollections = Array.from(mergedCollectionsSet)

        const updated = {
            tags: mergedTags,
            note: mergedNote,
            description: mergedDescription,
            collections: mergedCollections
        }

        const original = { ...primary }

        await db.transaction('rw', [db.bookmarks, db.tags], async () => {
            await db.bookmarks.update(primary.id, updated)
            await db.bookmarks.bulkDelete(toDeleteIds)
            if (allNewTags.size > 0 && db.tags) {
                const existingTags = await db.tags.toArray()
                const existingTagNames = new Set((existingTags || []).map(t => t.name?.toLowerCase()))
                const tagsToAdd = []
                for (const tagName of allNewTags) {
                    if (!existingTagNames.has(tagName.toLowerCase())) {
                        tagsToAdd.push({ id: generateUUID(), name: tagName, color: pickTagColor() })
                        existingTagNames.add(tagName.toLowerCase())
                    }
                }
                if (tagsToAdd.length > 0) {
                    await db.tags.bulkAdd(tagsToAdd)
                }
            }
        })

        toast.success(t('notifications.duplicatesMerged', { count: toDeleteIds.length }) || `Merged ${toDeleteIds.length} duplicate bookmarks`)

        addCommand({
            undo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    await db.bookmarks.update(primary.id, {
                        tags: original.tags,
                        note: original.note,
                        description: original.description,
                        collections: original.collections
                    })
                    await db.bookmarks.bulkAdd(bookmarksToDelete)
                })
            },
            redo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    await db.bookmarks.update(primary.id, updated)
                    await db.bookmarks.bulkDelete(toDeleteIds)
                })
            },
            description: `Merge Duplicate Group for ${primary.title || primary.url}`
        })
    }

    const mergeSimilarClusters = async (clusters = []) => {
        if (!Array.isArray(clusters) || clusters.length === 0) return 0;

        const primaryUpdates = [];
        const toDeleteIds = [];
        const bookmarksToDelete = [];
        const allNewTags = new Set();

        for (const cluster of clusters) {
            const { primary, secondaries, mergedPreview } = cluster;
            if (!primary || !secondaries || secondaries.length === 0) continue;

            const updated = {
                tags: mergedPreview?.tags || primary.tags || [],
                note: mergedPreview?.note || primary.note || '',
                description: mergedPreview?.description || primary.description || '',
                collections: mergedPreview?.collections || primary.collections || []
            };

            primaryUpdates.push({
                id: primary.id,
                original: { ...primary },
                updated
            });

            (mergedPreview?.tags || []).forEach(t => allNewTags.add(t));

            secondaries.forEach(d => {
                toDeleteIds.push(d.id);
                bookmarksToDelete.push({ ...d });
            });
        }

        if (toDeleteIds.length === 0) return 0;

        await db.transaction('rw', [db.bookmarks, db.tags], async () => {
            for (const { id, updated } of primaryUpdates) {
                await db.bookmarks.update(id, updated);
            }
            await db.bookmarks.bulkDelete(toDeleteIds);

            if (allNewTags.size > 0 && db.tags) {
                const existingTags = await db.tags.toArray();
                const existingTagNames = new Set((existingTags || []).map(t => t.name?.toLowerCase()));
                const tagsToAdd = [];
                for (const tagName of allNewTags) {
                    if (!existingTagNames.has(tagName.toLowerCase())) {
                        tagsToAdd.push({ id: generateUUID(), name: tagName, color: pickTagColor() });
                        existingTagNames.add(tagName.toLowerCase());
                    }
                }
                if (tagsToAdd.length > 0) {
                    await db.tags.bulkAdd(tagsToAdd);
                }
            }
        });

        toast.success(t('notifications.duplicatesMerged', { count: toDeleteIds.length }) || `Merged ${toDeleteIds.length} duplicate bookmarks`);

        addCommand({
            undo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    for (const { id, original } of primaryUpdates) {
                        await db.bookmarks.update(id, {
                            tags: original.tags,
                            note: original.note,
                            description: original.description,
                            collections: original.collections
                        });
                    }
                    await db.bookmarks.bulkAdd(bookmarksToDelete);
                });
            },
            redo: async () => {
                await db.transaction('rw', db.bookmarks, async () => {
                    for (const { id, updated } of primaryUpdates) {
                        await db.bookmarks.update(id, updated);
                    }
                    await db.bookmarks.bulkDelete(toDeleteIds);
                });
            },
            description: `Merge ${clusters.length} Similar Clusters`
        });

        return toDeleteIds.length;
    };

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
            const bookmarksToDelete = (await db.bookmarks.bulkGet(idsToDelete)).filter(Boolean)
            await db.bookmarks.bulkDelete(idsToDelete)

            addCommand({
                undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
                redo: () => db.bookmarks.bulkDelete(idsToDelete),
                description: `Delete ${idsToDelete.length} bookmarks`
            })

            setSelectedIds(new Set())
            toast.success(t('toast.deleted', { count: idsToDelete.length }))
        }
    }, [selectedIds, addCommand, setSelectedIds, t])

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
                const allExistingTags = await db.tags.toArray()
                const existingTagNames = new Set(allExistingTags.map(t => t.name))

                const tagsToCreate = newTags.filter(t => !existingTagNames.has(t))
                if (tagsToCreate.length > 0) {
                    await db.tags.bulkAdd(tagsToCreate.map(t => ({
                        id: generateUUID(),
                        name: t,
                        color: pickTagColor(t),
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

    const moveFolder = useCallback(async (sourceFolderPath, targetParentPath) => {
        if (!sourceFolderPath) return false

        const folderName = sourceFolderPath.split(' > ').pop().trim()

        let newFolderPath
        if (!targetParentPath || targetParentPath === '__ROOT__') {
            newFolderPath = folderName
        } else {
            if (targetParentPath === sourceFolderPath) {
                return false
            }
            if (targetParentPath.startsWith(sourceFolderPath + ' > ')) {
                toast.error(t('bookmarks.tree.cannotMoveIntoChild', 'Bir klasör kendi alt klasörünün içine taşınamaz'))
                return false
            }
            newFolderPath = `${targetParentPath} > ${folderName}`
        }

        if (newFolderPath === sourceFolderPath) {
            return false
        }

        const allBookmarks = await db.bookmarks.toArray()
        const prefix = sourceFolderPath + ' > '
        const affected = allBookmarks.filter(b => {
            const folder = b.newFolder || b.originalFolder || ''
            return folder === sourceFolderPath || folder.startsWith(prefix)
        })

        const originalBookmarkStates = affected.map(b => ({
            id: b.id,
            originalFolder: b.originalFolder,
            newFolder: b.newFolder
        }))

        const updates = affected.map(b => {
            const folder = b.newFolder || b.originalFolder || ''
            let updatedFolder
            if (folder === sourceFolderPath) {
                updatedFolder = newFolderPath
            } else {
                updatedFolder = newFolderPath + folder.slice(sourceFolderPath.length)
            }
            return {
                id: b.id,
                originalFolder: updatedFolder,
                newFolder: updatedFolder
            }
        })

        const allDbFolders = await db.folders.toArray()
        const affectedDbFolders = allDbFolders.filter(f => f.name === sourceFolderPath || f.name.startsWith(prefix))
        const originalDbFolderStates = affectedDbFolders.map(f => ({ id: f.id, name: f.name }))
        const folderUpdates = affectedDbFolders.map(f => {
            let updatedName
            if (f.name === sourceFolderPath) {
                updatedName = newFolderPath
            } else {
                updatedName = newFolderPath + f.name.slice(sourceFolderPath.length)
            }
            return { id: f.id, name: updatedName }
        })

        await db.transaction('rw', [db.bookmarks, db.folders], async () => {
            for (const u of updates) {
                await db.bookmarks.update(u.id, { originalFolder: u.originalFolder, newFolder: u.newFolder })
            }
            for (const fu of folderUpdates) {
                await db.folders.update(fu.id, { name: fu.name })
            }
        })

        try {
            const store = useAppStore.getState?.()
            if (store) {
                if (store.activeFolder === sourceFolderPath) {
                    store.setActiveFolder(newFolderPath)
                } else if (store.activeFolder && store.activeFolder.startsWith(prefix)) {
                    store.setActiveFolder(newFolderPath + store.activeFolder.slice(sourceFolderPath.length))
                }
            }
        } catch {
            // Ignore if store is not available
        }

        if (addCommand) {
            addCommand({
                undo: () => db.transaction('rw', [db.bookmarks, db.folders], async () => {
                    for (const s of originalBookmarkStates) {
                        await db.bookmarks.update(s.id, { originalFolder: s.originalFolder, newFolder: s.newFolder })
                    }
                    for (const fs of originalDbFolderStates) {
                        await db.folders.update(fs.id, { name: fs.name })
                    }
                    try {
                        const store = useAppStore.getState?.()
                        if (store) {
                            if (store.activeFolder === newFolderPath) {
                                store.setActiveFolder(sourceFolderPath)
                            } else if (store.activeFolder && store.activeFolder.startsWith(newFolderPath + ' > ')) {
                                store.setActiveFolder(sourceFolderPath + store.activeFolder.slice(newFolderPath.length))
                            }
                        }
                    } catch {
                        // ignore store update error
                    }
                }),
                redo: () => db.transaction('rw', [db.bookmarks, db.folders], async () => {
                    for (const u of updates) {
                        await db.bookmarks.update(u.id, { originalFolder: u.originalFolder, newFolder: u.newFolder })
                    }
                    for (const fu of folderUpdates) {
                        await db.folders.update(fu.id, { name: fu.name })
                    }
                    try {
                        const store = useAppStore.getState?.()
                        if (store) {
                            if (store.activeFolder === sourceFolderPath) {
                                store.setActiveFolder(newFolderPath)
                            } else if (store.activeFolder && store.activeFolder.startsWith(prefix)) {
                                store.setActiveFolder(newFolderPath + store.activeFolder.slice(sourceFolderPath.length))
                            }
                        }
                    } catch {
                        // ignore store update error
                    }
                }),
                description: `Move folder "${folderName}" to "${newFolderPath}"`
            })
        }

        toast.success(t('bookmarks.tree.folderMoved', {
            folder: folderName,
            target: newFolderPath,
            defaultValue: `"${folderName}" klasörü taşındı`
        }))
        return true
    }, [addCommand, t])

    const moveBookmark = useCallback(async (bookmarkId, targetFolderPath) => {
        if (!bookmarkId) return false
        const bookmark = await db.bookmarks.get(bookmarkId)
        if (!bookmark) return false

        const currentFolder = bookmark.newFolder || bookmark.originalFolder || ''
        const normalizedTarget = (!targetFolderPath || targetFolderPath === '__ROOT__') ? '' : targetFolderPath

        if (currentFolder === normalizedTarget) return false

        const originalState = {
            id: bookmark.id,
            originalFolder: bookmark.originalFolder,
            newFolder: bookmark.newFolder
        }

        await db.bookmarks.update(bookmark.id, {
            originalFolder: normalizedTarget,
            newFolder: normalizedTarget
        })

        if (addCommand) {
            addCommand({
                undo: () => db.bookmarks.update(bookmark.id, {
                    originalFolder: originalState.originalFolder,
                    newFolder: originalState.newFolder
                }),
                redo: () => db.bookmarks.update(bookmark.id, {
                    originalFolder: normalizedTarget,
                    newFolder: normalizedTarget
                }),
                description: `Move bookmark "${bookmark.title}" to "${normalizedTarget || 'Root'}"`
            })
        }

        toast.success(t('bookmarks.tree.bookmarkMoved', {
            title: bookmark.title,
            folder: normalizedTarget || 'Root',
            defaultValue: `Yer imi "${normalizedTarget || 'Kök Dizin'}" klasörüne taşındı`
        }))
        return true
    }, [addCommand, t])

    return {
        cleanableCount,
        removeDuplicates,
        mergeDuplicates,
        mergeDuplicateGroup,
        mergeSimilarClusters,
        cleanAllUrls,
        cleanSelectedUrls,
        handleBatchDelete,
        handleBatchMove,
        handleBatchMoveDocs,
        handleStatusOverride,
        handleBatchAddTags,
        moveFolder,
        moveBookmark
    }
}
