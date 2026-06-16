import { useState, useCallback, useRef } from 'react';
import { db } from '../db';
import { fixTitles, findSmartDuplicates } from '../services/ai-service';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getEffectiveApiKey, getStoredProvider, getStoredModel, isVaultUnlocked, hasVault } from '../lib/key-vault';

export function useAITools({ selectedIds, setSelectedIds, rawBookmarks, openSettings, onSortPreview }) {
    const { t } = useTranslation();
    const [isProcessingAITitles, setIsProcessingAITitles] = useState(false);
    const [isProcessingAIDupes, setIsProcessingAIDupes] = useState(false);
    const abortControllerRef = useRef(null);

    const cancelAITools = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const handleFixTitles = useCallback(async () => {
        const provider = getStoredProvider();
        const apiKey = await getEffectiveApiKey(provider);
        const model = getStoredModel();

        if ((!apiKey && provider !== 'ollama') || (hasVault() && !isVaultUnlocked() && !apiKey)) {
            openSettings('ai');
            return;
        }

        abortControllerRef.current = new AbortController();
        setIsProcessingAITitles(true);
        try {
            const selectedBookmarks = rawBookmarks.filter(b => selectedIds.has(b.id));
            if (selectedBookmarks.length === 0) return;

            const results = await fixTitles(selectedBookmarks, apiKey, model, null, { abortSignal: abortControllerRef.current.signal });

            const updates = selectedBookmarks
                .filter(b => results[b.id] && results[b.id] !== b.title)
                .map(b => ({
                    ...b,
                    title: results[b.id],
                    originalTitle: b.title
                }));

            if (updates.length > 0) {
                if (onSortPreview) {
                    onSortPreview(updates);
                } else {
                    await db.bookmarks.bulkPut(updates);
                    toast.success(t('toast.aiTitlesFixed', { count: updates.length }));
                    setSelectedIds(new Set());
                }
            } else {
                toast.info(t('modals.sortConf.noUpdates'));
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                toast.info(t('common.cancelled'));
                return;
            }
            console.error("AI Fix Titles Error:", error);
            toast.error(t('common.error') + ": " + error.message);
        } finally {
            setIsProcessingAITitles(false);
            abortControllerRef.current = null;
        }
    }, [selectedIds, setSelectedIds, rawBookmarks, openSettings]);

    const handleFindSmartDuplicates = useCallback(async () => {
        const provider = getStoredProvider();
        const apiKey = await getEffectiveApiKey(provider);
        const model = getStoredModel();

        if ((!apiKey && provider !== 'ollama') || (hasVault() && !isVaultUnlocked() && !apiKey)) {
            openSettings('ai');
            return;
        }

        abortControllerRef.current = new AbortController();
        setIsProcessingAIDupes(true);
        try {
            const selectedBookmarks = rawBookmarks.filter(b => selectedIds.has(b.id));
            if (selectedBookmarks.length < 2) {
                toast.info(t('modals.sortConf.selectMore'));
                return;
            }

            const groups = await findSmartDuplicates(selectedBookmarks, apiKey, model, null, { abortSignal: abortControllerRef.current.signal });

            if (groups && groups.length > 0) {
                let updates = [];
                for (const group of groups) {
                    const groupBookmarks = selectedBookmarks.filter(b => group.includes(b.id));
                    if (groupBookmarks.length > 1) {
                        const original = groupBookmarks[0];
                        for (let i = 1; i < groupBookmarks.length; i++) {
                            const b = groupBookmarks[i];
                            updates.push({
                                ...b,
                                tags: [...new Set([...(b.tags || []), 'ai-dupe', 'duplicate'])],
                                isDuplicate: true,
                                hasDuplicate: true,
                                otherLocations: [original.url],
                                originalTags: b.tags || []
                            });
                        }
                        updates.push({
                            ...original,
                            tags: [...new Set([...(original.tags || []), 'ai-dupe'])],
                            hasDuplicate: true,
                            originalTags: original.tags || []
                        });
                    }
                }

                if (updates.length > 0) {
                    if (onSortPreview) {
                        onSortPreview(updates);
                    } else {
                        await db.bookmarks.bulkPut(updates);
                        toast.success(t('toast.aiDupesFound', { count: groups.length }));
                        setSelectedIds(new Set());
                    }
                } else {
                    toast.info(t('modals.sortConf.noUpdates'));
                }
            } else {
                toast.info(t('modals.sortConf.noUpdates'));
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                toast.info(t('common.cancelled'));
                return;
            }
            console.error("AI Dupes Error:", error);
            toast.error(t('common.error') + ": " + error.message);
        } finally {
            setIsProcessingAIDupes(false);
            abortControllerRef.current = null;
        }
    }, [selectedIds, setSelectedIds, rawBookmarks, openSettings]);

    return { handleFixTitles, handleFindSmartDuplicates, cancelAITools, isProcessingAITitles, isProcessingAIDupes };
}
