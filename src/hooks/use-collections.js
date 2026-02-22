import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { generateUUID } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const EMPTY_ARRAY = []

// Default collection icons (emoji)
const COLLECTION_ICONS = ['📚', '⭐', '💼', '🎯', '🔖', '💡', '🎨', '🛒', '📰', '🎮', '🏠', '✈️', '🎵', '📷', '🧪']

export function useCollections({ addCommand }) {
    const { t } = useTranslation()

    const collections = useLiveQuery(() => db.collections.orderBy('order').toArray()) || EMPTY_ARRAY

    const createCollection = useCallback(async ({ name, icon, color }) => {
        const id = generateUUID()
        const order = collections.length

        const newCollection = {
            id,
            name: name.trim(),
            icon: icon || '📚',
            color: color || '#8b5cf6',
            order
        }

        await db.collections.add(newCollection)

        addCommand({
            undo: () => db.collections.delete(id),
            redo: () => db.collections.add(newCollection),
            description: t('collections.history.created', { name })
        })

        toast.success(t('toast.collectionCreated'))
        return id
    }, [collections.length, addCommand, t])

    const updateCollection = useCallback(async (id, updates) => {
        const original = await db.collections.get(id)
        if (!original) return

        await db.collections.update(id, updates)

        addCommand({
            undo: () => db.collections.update(id, original),
            redo: () => db.collections.update(id, updates),
            description: t('collections.history.updated', { name: updates.name || original.name })
        })

        toast.success(t('toast.collectionUpdated'))
    }, [addCommand, t])

    const deleteCollection = useCallback(async (id) => {
        const collection = await db.collections.get(id)
        if (!collection) return

        // Remove collection reference from all bookmarks
        const affectedBookmarks = await db.bookmarks
            .where('collections')
            .equals(id)
            .toArray()

        const originalStates = affectedBookmarks.map(b => ({
            id: b.id,
            collections: b.collections || []
        }))

        await db.transaction('rw', db.collections, db.bookmarks, async () => {
            // Remove collection ID from all bookmarks that have it
            for (const bookmark of affectedBookmarks) {
                const updatedCollections = (bookmark.collections || []).filter(cid => cid !== id)
                await db.bookmarks.update(bookmark.id, { collections: updatedCollections })
            }
            await db.collections.delete(id)
        })

        addCommand({
            undo: async () => {
                await db.collections.add(collection)
                for (const state of originalStates) {
                    await db.bookmarks.update(state.id, { collections: state.collections })
                }
            },
            redo: async () => {
                const bookmarks = await db.bookmarks.where('collections').equals(id).toArray()
                for (const bookmark of bookmarks) {
                    const updated = (bookmark.collections || []).filter(cid => cid !== id)
                    await db.bookmarks.update(bookmark.id, { collections: updated })
                }
                await db.collections.delete(id)
            },
            description: t('collections.history.deleted', { name: collection.name })
        })

        toast.success(t('toast.collectionDeleted'))
    }, [addCommand, t])

    const addBookmarksToCollection = useCallback(async (bookmarkIds, collectionId) => {
        const idsArray = [...bookmarkIds]
        const bookmarks = await db.bookmarks.bulkGet(idsArray)
        const originalStates = bookmarks.map(b => ({
            id: b.id,
            collections: b.collections || []
        }))

        await db.transaction('rw', db.bookmarks, async () => {
            for (const bookmark of bookmarks) {
                if (!bookmark) continue
                const currentCollections = bookmark.collections || []
                if (!currentCollections.includes(collectionId)) {
                    await db.bookmarks.update(bookmark.id, {
                        collections: [...currentCollections, collectionId]
                    })
                }
            }
        })

        addCommand({
            undo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const state of originalStates) {
                    await db.bookmarks.update(state.id, { collections: state.collections })
                }
            }),
            redo: () => db.transaction('rw', db.bookmarks, async () => {
                const bms = await db.bookmarks.bulkGet(idsArray)
                for (const bm of bms) {
                    if (!bm) continue
                    const cur = bm.collections || []
                    if (!cur.includes(collectionId)) {
                        await db.bookmarks.update(bm.id, { collections: [...cur, collectionId] })
                    }
                }
            }),
            description: t('collections.history.addedBookmarks', { count: idsArray.length })
        })

        const collection = await db.collections.get(collectionId)
        toast.success(t('toast.addedToCollection', { name: collection?.name || '' }))
    }, [addCommand, t])

    const removeBookmarkFromCollection = useCallback(async (bookmarkId, collectionId) => {
        const bookmark = await db.bookmarks.get(bookmarkId)
        if (!bookmark) return

        const originalCollections = bookmark.collections || []
        const updatedCollections = originalCollections.filter(cid => cid !== collectionId)

        await db.bookmarks.update(bookmarkId, { collections: updatedCollections })

        addCommand({
            undo: () => db.bookmarks.update(bookmarkId, { collections: originalCollections }),
            redo: () => db.bookmarks.update(bookmarkId, { collections: updatedCollections }),
            description: t('collections.history.removedBookmark')
        })
    }, [addCommand, t])

    const removeBookmarksFromCollection = useCallback(async (bookmarkIds, collectionId) => {
        const idsArray = [...bookmarkIds]
        const bookmarks = await db.bookmarks.bulkGet(idsArray)
        const originalStates = bookmarks.filter(Boolean).map(b => ({
            id: b.id,
            collections: b.collections || []
        }))

        let removedCount = 0
        await db.transaction('rw', db.bookmarks, async () => {
            for (const bookmark of bookmarks) {
                if (!bookmark) continue
                const currentCollections = bookmark.collections || []
                if (currentCollections.includes(collectionId)) {
                    await db.bookmarks.update(bookmark.id, {
                        collections: currentCollections.filter(cid => cid !== collectionId)
                    })
                    removedCount++
                }
            }
        })

        if (removedCount === 0) return

        addCommand({
            undo: () => db.transaction('rw', db.bookmarks, async () => {
                for (const state of originalStates) {
                    await db.bookmarks.update(state.id, { collections: state.collections })
                }
            }),
            redo: () => db.transaction('rw', db.bookmarks, async () => {
                const bms = await db.bookmarks.bulkGet(idsArray)
                for (const bm of bms) {
                    if (!bm) continue
                    const cur = bm.collections || []
                    if (cur.includes(collectionId)) {
                        await db.bookmarks.update(bm.id, { collections: cur.filter(cid => cid !== collectionId) })
                    }
                }
            }),
            description: t('collections.history.removedBookmarks', { count: removedCount })
        })

        const collection = await db.collections.get(collectionId)
        toast.success(t('toast.removedFromCollection', { name: collection?.name || '', count: removedCount }))
    }, [addCommand, t])

    const getCollectionBookmarkCount = useCallback(async (collectionId) => {
        return await db.bookmarks.where('collections').equals(collectionId).count()
    }, [])

    const seedDefaultCollections = useCallback(async () => {
        const count = await db.collections.count()
        if (count > 0) return

        const defaults = [
            { name: t('collections.defaults.readLater'), icon: '📖', color: '#3b82f6' },
            { name: t('collections.defaults.favorites'), icon: '⭐', color: '#f59e0b' },
            { name: t('collections.defaults.work'), icon: '💼', color: '#10b981' },
        ]

        const collectionsToAdd = defaults.map((c, index) => ({
            id: generateUUID(),
            name: c.name,
            icon: c.icon,
            color: c.color,
            order: index
        }))

        await db.collections.bulkAdd(collectionsToAdd)
    }, [t])

    const shareCollection = useCallback(async (collectionId, format = 'markdown') => {
        const collection = await db.collections.get(collectionId)
        if (!collection) return

        const bookmarks = await db.bookmarks
            .where('collections')
            .equals(collectionId)
            .toArray()

        if (bookmarks.length === 0) {
            toast.info(t('collections.share.empty'))
            return
        }

        let output = ''

        if (format === 'markdown') {
            output += `# ${collection.icon} ${collection.name}\n\n`
            bookmarks.forEach(b => {
                const title = b.title || b.url
                output += `- [${title}](${b.url})`
                const allTags = [...new Set([...(b.tags || []), ...(b.ruleTags || [])])]
                if (allTags.length > 0) {
                    output += ` — ${allTags.map(t => `\`#${t}\``).join(' ')}`
                }
                output += '\n'
            })
            output += `\n---\n*${t('collections.share.footer', { count: bookmarks.length })}*\n`
        } else {
            output += `${collection.icon} ${collection.name}\n${'─'.repeat(30)}\n\n`
            bookmarks.forEach(b => {
                const title = b.title || b.url
                output += `• ${title}\n  ${b.url}\n`
                const allTags = [...new Set([...(b.tags || []), ...(b.ruleTags || [])])]
                if (allTags.length > 0) {
                    output += `  ${allTags.map(t => `#${t}`).join(' ')}\n`
                }
                output += '\n'
            })
        }

        await navigator.clipboard.writeText(output)
        toast.success(t('collections.share.copied', { count: bookmarks.length }))
    }, [t])

    return {
        collections,
        createCollection,
        updateCollection,
        deleteCollection,
        addBookmarksToCollection,
        removeBookmarkFromCollection,
        removeBookmarksFromCollection,
        getCollectionBookmarkCount,
        seedDefaultCollections,
        shareCollection,
        COLLECTION_ICONS
    }
}
