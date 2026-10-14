import React from 'react';
import { Button } from '../ui/button';
import { Sparkles, Copy, Check, StickyNote, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export function PreviewAISummaryCard({
    aiSummary,
    hasCopied,
    handleCopySummary,
    handleAppendSummaryToNotes,
    handleGenerateOneSentenceSummary,
    isSummarizingOneSentence,
    autoSummarizeEnabled,
    toggleAutoSummarize
}) {
    const { t } = useTranslation();

    return (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-linear-to-br from-purple-500/5 via-background to-indigo-500/5 p-4 shadow-xs transition-all">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                    <span>{t('preview.oneSentenceSummaryTitle', 'Bu Sayfa Ne Anlatıyor?')}</span>
                </div>
                {aiSummary && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={handleCopySummary}
                            title={t('preview.copySummary', 'Özeti Kopyala')}
                        >
                            {hasCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-purple-500 cursor-pointer"
                            onClick={handleAppendSummaryToNotes}
                            title={t('preview.appendToNotes', 'Notlara Ekle')}
                        >
                            <StickyNote className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-purple-500 cursor-pointer"
                            onClick={() => handleGenerateOneSentenceSummary()}
                            disabled={isSummarizingOneSentence}
                            title={t('preview.regenerateSummary', 'Özeti Yenile')}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isSummarizingOneSentence && "animate-spin text-purple-500")} />
                        </Button>
                    </div>
                )}
            </div>

            {isSummarizingOneSentence ? (
                <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    <span>{t('preview.generatingSummary', 'YZ tek cümlelik özeti hazırlıyor...')}</span>
                </div>
            ) : aiSummary ? (
                <div className="pt-3">
                    <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed italic">
                        “{aiSummary}”
                    </p>
                </div>
            ) : (
                <div className="pt-3 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('preview.noSummaryDesc', 'Yapay zeka başlık ve sayfa içeriğini analiz ederek tek cümlelik net bir özet çıkarsın.')}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateOneSentenceSummary()}
                            disabled={isSummarizingOneSentence}
                            className="h-7 text-xs gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            <span>{t('preview.generateOneSentence', 'Tek Cümlelik Özet Çıkar')}</span>
                        </Button>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoSummarizeEnabled}
                                onChange={(e) => toggleAutoSummarize(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <span>{t('preview.autoSummarizeToggle', 'Detayda otomatik özetle')}</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
