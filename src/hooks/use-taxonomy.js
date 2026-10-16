import { useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { generateUUID, pickTagColor } from '../lib/utils'

const EMPTY_ARRAY = []

export function useTaxonomy({ workerUniqueTags, workerUniqueFolders }) {
    // Data from IndexedDB
    const rawFolders = useLiveQuery(() => db.folders.orderBy('order').toArray()) || EMPTY_ARRAY
    const rawTags = useLiveQuery(() => db.tags.orderBy('order').toArray()) || EMPTY_ARRAY

    const availableFolders = useMemo(() => {
        const seen = new Set();
        return rawFolders.filter(f => {
            const key = (f.name || '').toLowerCase().trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [rawFolders]);

    const availableTags = useMemo(() => {
        const seen = new Set();
        return rawTags.filter(t => {
            const key = (t.name || '').toLowerCase().trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [rawTags]);

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

    const allFolders = useMemo(() => {
        const seen = new Set()
        const result = []
        for (const f of [...availableFolders, ...discoveredFolders]) {
            const name = typeof f === 'string' ? f : f?.name
            if (name && !seen.has(name)) {
                seen.add(name)
                result.push(f)
            }
        }
        return result
    }, [availableFolders, discoveredFolders])

    const allTags = useMemo(() => {
        const seen = new Set()
        const result = []
        for (const t of [...availableTags, ...discoveredTags]) {
            const name = typeof t === 'string' ? t : t?.name
            if (name && !seen.has(name)) {
                seen.add(name)
                result.push(t)
            }
        }
        return result
    }, [availableTags, discoveredTags])

    // CRUD
    const setAvailableFolders = async (newFolders) => {
        const resolved = typeof newFolders === 'function' ? newFolders(availableFolders) : newFolders
        if (!Array.isArray(resolved)) return
        await db.transaction('rw', db.folders, async () => {
            const existingIds = new Set((await db.folders.toArray()).map(f => f.id))
            const newIds = new Set(resolved.map(f => f.id))
            const toDelete = [...existingIds].filter(id => !newIds.has(id))
            if (toDelete.length > 0) await db.folders.bulkDelete(toDelete)
            await db.folders.bulkPut(resolved)
        })
    }

    const setAvailableTags = async (newTags) => {
        const resolved = typeof newTags === 'function' ? newTags(availableTags) : newTags
        if (!Array.isArray(resolved)) return
        await db.transaction('rw', db.tags, async () => {
            const existingIds = new Set((await db.tags.toArray()).map(t => t.id))
            const newIds = new Set(resolved.map(t => t.id))
            const toDelete = [...existingIds].filter(id => !newIds.has(id))
            if (toDelete.length > 0) await db.tags.bulkDelete(toDelete)
            await db.tags.bulkPut(resolved)
        })
    }

    const saveToTaxonomy = async (name, type) => {
        if (type === 'tag') {
            await db.tags.add({ id: generateUUID(), name, color: pickTagColor(name), order: availableTags.length })
        } else {
            await db.folders.add({ id: generateUUID(), name, color: '#3b82f6', order: availableFolders.length })
        }
    }

    return {
        availableFolders, setAvailableFolders,
        availableTags, setAvailableTags,
        allFolders, allTags,
        ignoredUrlsList, ignoredUrls, toggleIgnoreUrl,
        discoveredTags, discoveredFolders,
        saveToTaxonomy,
    }
}
