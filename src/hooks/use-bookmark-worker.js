import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import ProcessingWorker from '../workers/processing.worker.js?worker'

export function useBookmarkWorker({
    rawBookmarks,
    rules,
    searchQuery,
    searchMode,
    activeTag,
    activeFolder,
    smartFilter,
    dateFilter,
    sortBy,
    fuseOptions
}) {
    const [bookmarks, setBookmarks] = useState([])
    const [uniqueTags, setUniqueTags] = useState([])
    const [uniqueFolders, setUniqueFolders] = useState([])
    const [smartCounts, setSmartCounts] = useState({ old: 0, http: 0, untitled: 0, docs: 0, longurl: 0, media: 0, social: 0, shopping: 0, news: 0 })
    const [duplicateCount, setDuplicateCount] = useState(0)
    const [linkHealth, setLinkHealth] = useState({})
    const [isCheckingLinks, setIsCheckingLinks] = useState(false)
    const [ruleConflicts, setRuleConflicts] = useState([])
    // In-memory map: { bookmarkId: chosenFolder } — NOT persisted to DB
    const [resolvedConflicts, setResolvedConflicts] = useState({})
    const workerRef = useRef(null)

    // Dead link count
    const deadLinkCount = useMemo(() => {
        return Object.values(linkHealth).filter(s => s === 'dead').length
    }, [linkHealth])

    // Display bookmarks (apply dead link filter on top of worker-processed bookmarks)
    const displayBookmarks = useMemo(() => {
        if (smartFilter === 'dead') {
            return bookmarks.filter(b => linkHealth[b.url] === 'dead')
        }
        return bookmarks
    }, [bookmarks, smartFilter, linkHealth])

    // Initialize Worker
    useEffect(() => {
        try {
            workerRef.current = new ProcessingWorker()
        } catch (e) {
            console.error("Failed to initialize worker:", e)
        }

        if (workerRef.current) {
            workerRef.current.onmessage = (e) => {
                const { type, payload } = e.data
                if (type === 'DATA_PROCESSED') {
                    setBookmarks(payload.processedBookmarks)
                    setUniqueTags(payload.uniqueTags)
                    setUniqueFolders(payload.uniqueFolders)
                    setSmartCounts(payload.smartCounts)
                    setDuplicateCount(payload.duplicateCount)

                    // Extract unresolved rule conflicts
                    const conflicts = payload.processedBookmarks
                        .filter(b => b.conflictingFolders && b.conflictingFolders.length > 0)
                    setRuleConflicts(conflicts)
                } else if (type === 'LINK_STATUS_UPDATE') {
                    setLinkHealth(prev => {
                        const next = { ...prev }
                        payload.forEach(item => {
                            next[item.url] = item.status
                        })
                        return next
                    })
                } else if (type === 'LINKS_CHECKED_COMPLETE') {
                    setIsCheckingLinks(false)
                }
            }
            return () => workerRef.current.terminate()
        }
    }, [])

    // Send Data to Worker — includes resolvedConflicts so worker applies them
    useEffect(() => {
        if (!workerRef.current) return
        workerRef.current.postMessage({
            type: 'PROCESS_DATA',
            payload: {
                bookmarks: rawBookmarks,
                rules,
                resolvedConflicts,
                searchQuery,
                searchMode,
                activeTag,
                activeFolder,
                smartFilter,
                dateFilter,
                sortBy,
                fuseOptions
            }
        })
    }, [rawBookmarks, rules, resolvedConflicts, searchQuery, searchMode, activeTag, activeFolder, smartFilter, dateFilter, sortBy, fuseOptions])

    const checkAllLinks = useCallback(async () => {
        if (!workerRef.current) {
            console.warn("Worker not initialized")
            return
        }
        setIsCheckingLinks(true)
        const urls = [...new Set(bookmarks.map(b => b.url))]
        workerRef.current.postMessage({ type: 'CHECK_LINKS', payload: { urls } })
    }, [bookmarks])

    const resolveConflict = useCallback((bookmarkId, chosenFolder) => {
        // Store in memory only — NOT in DB
        // This way, when rules are deleted, the worker won't find a match
        // and the bookmark will revert to originalFolder automatically
        setResolvedConflicts(prev => ({ ...prev, [bookmarkId]: chosenFolder }))
    }, [])

    const skipConflict = useCallback(() => {
        // No-op: conflict stays in the list so the notification bar keeps showing.
        // The modal close is handled by isConflictModalOpen state in App.jsx.
    }, [])

    return {
        bookmarks,
        displayBookmarks,
        uniqueTags,
        uniqueFolders,
        smartCounts,
        duplicateCount,
        linkHealth,
        setLinkHealth,
        isCheckingLinks,
        deadLinkCount,
        checkAllLinks,
        ruleConflicts,
        resolveConflict,
        skipConflict
    }
}
