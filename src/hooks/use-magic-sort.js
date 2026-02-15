import { useState, useCallback } from 'react'
import { db } from '../db'
import { categorizeBookmarks } from '../services/ai-service'

export function useMagicSort({ selectedIds, setSelectedIds, rawBookmarks, openSettings }) {
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

            // Update bookmarks in DB
            const updates = rawBookmarks
                .filter(b => results[b.id])
                .map(b => ({
                    ...b,
                    suggestedFolder: results[b.id],
                    newFolder: results[b.id],
                    status: 'matched'
                }))

            if (updates.length > 0) {
                await db.bookmarks.bulkPut(updates)
            }

            setSelectedIds(new Set())
        } catch (error) {
            alert("AI Classification Failed: " + error.message)
            if (error.message.includes("API Key") || error.message.includes("401")) {
                openSettings('ai')
            }
        } finally {
            setIsProcessingAI(false)
        }
    }, [selectedIds, setSelectedIds, rawBookmarks, openSettings])

    return { handleMagicSort, isProcessingAI }
}
