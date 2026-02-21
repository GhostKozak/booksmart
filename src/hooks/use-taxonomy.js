import { useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { generateUUID } from '../lib/utils'

const EMPTY_ARRAY = []

export function useTaxonomy({ workerUniqueTags, workerUniqueFolders }) {
    // Data from IndexedDB
    const availableFolders = useLiveQuery(() => db.folders.orderBy('order').toArray()) || EMPTY_ARRAY
    const availableTags = useLiveQuery(() => db.tags.orderBy('order').toArray()) || EMPTY_ARRAY

    // Ignored URLs
    const ignoredUrlsList = useLiveQuery(() => db.ignoredUrls.toArray()) || EMPTY_ARRAY
    const ignoredUrls = useMemo(() => new Set(ignoredUrlsList.map(i => i.url)), [ignoredUrlsList])

    const toggleIgnoreUrl = useCallback((url) => {
        if (ignoredUrls.has(url)) {
            db.ignoredUrls.where('url').equals(url).delete()
        } else {
            db.ignoredUrls.add({ url })
        }
    }, [ignoredUrls])

    // Discovered (not yet in user's library)
    const discoveredTags = useMemo(() => {
        const existingNames = new Set(availableTags.map(t => t.name))
        return workerUniqueTags.filter(t => !existingNames.has(t.name))
    }, [workerUniqueTags, availableTags])

    const discoveredFolders = useMemo(() => {
        const existingNames = new Set(availableFolders.map(f => f.name))
        return workerUniqueFolders.filter(f => !existingNames.has(f.name))
    }, [workerUniqueFolders, availableFolders])

    // CRUD
    const setAvailableFolders = async (newFolders) => {
        await db.transaction('rw', db.folders, async () => {
            const existingIds = new Set((await db.folders.toArray()).map(f => f.id))
            const newIds = new Set(newFolders.map(f => f.id))
            const toDelete = [...existingIds].filter(id => !newIds.has(id))
            if (toDelete.length > 0) await db.folders.bulkDelete(toDelete)
            await db.folders.bulkPut(newFolders)
        })
    }

    const setAvailableTags = async (newTags) => {
        await db.transaction('rw', db.tags, async () => {
            const existingIds = new Set((await db.tags.toArray()).map(f => f.id))
            const newIds = new Set(newTags.map(f => f.id))
            const toDelete = [...existingIds].filter(id => !newIds.has(id))
            if (toDelete.length > 0) await db.tags.bulkDelete(toDelete)
            await db.tags.bulkPut(newTags)
        })
    }

    const saveToTaxonomy = async (name, type) => {
        if (type === 'tag') {
            await db.tags.add({ id: generateUUID(), name, color: '#10b981', order: availableTags.length })
        } else {
            await db.folders.add({ id: generateUUID(), name, color: '#3b82f6', order: availableFolders.length })
        }
    }

    return {
        availableFolders, setAvailableFolders,
        availableTags, setAvailableTags,
        ignoredUrlsList, ignoredUrls, toggleIgnoreUrl,
        discoveredTags, discoveredFolders,
        saveToTaxonomy,
    }
}
