import { useState, useCallback } from 'react'
import { db } from '../db'
import { categorizeBookmarks } from '../services/ai-service'

export function useMagicSort({ selectedIds, setSelectedIds, rawBookmarks, openSettings, onSortPreview }) {
    const [isProcessingAI, setIsProcessingAI] = useState(false)

    const handleMagicSort = useCallback(async () => {
        const apiKey = localStorage.getItem("bs_api_key")
        const model = localStorage.getItem("bs_model") || 'gpt-4o-mini'

        if (!apiKey) {
            openSettings('ai')
            return
        }

        setIsProcessingAI(true)
        try {
            const selectedBookmarks = rawBookmarks.filter(b => selectedIds.has(b.id))
            if (selectedBookmarks.length === 0) return

            const results = await categorizeBookmarks(selectedBookmarks, apiKey, model)

            // Prepare updates
            const updates = rawBookmarks
                .filter(b => results[b.id])
                .map(b => {
                    const prediction = results[b.id];
                    // Handle both old (string) and new (object) response formats for backward compatibility
                    let folder = typeof prediction === 'string' ? prediction : prediction.folder;
                    folder = (folder || '').normalize("NFC").trim();
                    if (!folder || folder.toLowerCase() === 'uncategorized') folder = 'Uncategorized';

                    const original = (b.originalFolder || 'Uncategorized').normalize("NFC").trim();
                    const currentEffective = (b.newFolder || b.originalFolder || 'Uncategorized').normalize("NFC").trim();

                    console.log(`Debug Magic Sort: ${b.title} | Original: '${original}' | Current: '${currentEffective}' | New: '${folder}'`);

                    // Strict comparison against CURRENT state (so we don't re-suggest if already sorted)
                    const isSameFolder = folder === currentEffective ||
                        folder.toLocaleLowerCase() === currentEffective.toLocaleLowerCase() ||
                        folder.toLocaleLowerCase('tr') === currentEffective.toLocaleLowerCase('tr');

                    const tags = typeof prediction === 'string' ? [] : (prediction.tags || []);
                    // Check if ruleTags changed (we invoke magic sort to get new tags too)
                    // Note: Magic Sort usually returns a list of tags. We append them to ruleTags.
                    // If the suggested tags are ALREADY in ruleTags, then it's no change.

                    const existingRuleTags = b.ruleTags || [];
                    const suggestedTags = Array.from(new Set([...tags])); // these are just the new ones
                    // logic: if all suggestedTags are already in existingRuleTags, then no change?
                    // Actually, we usually merge them.

                    const mergedTags = Array.from(new Set([...existingRuleTags, ...suggestedTags]));
                    const areTagsSame = existingRuleTags.length === mergedTags.length;
                    // (since we only add, if length is same, then all new tags were already present)

                    if (isSameFolder && areTagsSame) {
                        console.log(`Skipping update for ${b.title} because folder is same and no new tags.`);
                        return null; // Don't include in updates
                    }

                    return {
                        ...b,
                        suggestedFolder: folder,
                        newFolder: folder,
                        // tags: [...new Set([...(b.tags || []), ...tags])], // Don't merge into main tags
                        ruleTags: mergedTags, // Add to ruleTags for distinction
                        status: 'matched',
                        // Store original values for diffing in modal
                        originalFolder: original,
                        originalTags: b.tags
                    };
                })
                .filter(Boolean) // Filter out nulls from above map


            if (updates.length > 0) {
                if (onSortPreview) {
                    onSortPreview(updates);
                } else {
                    // Fallback if no preview handler provided (shouldn't happen in new flow)
                    await db.bookmarks.bulkPut(updates)
                    console.log(`Updated ${updates.length} bookmarks with AI suggestions.`)
                    setSelectedIds(new Set())
                }
            } else {
                console.warn("AI returned results but no matching bookmarks were found in rawBookmarks or results were empty.", results)
            }

        } catch (error) {
            console.error("AI Magic Sort Error:", error)
            alert("AI Classification Failed: " + error.message)
            if (error.message.includes("API Key") || error.message.includes("401")) {
                openSettings('ai')
            }
        } finally {
            setIsProcessingAI(false)
        }
    }, [selectedIds, setSelectedIds, rawBookmarks, openSettings, onSortPreview])

    return { handleMagicSort, isProcessingAI }
}
