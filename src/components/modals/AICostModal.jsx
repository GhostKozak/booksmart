import { useState, useMemo } from 'react'
import { Wand2, Sparkles, Copy, Coins, Cpu, Check, Info, ShieldCheck } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { AI_MODELS, DEFAULT_MODEL } from '../../services/ai-service'
import { estimateBatchOperation, formatTokenCount, getModelPricing } from '../../lib/ai-cost-estimator'

export function AICostModal({
    isOpen,
    onClose,
    onConfirm,
    operation = 'magicSort',
    bookmarks = [],
    currentModel
}) {
    const { t } = useTranslation()
    const [selectedModel, setSelectedModel] = useState(() => currentModel || DEFAULT_MODEL)
    const [dontAskAgain, setDontAskAgain] = useState(false)

    // Sync model whenever modal opens or currentModel changes (pattern recommended by React for prop-based state adjustment)
    const [prevSync, setPrevSync] = useState({ isOpen, currentModel })
    if (prevSync.isOpen !== isOpen || prevSync.currentModel !== currentModel) {
        setPrevSync({ isOpen, currentModel })
        if (isOpen) {
            setSelectedModel(currentModel || DEFAULT_MODEL)
        }
    }

    // Calculate estimations based on currently selected model and bookmarks
    const estimation = useMemo(() => {
        return estimateBatchOperation(operation, bookmarks, selectedModel)
    }, [operation, bookmarks, selectedModel])

    const operationConfig = useMemo(() => {
        switch (operation) {
            case 'fixTitles':
                return {
                    icon: Sparkles,
                    title: t('modals.aiCost.ops.fixTitles.title', 'AI Fix Titles'),
                    desc: t('modals.aiCost.ops.fixTitles.desc', 'Clean up messy, missing, or raw URL titles using AI.'),
                    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                }
            case 'smartDuplicates':
                return {
                    icon: Copy,
                    title: t('modals.aiCost.ops.smartDuplicates.title', 'AI Smart Duplicates'),
                    desc: t('modals.aiCost.ops.smartDuplicates.desc', 'Find semantic and near-duplicate bookmarks using AI.'),
                    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                }
            case 'magicSort':
            default:
                return {
                    icon: Wand2,
                    title: t('modals.aiCost.ops.magicSort.title', 'AI Magic Sort'),
                    desc: t('modals.aiCost.ops.magicSort.desc', 'Automatically categorize and tag bookmarks using AI.'),
                    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
                }
        }
    }, [operation, t])

    const handleConfirm = () => {
        if (dontAskAgain) {
            sessionStorage.setItem('bs_skip_ai_cost_confirm', 'true')
        }
        onConfirm(selectedModel)
    }

    const Icon = operationConfig.icon

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.aiCost.title', 'AI Cost & Token Estimation')}
            className="max-w-lg"
        >
            <div className="space-y-4">
                {/* Header Operation Info */}
                <div className="flex items-start gap-3 p-3.5 bg-muted/30 border border-border/70 rounded-xl">
                    <div className={cn("p-2.5 rounded-xl border shrink-0", operationConfig.color)}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-sm text-foreground">{operationConfig.title}</h4>
                            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-secondary text-secondary-foreground">
                                {bookmarks.length} {t('modals.aiCost.bookmarksCount', 'bookmarks')}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{operationConfig.desc}</p>
                    </div>
                </div>

                {/* Model Selector Dropdown */}
                <div>
                    <label htmlFor="ai-cost-model-select" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <Cpu className="h-3.5 w-3.5" />
                        {t('modals.aiCost.modelLabel', 'AI Model')}
                    </label>
                    <select
                        id="ai-cost-model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full h-10 px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                        {AI_MODELS.map(m => {
                            const p = getModelPricing(m.id)
                            const priceTag = p.isLocal
                                ? '(Free / Local)'
                                : p.isFreeTier
                                    ? '(Free Tier)'
                                    : `($${p.inputPerM}/1M)`
                            return (
                                <option key={m.id} value={m.id}>
                                    {m.name} {priceTag}
                                </option>
                            )
                        })}
                    </select>
                </div>

                {/* Estimation Hero Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Cost Metric */}
                    <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1">
                            <Coins className="h-4 w-4" />
                            {t('modals.aiCost.estimatedCost', 'Estimated Cost')}
                        </div>
                        <div className="font-bold text-lg text-foreground tracking-tight">
                            {estimation.formattedCost}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">
                            {estimation.isLocal
                                ? t('modals.aiCost.localFreeNotice', '0 API fee (Offline)')
                                : estimation.pricing.inputPerM
                                    ? `$${estimation.pricing.inputPerM} in · $${estimation.pricing.outputPerM} out / 1M`
                                    : t('modals.aiCost.freeTier', 'Free tier')}
                        </div>
                    </div>

                    {/* Tokens Metric */}
                    <div className="p-3.5 bg-muted/40 border border-border/70 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                            <Cpu className="h-4 w-4" />
                            {t('modals.aiCost.estimatedTokens', 'Total Tokens')}
                        </div>
                        <div className="font-bold text-lg text-foreground tracking-tight">
                            ~{formatTokenCount(estimation.totalTokens)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">
                            {estimation.chunkCount} {estimation.chunkCount === 1 ? t('modals.aiCost.batchSingular', 'batch') : t('modals.aiCost.batchPlural', 'batches')} ({estimation.chunkSize}/req)
                        </div>
                    </div>
                </div>

                {/* Token Breakdown Details */}
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/50 text-xs space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('modals.aiCost.inputTokens', 'Prompt (Input):')}</span>
                        <span className="font-mono text-foreground font-medium">~{formatTokenCount(estimation.inputTokens)} tokens</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('modals.aiCost.outputTokens', 'Response (Output):')}</span>
                        <span className="font-mono text-foreground font-medium">~{formatTokenCount(estimation.outputTokens)} tokens</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('modals.aiCost.batches', 'Batch API Requests:')}</span>
                        <span className="text-foreground font-medium">{estimation.chunkCount} {t('modals.aiCost.requests', 'calls')}</span>
                    </div>
                </div>

                {/* Local Model Callout */}
                {estimation.isLocal ? (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>{t('modals.aiCost.localBanner', 'Runs locally on your device via Ollama. No data is sent to external APIs.')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/20 border border-border/40 rounded-lg text-[11px] text-muted-foreground">
                        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>{t('modals.aiCost.disclaimer', 'Estimation based on standard token pricing. Actual API charges may vary slightly.')}</span>
                    </div>
                )}

                {/* Checkbox: Don't ask again */}
                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="skip-ai-cost-confirm"
                        checked={dontAskAgain}
                        onChange={(e) => setDontAskAgain(e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor="skip-ai-cost-confirm" className="text-xs text-muted-foreground cursor-pointer select-none">
                        {t('modals.aiCost.dontAskAgain', "Don't show this estimation again in this session")}
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                    <Button variant="outline" onClick={onClose}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleConfirm} className="gap-2">
                        <Check className="h-4 w-4" />
                        {t('modals.aiCost.confirmAndRun', 'Confirm & Run')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
