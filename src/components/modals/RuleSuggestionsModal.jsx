import React, { useState } from 'react'
import { Sparkles, ArrowRight, Check, X, Folder, Tag, Bot, RefreshCw, ExternalLink } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

export function RuleSuggestionsModal({
    isOpen,
    onClose,
    suggestions = [],
    onApplyRule,
    onApplyAll,
    onDismiss,
    onAnalyzeWithAI,
    isAnalyzingAI = false,
    hasAIConfigured = false
}) {
    const { t } = useTranslation()
    const [appliedIds, setAppliedIds] = useState(new Set())

    const handleApply = async (suggestion) => {
        setAppliedIds(prev => new Set([...prev, suggestion.id]))
        await onApplyRule?.({
            type: suggestion.type,
            value: suggestion.value,
            targetFolder: suggestion.targetFolder,
            tags: suggestion.tags || ''
        })
    }

    const handleApplyAll = async () => {
        const unapplied = suggestions.filter(s => !appliedIds.has(s.id))
        const ids = new Set(suggestions.map(s => s.id))
        setAppliedIds(ids)
        await onApplyAll?.(unapplied.map(s => ({
            type: s.type,
            value: s.value,
            targetFolder: s.targetFolder,
            tags: s.tags || ''
        })))
    }

    const pendingSuggestions = suggestions.filter(s => !appliedIds.has(s.id))

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>{t('modals.ruleSuggestions.title', 'Akıllı Kural Önerileri')}</span>
                    {suggestions.length > 0 && (
                        <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                            {pendingSuggestions.length}
                        </span>
                    )}
                </div>
            }
            className="max-w-2xl"
        >
            <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
                    <p>
                        {t('modals.ruleSuggestions.description', 'Yer imlerinizi kaydettiğiniz klasörler incelendi ve sık tekrarlanan alışkanlıklarınıza göre otomatik kurallar tespit edildi.')}
                    </p>
                    {hasAIConfigured && onAnalyzeWithAI && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onAnalyzeWithAI}
                            disabled={isAnalyzingAI}
                            className="shrink-0 ml-3 h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        >
                            <Bot className={`h-3.5 w-3.5 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                            <span>{t('modals.ruleSuggestions.analyzeAI', 'AI ile Derin Analiz')}</span>
                        </Button>
                    )}
                </div>

                {suggestions.length === 0 ? (
                    <div className="text-center py-10 px-4 border border-dashed rounded-xl space-y-2">
                        <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <h4 className="font-medium text-foreground text-sm">
                            {t('modals.ruleSuggestions.emptyTitle', 'Henüz belirgin bir kural kalıbı bulunamadı')}
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            {t('modals.ruleSuggestions.emptyDesc', 'Yer imlerinizi belirli klasörlere düzenli olarak kaydettikçe BookSmart burada otomatik kurallar önerecektir.')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {suggestions.map(s => {
                            const isApplied = appliedIds.has(s.id)
                            return (
                                <div
                                    key={s.id}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                        isApplied
                                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-75'
                                            : 'bg-card border-border/70 hover:border-primary/40 shadow-2xs'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            {/* Header Tags */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                                                    {s.type === 'domain' ? t('modals.rules.types.domain', 'Alan Adı') : t('modals.rules.types.keyword', 'Anahtar Kelime')}
                                                </span>
                                                <span className="font-semibold text-foreground text-xs truncate">
                                                    "{s.value}"
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                                    <Folder className="h-3 w-3" />
                                                    <span className="truncate">{s.targetFolder}</span>
                                                </span>
                                                {s.confidence && (
                                                    <span className="text-[10px] text-muted-foreground font-medium ml-auto">
                                                        %{s.confidence} {t('modals.ruleSuggestions.match', 'eşleşme')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Reason */}
                                            <p className="text-xs text-muted-foreground">
                                                {s.reason}
                                            </p>

                                            {/* Tags */}
                                            {s.tags && (
                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                                                    <Tag className="h-3 w-3 text-primary shrink-0" />
                                                    <span>{t('modals.rules.tags')}: {s.tags}</span>
                                                </div>
                                            )}

                                            {/* Samples preview */}
                                            {s.samples && s.samples.length > 0 && (
                                                <div className="pt-1 text-[11px] text-muted-foreground/80 flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-medium text-muted-foreground">{t('modals.ruleSuggestions.samples', 'Örnekler')}:</span>
                                                    {s.samples.map((samp, idx) => (
                                                        <span key={samp.id || idx} className="bg-muted px-1.5 py-0.5 rounded truncate max-w-[180px]" title={samp.title}>
                                                            {samp.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                                            {isApplied ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                                                    <Check className="h-3.5 w-3.5" />
                                                    <span>{t('common.saved', 'Eklendi')}</span>
                                                </span>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApply(s)}
                                                        className="h-7 text-xs font-medium gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                        <span>{t('modals.ruleSuggestions.acceptBtn', 'Kuralı Oluştur')}</span>
                                                    </Button>
                                                    {onDismiss && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onDismiss(s.id)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            title={t('common.dismiss', 'Yoksay')}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
                        {t('common.close', 'Kapat')}
                    </Button>
                    {pendingSuggestions.length > 1 && (
                        <Button
                            size="sm"
                            onClick={handleApplyAll}
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('modals.ruleSuggestions.acceptAllBtn', 'Tüm Önerileri Kabul Et ({{count}})', { count: pendingSuggestions.length })}</span>
                        </Button>
                    )}
                </div>
            </div>
        </SimpleModal>
    )
}
