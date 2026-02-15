import { useState } from 'react'
import { db } from '../db'
import { generateUUID } from '../lib/utils'

export function useRuleManager({ rules, addCommand, availableFolders, saveToTaxonomy }) {
    const [newRule, setNewRule] = useState({
        type: 'keyword',
        value: '',
        targetFolder: '',
        tags: ''
    })
    const [editingRuleId, setEditingRuleId] = useState(null)
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

    const addRule = async () => {
        if (newRule.value && (newRule.targetFolder || newRule.tags)) {
            const ruleToAdd = { ...newRule, id: generateUUID() }

            if (editingRuleId) {
                const originalRule = rules.find(r => r.id === editingRuleId)
                if (originalRule) {
                    await db.rules.update(editingRuleId, newRule)

                    addCommand({
                        undo: () => db.rules.update(editingRuleId, originalRule),
                        redo: () => db.rules.update(editingRuleId, newRule),
                        description: 'Update Rule'
                    })
                }
                setEditingRuleId(null)
            } else {
                await db.rules.add(ruleToAdd)

                addCommand({
                    undo: () => db.rules.delete(ruleToAdd.id),
                    redo: () => db.rules.add(ruleToAdd),
                    description: 'Add Rule'
                })
            }
            setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
            setIsRuleModalOpen(false)
        }
    }

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

        addCommand({
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
        addRule,
        startEditing,
        cancelEditing,
        deleteRule,
        openNewRuleModal
    }
}
