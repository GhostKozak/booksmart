import { useState, useCallback, useMemo, useRef } from 'react';
import { db } from '../db';
import {
    analyzeEnrichmentCandidates,
    MetadataEnrichmentQueue,
    isMissingTitle,
    isMissingDescription,
    isMissingIcon
} from '../lib/metadata-enricher';

export function useMetadataEnricher(bookmarks = [], selectedIds = new Set()) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | running | paused | completed | cancelled
    const [progress, setProgress] = useState({
        processed: 0,
        total: 0,
        percentage: 0,
        successCount: 0,
        updatedCount: 0,
        errorCount: 0
    });
    const [currentBookmark, setCurrentBookmark] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);

    const [options, setOptions] = useState({
        scope: 'needingEnrichment', // 'needingEnrichment' | 'all' | 'selected'
        updateBookmarkTitle: true,
        updateBookmarkNotes: false,
        updateBookmarkIcon: true,
        forceRefresh: false,
        concurrency: 3
    });

    const queueRef = useRef(null);

    // Compute candidate statistics
    const analysis = useMemo(() => {
        return analyzeEnrichmentCandidates(bookmarks);
    }, [bookmarks]);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const updateOptions = useCallback((newOpts) => {
        setOptions(prev => ({ ...prev, ...newOpts }));
    }, []);

    const startEnrichment = useCallback(async (customOptions = {}) => {
        const mergedOpts = { ...options, ...customOptions };

        let targetBookmarks = [];
        if (mergedOpts.scope === 'selected') {
            targetBookmarks = bookmarks.filter(b => selectedIds.has(b.id));
        } else if (mergedOpts.scope === 'needingEnrichment') {
            targetBookmarks = bookmarks.filter(b => (
                (mergedOpts.updateBookmarkTitle && isMissingTitle(b.title, b.url)) ||
                (mergedOpts.updateBookmarkNotes && isMissingDescription(b.note, b.description)) ||
                (mergedOpts.updateBookmarkIcon && isMissingIcon(b.icon, b.favicon))
            ));
        } else {
            targetBookmarks = [...bookmarks];
        }

        if (targetBookmarks.length === 0) {
            setStatus('completed');
            setProgress({
                processed: 0,
                total: 0,
                percentage: 100,
                successCount: 0,
                updatedCount: 0,
                errorCount: 0
            });
            return;
        }

        setStatus('running');
        setProgress({
            processed: 0,
            total: targetBookmarks.length,
            percentage: 0,
            successCount: 0,
            updatedCount: 0,
            errorCount: 0
        });
        setRecentLogs([]);

        const queue = new MetadataEnrichmentQueue(targetBookmarks, {
            db,
            concurrency: mergedOpts.concurrency,
            updateBookmarkTitle: mergedOpts.updateBookmarkTitle,
            updateBookmarkNotes: mergedOpts.updateBookmarkNotes,
            updateBookmarkIcon: mergedOpts.updateBookmarkIcon,
            forceRefresh: mergedOpts.forceRefresh,
            onProgress: (p) => {
                setProgress({
                    processed: p.processed,
                    total: p.total,
                    percentage: p.percentage,
                    successCount: p.successCount,
                    updatedCount: p.updatedCount,
                    errorCount: p.errorCount
                });
                setCurrentBookmark(p.currentBookmark);
                if (p.currentBookmark) {
                    setRecentLogs(prev => [
                        {
                            id: p.currentBookmark.id,
                            title: p.latestResult?.metadata?.title || p.currentBookmark.title || p.currentBookmark.url,
                            url: p.currentBookmark.url,
                            success: p.latestResult?.success ?? false,
                            updatedFields: p.latestResult?.updatedFields || [],
                            timestamp: Date.now()
                        },
                        ...prev.slice(0, 24)
                    ]);
                }
            }
        });

        queueRef.current = queue;

        try {
            const summary = await queue.start();
            if (summary.isCancelled) {
                setStatus('cancelled');
            } else {
                setStatus('completed');
            }
            return summary;
        } catch {
            setStatus('completed');
        } finally {
            setCurrentBookmark(null);
        }
    }, [bookmarks, selectedIds, options]);

    const pauseEnrichment = useCallback(() => {
        if (queueRef.current && status === 'running') {
            queueRef.current.pause();
            setStatus('paused');
        }
    }, [status]);

    const resumeEnrichment = useCallback(() => {
        if (queueRef.current && status === 'paused') {
            queueRef.current.resume();
            setStatus('running');
        }
    }, [status]);

    const cancelEnrichment = useCallback(() => {
        if (queueRef.current) {
            queueRef.current.cancel();
            setStatus('cancelled');
        }
    }, []);

    const resetEnrichment = useCallback(() => {
        cancelEnrichment();
        setStatus('idle');
        setProgress({
            processed: 0,
            total: 0,
            percentage: 0,
            successCount: 0,
            updatedCount: 0,
            errorCount: 0
        });
        setCurrentBookmark(null);
        setRecentLogs([]);
    }, [cancelEnrichment]);

    return {
        isModalOpen,
        openModal,
        closeModal,
        status,
        progress,
        currentBookmark,
        recentLogs,
        options,
        updateOptions,
        analysis,
        startEnrichment,
        pauseEnrichment,
        resumeEnrichment,
        cancelEnrichment,
        resetEnrichment
    };
}
