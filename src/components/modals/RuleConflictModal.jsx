import { useState } from 'react'
import { SimpleModal } from '../ui/SimpleModal'
import { SimpleCombobox } from '../ui/SimpleCombobox'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, FolderOpen, Tag, ArrowRight } from 'lucide-react'

export function RuleConflictModal({
    isOpen, onClose,
    conflict,
    availableFolders,
    discoveredFolders,
    onResolve,
    onSkip
}) {
    const { t } = useTranslation()
    const [selectedFolder, setSelectedFolder] = useState('')
    const [useCustomFolder, setUseCustomFolder] = useState(false)
    const [customFolder, setCustomFolder] = useState('')

    if (!conflict) return null

    const handleApply = () => {
        const folder = useCustomFolder ? customFolder : selectedFolder
        if (folder) {
            onResolve(conflict.id, folder)
            resetState()
        }
    }

    const handleSkip = () => {
        onSkip(conflict.id)
        resetState()
    }

    const resetState = () => {
        setSelectedFolder('')
        setUseCustomFolder(false)
        setCustomFolder('')
    }

    // Get unique folder options from conflicting rules
    const folderOptions = [...new Set(conflict.conflictingFolders.map(cf => cf.folder))]

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={handleSkip}
            title={t('modals.ruleConflict.title')}
        >
            <div className="space-y-4">
                {/* Warning Banner */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium">{t('modals.ruleConflict.description')}</p>
                    </div>
                </div>

                {/* Bookmark Info */}
                <div className="p-3 rounded-md bg-accent/50 border">
                    <p className="text-sm font-medium truncate" title={conflict.title}>
                        {conflict.title || t('bookmarks.status.unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={conflict.url}>
                        {conflict.url}
                    </p>
                </div>

                {/* Conflicting Rules */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('modals.ruleConflict.chooseFolder')}
                    </label>

                    <div className="space-y-2">
                        {folderOptions.map((folder, idx) => {
                            const matchingRules = conflict.conflictingFolders.filter(cf => cf.folder === folder)
                            return (
                                <label
                                    key={idx}
                                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${!useCustomFolder && selectedFolder === folder
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-accent/50'
                                        }`}
                                    onClick={() => {
                                        setSelectedFolder(folder)
                                        setUseCustomFolder(false)
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="conflictFolder"
                                        checked={!useCustomFolder && selectedFolder === folder}
                                        onChange={() => {
                                            setSelectedFolder(folder)
                                            setUseCustomFolder(false)
                                        }}
                                        className="mt-1 accent-primary"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                                            <span className="text-sm font-medium">{folder}</span>
                                        </div>
                                        <div className="mt-1 space-y-0.5">
                                            {matchingRules.map((r, rIdx) => (
                                                <p key={rIdx} className="text-[10px] text-muted-foreground">
                                                    {t('modals.ruleConflict.fromRule', {
                                                        rule: `${r.ruleType}: "${r.ruleValue}"`
                                                    })}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </label>
                            )
                        })}

                        {/* Custom folder option */}
                        <label
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all ${useCustomFolder
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'hover:bg-accent/50'
                                }`}
                            onClick={() => setUseCustomFolder(true)}
                        >
                            <input
                                type="radio"
                                name="conflictFolder"
                                checked={useCustomFolder}
                                onChange={() => setUseCustomFolder(true)}
                                className="mt-1 accent-primary"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium mb-2">{t('modals.ruleConflict.otherFolder')}</p>
                                {useCustomFolder && (
                                    <SimpleCombobox
                                        options={[
                                            { label: t('sidebar.myFolders'), options: availableFolders.map(f => f.name) },
                                            { label: t('sidebar.discovered'), options: discoveredFolders.map(f => f.name) }
                                        ]}
                                        value={customFolder}
                                        onChange={setCustomFolder}
                                        placeholder={t('modals.rules.placeholders.folder')}
                                        allowCreate={true}
                                    />
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Merged Tags Info */}
                {conflict.ruleTags && conflict.ruleTags.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Tag className="h-3 w-3" />
                            {t('modals.ruleConflict.mergedTags')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {conflict.ruleTags.map(tag => (
                                <span
                                    key={tag}
                                    className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-[10px] font-medium"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {t('modals.ruleConflict.tagsAutoMerged')}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={handleApply}
                        className="flex-1"
                        size="sm"
                        disabled={!useCustomFolder ? !selectedFolder : !customFolder}
                    >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        {t('modals.ruleConflict.apply')}
                    </Button>
                    <Button onClick={handleSkip} variant="outline" size="sm" className="px-4">
                        {t('modals.ruleConflict.skip')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
