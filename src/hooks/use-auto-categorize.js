import { useState, useCallback } from 'react'
import { db } from '../db'
import { autoCategorizeLocal } from '../services/auto-categorizer'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function useAutoCategorize({ selectedIds, setSelectedIds, rawBookmarks, onSortPreview }) {
    const { t } = useTranslation()
    const [isProcessingLocal, setIsProcessingLocal] = useState(false)

    const handleAutoCategorize = useCallback(async () => {
        setIsProcessingLocal(true)
        try {
            const selectedBookmarks = rawBookmarks.filter(b => selectedIds.has(b.id))
            if (selectedBookmarks.length === 0) return

            const results = autoCategorizeLocal(selectedBookmarks)

            // Update bookmarks in DB
            const updates = selectedBookmarks
                .filter(b => results[b.id])
                .map(b => {
                    const prediction = results[b.id]

                    const original = (b.originalFolder || 'Uncategorized').normalize("NFC").trim();
                    const currentEffective = (b.newFolder || b.originalFolder || 'Uncategorized').normalize("NFC").trim();

                    // Normalize folders
                    // If prediction is empty, default to currentEffective (don't overwrite with Uncategorized)
                    let folder = prediction.folder ? prediction.folder.normalize("NFC").trim() : currentEffective;
                    if (!folder || folder.toLowerCase() === 'uncategorized') folder = currentEffective;

                    // Strict comparison against CURRENT state
                    const isSameFolder = folder === currentEffective ||
                        folder.toLocaleLowerCase() === currentEffective.toLocaleLowerCase() ||
                        folder.toLocaleLowerCase('tr') === currentEffective.toLocaleLowerCase('tr');

                    // Merge existing ruleTags with new predictions
                    const existingRuleTags = b.ruleTags || []
                    const newRuleTags = Array.from(new Set([...existingRuleTags, ...prediction.tags]))

                    // Check if tags changed (compare length or content)
                    const areTagsSame = existingRuleTags.length === newRuleTags.length &&
                        existingRuleTags.every(t => newRuleTags.includes(t));

                    if (isSameFolder && areTagsSame) {
                        return null;
                    }

                    return {
                        ...b,
                        suggestedFolder: folder,
                        newFolder: folder,
                        // tags: b.tags, // Keep original manual tags as is
                        ruleTags: newRuleTags, // Use ruleTags for auto-generated ones
                        status: 'suggested',
                        // Store original values for diffing in modal
                        originalFolder: original,
                        originalTags: b.tags
                    }
                })
                .filter(Boolean) // Filter out nulls

            if (updates.length > 0) {
                if (onSortPreview) {
                    onSortPreview(updates);
                } else {
                    // Fallback
                    await db.bookmarks.bulkPut(updates)
                    setSelectedIds(new Set())
                }
            } else {
                toast.info(t('modals.sortConf.noUpdates', 'Güncellenecek yeni bir kategori veya etiket bulunamadı.'))
            }

        } catch (error) {
            console.error("Auto Categorization Failed:", error)
            toast.error(t('common.error', 'Bir hata oluştu') + ': ' + (error?.message || error))
        } finally {
            setIsProcessingLocal(false)
        }
    }, [selectedIds, setSelectedIds, rawBookmarks, onSortPreview, t])

    return { handleAutoCategorize, isProcessingLocal }
}
