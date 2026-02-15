import { Plus, Save } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { SimpleCombobox } from '../ui/SimpleCombobox'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useTranslation, Trans } from 'react-i18next'

export function RuleModal({
    isOpen, onClose,
    editingRuleId,
    newRule, setNewRule,
    onSave,
    availableFolders,
    availableTags,
    discoveredFolders,
    saveToTaxonomy
}) {
    const { t } = useTranslation()

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingRuleId ? t('modals.rules.editTitle') : t('modals.rules.newTitle')}
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('modals.rules.type')}</label>
                    <select
                        className="w-full bg-background border rounded-md h-9 px-3 text-sm focus:ring-2 focus:ring-primary"
                        value={newRule.type}
                        onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                    >
                        <option value="keyword">{t('modals.rules.types.keyword')}</option>
                        <option value="domain">{t('modals.rules.types.domain')}</option>
                        <option value="exact">{t('modals.rules.types.exact')}</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('modals.rules.value')}</label>
                    <Input
                        placeholder={t('modals.rules.placeholders.value')}
                        value={newRule.value}
                        onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('modals.rules.targetFolder')}</label>
                    <SimpleCombobox
                        options={[
                            { label: t('sidebar.myFolders'), options: availableFolders.map(f => f.name) },
                            { label: t('sidebar.discovered'), options: discoveredFolders.map(f => f.name) }
                        ]}
                        value={newRule.targetFolder}
                        onChange={(val) => {
                            setNewRule({ ...newRule, targetFolder: val })
                            if (val && !availableFolders.some(f => f.name === val)) {
                                saveToTaxonomy(val, 'folder')
                            }
                        }}
                        placeholder={t('modals.rules.placeholders.folder')}
                        allowCreate={true}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        <Trans i18nKey="modals.rules.example">
                            Example: <code>Main &gt; Subfolder</code> for nested structure.
                        </Trans>
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('modals.rules.tags')}</label>
                    <Input
                        placeholder={t('modals.rules.placeholders.tags')}
                        value={newRule.tags}
                        onChange={(e) => setNewRule({ ...newRule, tags: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                        {availableTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => {
                                    const current = newRule.tags ? newRule.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                                    if (!current.includes(tag.name)) {
                                        const newValue = [...current, tag.name].join(', ')
                                        setNewRule({ ...newRule, tags: newValue })
                                    }
                                }}
                                className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full hover:bg-secondary/80 transition-colors"
                            >
                                + {tag.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button onClick={onSave} className="flex-1" size="sm">
                        {editingRuleId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        {editingRuleId ? t('modals.rules.update') : t('modals.rules.add')}
                    </Button>
                    <Button onClick={onClose} variant="outline" size="sm" className="px-4">
                        {t('common.cancel')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
