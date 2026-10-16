import React from 'react'
import { Settings, Plus, Pencil, Trash2, ArrowRight, ChevronRight, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function RulesPanel({
    rules = [],
    suggestedRules = [],
    onOpenSuggestions,
    startEditing,
    deleteRule,
    openNewRuleModal,
    filterSearch = ''
}) {
    const { t } = useTranslation()
    const { collapsedSections, toggleSection } = useAppStore()
    const collapsed = collapsedSections.rules
    const onToggle = () => toggleSection('rules')

    const searchTerm = (filterSearch || '').trim().toLowerCase()
    const filteredRules = searchTerm
        ? rules.filter(r => (r.value && r.value.toLowerCase().includes(searchTerm)) || (r.targetFolder && r.targetFolder.toLowerCase().includes(searchTerm)) || (r.tags && r.tags.toLowerCase().includes(searchTerm)))
        : rules

    if (searchTerm && filteredRules.length === 0) {
        return null
    }

    return (
        <div className="space-y-1">
            <div
                className="flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group select-none"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 font-medium text-sm text-foreground/80 group-hover:text-foreground">
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" />
                    )}
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>{t('sidebar.rules.title')}</span>
                    <span className="text-xs text-muted-foreground font-normal">({rules.length})</span>
                    {suggestedRules.length > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.2 rounded-full" title={t('sidebar.rules.suggestionsAvailable', 'Önerilen kurallar var')}>
                            {suggestedRules.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-0.5">
                    {onOpenSuggestions && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation()
                                onOpenSuggestions?.()
                            }}
                            className={`h-6 w-6 transition-all ${
                                suggestedRules.length > 0
                                    ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 opacity-100'
                                    : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'
                            }`}
                            title={t('sidebar.rules.suggestRules', 'Kural Önerileri')}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation()
                            openNewRuleModal?.()
                        }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                        title={t('sidebar.rules.addRule')}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-1 pl-2 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {rules.length === 0 ? (
                        <div className="text-center py-4 px-2 border border-dashed rounded-lg bg-muted/20 my-1 space-y-1.5">
                            <Settings className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
                            <p className="text-xs text-muted-foreground">{t('sidebar.rules.noRules')}</p>
                            <div className="flex items-center justify-center gap-2 flex-wrap pt-0.5">
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-xs h-6 p-0 font-medium"
                                    onClick={openNewRuleModal}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> {t('sidebar.rules.createFirst')}
                                </Button>
                                {suggestedRules.length > 0 && onOpenSuggestions && (
                                    <>
                                        <span className="text-muted-foreground/40 text-xs">•</span>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-xs h-6 p-0 font-medium text-amber-500 hover:text-amber-600"
                                            onClick={onOpenSuggestions}
                                        >
                                            <Sparkles className="h-3 w-3 mr-1" /> {t('sidebar.rules.viewSuggestions', 'Önerileri Gör ({{count}})', { count: suggestedRules.length })}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        filteredRules.map(rule => (
                            <div
                                key={rule.id}
                                className="flex items-start justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/50 transition-colors group gap-2 text-xs min-w-0 w-full overflow-hidden"
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-muted text-muted-foreground rounded uppercase tracking-wider">
                                            {rule.type}
                                        </span>
                                        <span className="font-semibold text-foreground truncate">
                                            "{rule.value}"
                                        </span>
                                    </div>

                                    {(rule.targetFolder || rule.tags) && (
                                        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground mt-0.5">
                                            {rule.targetFolder && (
                                                <div className="flex items-center gap-1">
                                                    <ArrowRight className="h-2.5 w-2.5 shrink-0 text-primary" />
                                                    <span className="font-medium text-foreground truncate">{rule.targetFolder}</span>
                                                </div>
                                            )}

                                            {rule.tags && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {rule.tags.split(',').map(tag => (
                                                        <span key={tag} className="bg-background/80 border px-1 py-0.2 rounded text-[9px] text-muted-foreground">
                                                            #{tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={() => startEditing?.(rule)}
                                        title={t('sidebar.rules.edit')}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteRule?.(rule.id)}
                                        title={t('sidebar.rules.delete')}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
