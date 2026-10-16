import React from 'react';
import {
    Sparkles,
    Globe,
    Image,
    FileText,
    Play,
    Pause,
    Square,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Layers,
    Sliders,
    ExternalLink
} from 'lucide-react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

export function BulkMetadataEnricherModal({
    isOpen,
    onClose,
    status = 'idle',
    progress = { processed: 0, total: 0, percentage: 0, successCount: 0, updatedCount: 0, errorCount: 0 },
    currentBookmark = null,
    recentLogs = [],
    options = {
        scope: 'needingEnrichment',
        updateBookmarkTitle: true,
        updateBookmarkNotes: false,
        updateBookmarkIcon: true,
        forceRefresh: false,
        concurrency: 3
    },
    updateOptions,
    analysis = {
        totalBookmarks: 0,
        missingTitleCount: 0,
        missingDescriptionCount: 0,
        missingIconCount: 0,
        needingEnrichmentCount: 0,
        fullyEnrichedCount: 0
    },
    selectedCount = 0,
    onStart,
    onPause,
    onResume,
    onCancel,
    onReset
}) {
    const { t } = useTranslation();

    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    const isBusy = isRunning || isPaused;

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-500 shrink-0" />
                    <span>{t('modals.metadataEnricher.title', 'Toplu Favicon ve Meta Veri Yenileyici')}</span>
                    {analysis.needingEnrichmentCount > 0 && !isBusy && (
                        <span className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold px-2 py-0.5 rounded-full">
                            {analysis.needingEnrichmentCount} {t('modals.metadataEnricher.candidatesBadge', 'eksik')}
                        </span>
                    )}
                </div>
            }
            className="max-w-2xl"
        >
            <div className="space-y-5 text-sm">
                {/* Description info */}
                <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
                    <p>
                        {t('modals.metadataEnricher.description', 'Kütüphanenizdeki eksik başlıklı, açıklamasız veya kırık ikonlu yer imlerini arka planda sırayla tarayarak web sitelerinden en güncel favicon, başlık ve OpenGraph meta verilerini çeker.')}
                    </p>
                </div>

                {/* Candidate Statistics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border border-border/60 bg-card/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs">{t('modals.metadataEnricher.stats.missingTitles', 'Eksik Başlık')}</span>
                            <FileText className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="text-xl font-bold mt-1 text-foreground">
                            {analysis.missingTitleCount}
                        </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-card/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs">{t('modals.metadataEnricher.stats.missingNotes', 'Eksik Açıklama')}</span>
                            <Sliders className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="text-xl font-bold mt-1 text-foreground">
                            {analysis.missingDescriptionCount}
                        </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-card/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs">{t('modals.metadataEnricher.stats.missingIcons', 'Eksik Favicon')}</span>
                            <Image className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <div className="text-xl font-bold mt-1 text-foreground">
                            {analysis.missingIconCount}
                        </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-cyan-500/5 dark:bg-cyan-500/10 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
                            <span className="text-xs font-medium">{t('modals.metadataEnricher.stats.candidates', 'Zenginleştirilebilir')}</span>
                            <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold mt-1 text-cyan-700 dark:text-cyan-300">
                            {analysis.needingEnrichmentCount}
                        </div>
                    </div>
                </div>

                {/* Scope & Options Selection (editable when not running) */}
                <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>{t('modals.metadataEnricher.scopeTitle', 'Tarama Kapsamı')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            options.scope === 'needingEnrichment'
                                ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium'
                                : 'border-border/60 hover:bg-muted/40'
                        } ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="radio"
                                name="enricher_scope"
                                value="needingEnrichment"
                                checked={options.scope === 'needingEnrichment'}
                                onChange={() => updateOptions?.({ scope: 'needingEnrichment' })}
                                disabled={isBusy}
                                className="text-cyan-600"
                            />
                            <span>{t('modals.metadataEnricher.scopeNeeding', 'Yalnızca Eksikleri Tara')} ({analysis.needingEnrichmentCount})</span>
                        </label>

                        <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            options.scope === 'all'
                                ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium'
                                : 'border-border/60 hover:bg-muted/40'
                        } ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="radio"
                                name="enricher_scope"
                                value="all"
                                checked={options.scope === 'all'}
                                onChange={() => updateOptions?.({ scope: 'all' })}
                                disabled={isBusy}
                                className="text-cyan-600"
                            />
                            <span>{t('modals.metadataEnricher.scopeAll', 'Tüm Kütüphane')} ({analysis.totalBookmarks})</span>
                        </label>

                        <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            options.scope === 'selected'
                                ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium'
                                : 'border-border/60 hover:bg-muted/40'
                        } ${isBusy || selectedCount === 0 ? 'pointer-events-none opacity-40' : ''}`}>
                            <input
                                type="radio"
                                name="enricher_scope"
                                value="selected"
                                checked={options.scope === 'selected'}
                                onChange={() => updateOptions?.({ scope: 'selected' })}
                                disabled={isBusy || selectedCount === 0}
                                className="text-cyan-600"
                            />
                            <span>{t('modals.metadataEnricher.scopeSelected', 'Seçili Olanlar')} ({selectedCount})</span>
                        </label>
                    </div>

                    <div className="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className={`flex items-center gap-2 cursor-pointer ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="checkbox"
                                checked={options.updateBookmarkTitle}
                                onChange={(e) => updateOptions?.({ updateBookmarkTitle: e.target.checked })}
                                disabled={isBusy}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>{t('modals.metadataEnricher.optTitle', 'Eksik veya URL olan başlıkları güncelle')}</span>
                        </label>

                        <label className={`flex items-center gap-2 cursor-pointer ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="checkbox"
                                checked={options.updateBookmarkIcon}
                                onChange={(e) => updateOptions?.({ updateBookmarkIcon: e.target.checked })}
                                disabled={isBusy}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>{t('modals.metadataEnricher.optIcon', 'Eksik favicon ve ikonları tamamla')}</span>
                        </label>

                        <label className={`flex items-center gap-2 cursor-pointer ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="checkbox"
                                checked={options.updateBookmarkNotes}
                                onChange={(e) => updateOptions?.({ updateBookmarkNotes: e.target.checked })}
                                disabled={isBusy}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>{t('modals.metadataEnricher.optNotes', 'Boş açıklamalara meta açıklamasını yaz')}</span>
                        </label>

                        <label className={`flex items-center gap-2 cursor-pointer ${isBusy ? 'pointer-events-none opacity-60' : ''}`}>
                            <input
                                type="checkbox"
                                checked={options.forceRefresh}
                                onChange={(e) => updateOptions?.({ forceRefresh: e.target.checked })}
                                disabled={isBusy}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                            />
                            <span>{t('modals.metadataEnricher.optForce', 'Önbelleğe bakmaksızın yeniden çek')}</span>
                        </label>
                    </div>
                </div>

                {/* Progress Section (visible when running, paused, or completed) */}
                {(isBusy || isCompleted || isCancelled) && (
                    <div className="space-y-3 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
                                {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {isPaused && <Pause className="h-3.5 w-3.5 text-amber-500" />}
                                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                {isCancelled && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                                <span>
                                    {isRunning && t('modals.metadataEnricher.statusRunning', 'Arka planda zenginleştiriliyor...')}
                                    {isPaused && t('modals.metadataEnricher.statusPaused', 'Duraklatıldı')}
                                    {isCompleted && t('modals.metadataEnricher.statusCompleted', 'İşlem tamamlandı!')}
                                    {isCancelled && t('modals.metadataEnricher.statusCancelled', 'İşlem iptal edildi.')}
                                </span>
                            </span>
                            <span className="text-muted-foreground font-mono">
                                {progress.processed} / {progress.total} (%{progress.percentage})
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                    isCompleted ? 'bg-green-500' : isCancelled ? 'bg-amber-500' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>

                        {/* Status counts */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span className="text-green-600 dark:text-green-400">
                                ✓ {t('modals.metadataEnricher.successCount', 'Başarılı')}: {progress.successCount}
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                                ✎ {t('modals.metadataEnricher.updatedCount', 'Güncellenen Yer İmi')}: {progress.updatedCount}
                            </span>
                            {progress.errorCount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400">
                                    ⚠ {t('modals.metadataEnricher.errorCount', 'Hata/Erişilemedi')}: {progress.errorCount}
                                </span>
                            )}
                        </div>

                        {/* Current item being processed */}
                        {currentBookmark && isRunning && (
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 pt-1 border-t border-border/40">
                                <Globe className="h-3 w-3 shrink-0 text-cyan-500" />
                                <span className="truncate">{currentBookmark.title || currentBookmark.url}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Live Activity Logs */}
                {recentLogs.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('modals.metadataEnricher.recentActivity', 'Son İşlenenler')}
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-lg border border-border/50 bg-background/50 text-xs">
                            {recentLogs.slice(0, 10).map((log, idx) => (
                                <div key={log.id || idx} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-2 truncate">
                                        {log.success ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        )}
                                        <span className="truncate font-medium">{log.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {log.updatedFields.map(field => (
                                            <span
                                                key={field}
                                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium"
                                            >
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="text-xs text-muted-foreground">
                        {isBusy && t('modals.metadataEnricher.backgroundNotice', 'Pencereyi kapatabilirsiniz, işlem arka planda devam eder.')}
                    </div>

                    <div className="flex items-center gap-2">
                        {isCompleted || isCancelled ? (
                            <>
                                <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>{t('modals.metadataEnricher.btnReset', 'Sıfırla')}</span>
                                </Button>
                                <Button size="sm" onClick={onClose}>
                                    {t('common.close', 'Kapat')}
                                </Button>
                            </>
                        ) : isRunning ? (
                            <>
                                <Button variant="outline" size="sm" onClick={onPause} className="gap-1.5">
                                    <Pause className="h-3.5 w-3.5" />
                                    <span>{t('modals.metadataEnricher.btnPause', 'Duraklat')}</span>
                                </Button>
                                <Button variant="destructive" size="sm" onClick={onCancel} className="gap-1.5">
                                    <Square className="h-3.5 w-3.5" />
                                    <span>{t('modals.metadataEnricher.btnCancel', 'İptal')}</span>
                                </Button>
                            </>
                        ) : isPaused ? (
                            <>
                                <Button variant="default" size="sm" onClick={onResume} className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white">
                                    <Play className="h-3.5 w-3.5" />
                                    <span>{t('modals.metadataEnricher.btnResume', 'Devam Et')}</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={onCancel}>
                                    {t('modals.metadataEnricher.btnCancel', 'İptal')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" onClick={onClose}>
                                    {t('common.cancel', 'Vazgeç')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onStart}
                                    className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                                    disabled={analysis.totalBookmarks === 0}
                                >
                                    <Play className="h-3.5 w-3.5" />
                                    <span>{t('modals.metadataEnricher.btnStart', 'Zenginleştirmeyi Başlat')}</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </SimpleModal>
    );
}
