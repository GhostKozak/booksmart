import { Settings, Plus, Pencil, Trash2, ArrowRight, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

export function RulesPanel({
    rules,
    startEditing,
    deleteRule,
    openNewRuleModal,
    collapsed,
    onToggle
}) {
    const { t } = useTranslation()

    return (
        <>
            <div
                className="flex items-center justify-between mb-1 border-t pt-2 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
                onClick={onToggle}
            >
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    {collapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
                    <Settings className="h-5 w-5" />
                    {t('sidebar.rules.title')}
                    <span className="text-xs font-normal text-muted-foreground">({rules.length})</span>
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        openNewRuleModal()
                    }}
                    className="h-7 text-xs gap-1"
                >
                    <Plus className="h-3 w-3" /> {t('sidebar.rules.addRule')}
                </Button>
            </div>

            {!collapsed && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200 pb-2 max-h-[35vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40">
                    <div className="space-y-2">
                        {rules.length === 0 && (
                            <div className="text-center py-6">
                                <Settings className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                <p className="text-sm text-muted-foreground">{t('sidebar.rules.noRules')}</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-1 text-xs"
                                    onClick={openNewRuleModal}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> {t('sidebar.rules.createFirst')}
                                </Button>
                            </div>
                        )}
                        {rules.map(rule => (
                            <div key={rule.id} className="flex items-start justify-between p-3 rounded-md bg-accent/50 hover:bg-accent border group gap-2">
                                <div className="flex flex-col w-full min-w-0">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{rule.type}</span>

                                    <div className="text-sm font-medium break-words leading-tight mb-1.5">
                                        "{rule.value}"
                                    </div>

                                    {(rule.targetFolder || rule.tags) && (
                                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                            {rule.targetFolder && (
                                                <div className="flex items-start gap-1">
                                                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                    <span className="font-medium text-primary break-words">{rule.targetFolder}</span>
                                                </div>
                                            )}

                                            {rule.tags && (
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    {rule.tags.split(',').map(tag => (
                                                        <span key={tag} className="bg-background border px-1.5 py-0.5 rounded text-[10px]">
                                                            #{tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 shrink-0 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        onClick={() => startEditing(rule)}
                                        title={t('sidebar.rules.edit')}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteRule(rule.id)}
                                        title={t('sidebar.rules.delete')}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
