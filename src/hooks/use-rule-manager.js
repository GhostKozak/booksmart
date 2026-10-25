import { useState, useMemo, useCallback } from 'react'
import { db } from '../db'
import { generateUUID } from '../lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { analyzeRulePatterns, suggestRulesWithAI } from '../lib/rule-suggester'
import { getEffectiveApiKey, getStoredProvider, getStoredModel, isLocalAIProvider } from '../lib/key-vault'

export function useRuleManager({ rules = [], rawBookmarks = [], addCommand }) {
    const [newRule, setNewRule] = useState({
        type: 'keyword',
        value: '',
        targetFolder: '',
        tags: ''
    })
    const [editingRuleId, setEditingRuleId] = useState(null)
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false)
    const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(new Set())
    const [aiSuggestions, setAiSuggestions] = useState([])
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false)
    const { t } = useTranslation()

    // ── Statistical Pattern Suggestions ──
    const patternSuggestions = useMemo(() => {
        return analyzeRulePatterns(rawBookmarks, rules)
    }, [rawBookmarks, rules])

    // Combined active suggestions
    const suggestedRules = useMemo(() => {
        const combined = [...patternSuggestions, ...aiSuggestions]
        return combined.filter(s => !dismissedSuggestionIds.has(s.id))
    }, [patternSuggestions, aiSuggestions, dismissedSuggestionIds])

    const addRule = async () => {
        if (newRule.value && (newRule.targetFolder || newRule.tags)) {
            const ruleToAdd = { ...newRule, id: generateUUID() }

            if (editingRuleId) {
                const originalRule = rules.find(r => r.id === editingRuleId)
                if (originalRule) {
                    await db.rules.update(editingRuleId, newRule)

                    addCommand?.({
                        undo: () => db.rules.update(editingRuleId, originalRule),
                        redo: () => db.rules.update(editingRuleId, newRule),
                        description: 'Update Rule'
                    })
                }
                setEditingRuleId(null)
            } else {
                await db.rules.add(ruleToAdd)

                addCommand?.({
                    undo: () => db.rules.delete(ruleToAdd.id),
                    redo: () => db.rules.add(ruleToAdd),
                    description: 'Add Rule'
                })
            }
            setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
            setIsRuleModalOpen(false)
            toast.success(t('toast.ruleSaved', 'Kural kaydedildi!'))
        }
    }

    const applySuggestion = useCallback(async (suggestion) => {
        if (!suggestion || !suggestion.value) return
        const ruleToAdd = {
            id: generateUUID(),
            type: suggestion.type,
            value: suggestion.value,
            targetFolder: suggestion.targetFolder || '',
            tags: suggestion.tags || ''
        }

        await db.rules.add(ruleToAdd)
        setDismissedSuggestionIds(prev => new Set([...prev, suggestion.id]))

        addCommand?.({
            undo: () => db.rules.delete(ruleToAdd.id),
            redo: () => db.rules.add(ruleToAdd),
            description: `Add Rule for ${suggestion.value}`
        })

        toast.success(t('toast.ruleCreatedFromSuggestion', {
            value: suggestion.value,
            defaultValue: `"${suggestion.value}" için kural oluşturuldu`
        }))
    }, [addCommand, t])

    const applyAllSuggestions = useCallback(async (suggestionsToApply) => {
        if (!Array.isArray(suggestionsToApply) || suggestionsToApply.length === 0) return

        const rulesToAdd = suggestionsToApply.map(s => ({
            id: generateUUID(),
            type: s.type,
            value: s.value,
            targetFolder: s.targetFolder || '',
            tags: s.tags || ''
        }))

        await db.transaction('rw', db.rules, async () => {
            await db.rules.bulkAdd(rulesToAdd)
        })

        const idsToDelete = rulesToAdd.map(r => r.id)
        addCommand?.({
            undo: () => db.rules.bulkDelete(idsToDelete),
            redo: () => db.rules.bulkAdd(rulesToAdd),
            description: `Add ${rulesToAdd.length} Suggested Rules`
        })

        toast.success(t('toast.rulesCreatedBatch', {
            count: rulesToAdd.length,
            defaultValue: `${rulesToAdd.length} kural otomatik oluşturuldu`
        }))
    }, [addCommand, t])

    const dismissSuggestion = useCallback((id) => {
        setDismissedSuggestionIds(prev => new Set([...prev, id]))
    }, [])

    const analyzeWithAI = useCallback(async () => {
        const provider = getStoredProvider()
        const model = getStoredModel()
        const apiKey = await getEffectiveApiKey(provider)

        if (!apiKey && !isLocalAIProvider(provider)) {
            toast.error(t('settings.ai.reqApiKey', 'Lütfen Ayarlar > Yapay Zeka sekmesinden API anahtarınızı girin.'))
            return
        }

        setIsAnalyzingAI(true)
        try {
            const aiRules = await suggestRulesWithAI({
                bookmarks: rawBookmarks,
                existingRules: rules,
                apiKey,
                model,
                provider
            })

            if (aiRules && aiRules.length > 0) {
                setAiSuggestions(aiRules)
                toast.success(t('toast.aiRulesFound', {
                    count: aiRules.length,
                    defaultValue: `AI ${aiRules.length} yeni kural önerisi buldu!`
                }))
            } else {
                toast.info(t('modals.ruleSuggestions.noAiRules', 'AI tarafından yeni bir kural kalıbı bulunamadı.'))
            }
        } catch (err) {
            console.error('AI Rule Analysis error:', err)
            toast.error(t('common.error') + ': ' + err.message)
        } finally {
            setIsAnalyzingAI(false)
        }
    }, [rawBookmarks, rules, t])

    const startEditing = (rule) => {
        setEditingRuleId(rule.id)
        setNewRule({
            type: rule.type,
            value: rule.value,
            targetFolder: rule.targetFolder || '',
            tags: rule.tags || ''
        })
        setIsRuleModalOpen(true)
    }

    const cancelEditing = () => {
        setEditingRuleId(null)
        setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
        setIsRuleModalOpen(false)
    }

    const deleteRule = async (id) => {
        const ruleToDelete = rules.find(r => r.id === id)
        if (!ruleToDelete) return

        await db.rules.delete(id)

        addCommand?.({
            undo: () => db.rules.add(ruleToDelete),
            redo: () => db.rules.delete(id),
            description: 'Delete Rule'
        })

        if (editingRuleId === id) {
            cancelEditing()
        }
    }

    const openNewRuleModal = () => {
        setEditingRuleId(null)
        setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
        setIsRuleModalOpen(true)
    }

    return {
        newRule,
        setNewRule,
        editingRuleId,
        isRuleModalOpen,
        suggestedRules,
        isSuggestionsModalOpen,
        setIsSuggestionsModalOpen,
        openSuggestionsModal: () => setIsSuggestionsModalOpen(true),
        applySuggestion,
        applyAllSuggestions,
        dismissSuggestion,
        analyzeWithAI,
        isAnalyzingAI,
        addRule,
        startEditing,
        cancelEditing,
        deleteRule,
        openNewRuleModal
    }
}
