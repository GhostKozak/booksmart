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
    fuseOptions
}) {
    const [bookmarks, setBookmarks] = useState([])
    const [uniqueTags, setUniqueTags] = useState([])
    const [uniqueFolders, setUniqueFolders] = useState([])
    const [smartCounts, setSmartCounts] = useState({ old: 0, http: 0, untitled: 0, docs: 0, longurl: 0, media: 0, social: 0, shopping: 0, news: 0 })
    const [duplicateCount, setDuplicateCount] = useState(0)
    const [linkHealth, setLinkHealth] = useState({})
    const [isCheckingLinks, setIsCheckingLinks] = useState(false)
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

    // Send Data to Worker
    useEffect(() => {
        if (!workerRef.current) return
        workerRef.current.postMessage({
            type: 'PROCESS_DATA',
            payload: {
                bookmarks: rawBookmarks,
                rules,
                searchQuery,
                searchMode,
                activeTag,
                activeFolder,
                smartFilter,
                dateFilter,
                fuseOptions
            }
        })
    }, [rawBookmarks, rules, searchQuery, searchMode, activeTag, activeFolder, smartFilter, dateFilter, fuseOptions])

    const checkAllLinks = useCallback(async () => {
        if (!workerRef.current) {
            console.warn("Worker not initialized")
            return
        }
        setIsCheckingLinks(true)
        const urls = [...new Set(bookmarks.map(b => b.url))]
        workerRef.current.postMessage({ type: 'CHECK_LINKS', payload: { urls } })
    }, [bookmarks])

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
        checkAllLinks
    }
}
