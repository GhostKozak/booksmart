import React, { useState, useMemo } from 'react';
import {
    GitMerge,
    Layers,
    Sliders,
    CheckCheck,
    X,
    ExternalLink,
    Sparkles,
    Trash2,
    Calendar,
    Folder,
    Hash,
    StickyNote
} from 'lucide-react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Favicon } from '../Favicon';
import { cn, getRelativeTime } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { findSimilarBookmarkGroups, buildMergedPreview } from '../../lib/duplicate-detector';
import { toast } from 'sonner';

export function SimilarDuplicatesModal({
    isOpen,
    onClose,
    bookmarks = [],
    onBatchMerge
}) {
    const { t } = useTranslation();

    const [threshold, setThreshold] = useState(0.80);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'url' | 'title'
    const [dismissedClusterIds, setDismissedClusterIds] = useState(new Set());
    const [selectedPrimaries, setSelectedPrimaries] = useState({}); // clusterId -> primaryBookmarkId

    // Detect clusters based on current bookmarks and threshold
    const allClusters = useMemo(() => {
        return findSimilarBookmarkGroups(bookmarks, { titleThreshold: threshold });
    }, [bookmarks, threshold]);

    // Filter out dismissed clusters and apply category filter
    const visibleClusters = useMemo(() => {
        return allClusters.filter(c => {
            if (dismissedClusterIds.has(c.id)) return false;
            if (filterType === 'url') return c.type === 'exact_url' || c.type === 'url_variation';
            if (filterType === 'title') return c.type === 'similar_title';
            return true;
        });
    }, [allClusters, dismissedClusterIds, filterType]);

    const handleDismissCluster = (clusterId) => {
        setDismissedClusterIds(prev => new Set(prev).add(clusterId));
    };

    const handleSelectPrimary = (clusterId, bookmarkId) => {
        setSelectedPrimaries(prev => ({
            ...prev,
            [clusterId]: bookmarkId
        }));
    };

    const handleMergeSingleCluster = async (cluster) => {
        const primaryId = selectedPrimaries[cluster.id] || cluster.mergedPreview.primaryId;
        const primary = cluster.bookmarks.find(b => b.id === primaryId) || cluster.bookmarks[0];
        const secondaries = cluster.bookmarks.filter(b => b.id !== primary.id);

        if (onBatchMerge) {
            await onBatchMerge([
                {
                    primary,
                    secondaries,
                    mergedPreview: buildMergedPreview([primary, ...secondaries])
                }
            ]);
            handleDismissCluster(cluster.id);
            toast.success(t('similarDuplicates.mergedGroupSuccess', 'Grup başarıyla birleştirildi!'));
        }
    };

    const handleMergeAll = async () => {
        if (visibleClusters.length === 0) return;

        const mergePayload = visibleClusters.map(cluster => {
            const primaryId = selectedPrimaries[cluster.id] || cluster.mergedPreview.primaryId;
            const primary = cluster.bookmarks.find(b => b.id === primaryId) || cluster.bookmarks[0];
            const secondaries = cluster.bookmarks.filter(b => b.id !== primary.id);
            return {
                primary,
                secondaries,
                mergedPreview: buildMergedPreview([primary, ...secondaries])
            };
        });

        if (onBatchMerge) {
            await onBatchMerge(mergePayload);
            toast.success(t('similarDuplicates.mergedAllSuccess', {
                count: visibleClusters.length,
                defaultValue: `${visibleClusters.length} grup başarıyla birleştirildi!`
            }));
            onClose();
        }
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <GitMerge className="w-5 h-5 text-primary" />
                    <span>{t('similarDuplicates.modalTitle', 'Yinelenen ve Benzer İçerikleri Birleştir')}</span>
                    {visibleClusters.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                            {visibleClusters.length} grup
                        </span>
                    )}
                </div>
            }
            className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
        >
            <div className="flex flex-col flex-1 min-h-[500px] h-[78vh] overflow-hidden bg-background">
                {/* ── Top Toolbar: Filters & Sensitivity Slider ── */}
                <div className="p-3.5 border-b border-border/80 flex flex-wrap items-center justify-between gap-3 bg-card/60 backdrop-blur-xs shrink-0">
                    {/* Left: Type Segmented Filter */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => setFilterType('all')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                filterType === 'all'
                                    ? "bg-background text-foreground shadow-2xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('common.all', 'Tümü')} ({allClusters.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('url')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                filterType === 'url'
                                    ? "bg-background text-foreground shadow-2xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('similarDuplicates.urlVariants', 'URL Varyasyonları')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType('title')}
                            className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                filterType === 'title'
                                    ? "bg-background text-foreground shadow-2xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('similarDuplicates.similarTitles', 'Benzer Başlıklar')}
                        </button>
                    </div>

                    {/* Middle: Similarity Threshold Slider */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        <span>{t('similarDuplicates.similarity', 'Hassasiyet:')} {Math.round(threshold * 100)}%</span>
                        <input
                            type="range"
                            min="0.65"
                            max="0.95"
                            step="0.05"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="w-20 sm:w-24 accent-primary cursor-pointer"
                        />
                    </div>

                    {/* Right: Batch Merge All Action */}
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleMergeAll}
                        disabled={visibleClusters.length === 0}
                        className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs gap-1.5"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t('similarDuplicates.mergeAllBtn', { count: visibleClusters.length, defaultValue: `Tümünü Birleştir (${visibleClusters.length})` })}</span>
                    </Button>
                </div>

                {/* ── Main Clusters Feed ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {visibleClusters.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground my-12">
                            <Sparkles className="w-12 h-12 text-primary/40 mb-3" />
                            <h4 className="font-semibold text-base text-foreground mb-1">
                                {t('similarDuplicates.cleanTitle', 'Tebrikler! Yinelenen veya benzer içerik bulunamadı.')}
                            </h4>
                            <p className="text-xs max-w-sm text-muted-foreground leading-relaxed">
                                {t('similarDuplicates.cleanHelp', 'Kütüphanenizdeki yer imleri temiz ve düzenli görünüyor. Daha geniş aramak için yukarıdaki hassasiyeti kaydırabilirsiniz.')}
                            </p>
                        </div>
                    ) : (
                        visibleClusters.map((cluster) => {
                            const primaryId = selectedPrimaries[cluster.id] || cluster.mergedPreview.primaryId;
                            const isExact = cluster.type === 'exact_url';
                            const isVariant = cluster.type === 'url_variation';

                            return (
                                <div
                                    key={cluster.id}
                                    className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs divide-y divide-border/60"
                                >
                                    {/* Cluster Header */}
                                    <div className="p-3.5 bg-muted/30 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 text-xs font-semibold rounded-full border",
                                                    isExact
                                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                                        : isVariant
                                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                                        : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25"
                                                )}
                                            >
                                                {cluster.type === 'exact_url'
                                                    ? t('similarDuplicates.exactUrl', 'Birebir Aynı URL')
                                                    : cluster.type === 'url_variation'
                                                    ? t('similarDuplicates.urlVariation', 'Farklı Parametre / Format Varyasyonu')
                                                    : t('similarDuplicates.similarTitle', {
                                                        percent: Math.round((cluster.similarityScore || 0) * 100),
                                                        defaultValue: `Benzer Başlık & İçerik (${Math.round((cluster.similarityScore || 0) * 100)}% Benzerlik)`
                                                    })}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {t('similarDuplicates.bookmarksCount', { count: cluster.bookmarks.length, defaultValue: `${cluster.bookmarks.length} yer imi` })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMergeSingleCluster(cluster)}
                                                className="h-7 px-2.5 text-xs cursor-pointer text-primary border-primary/30 hover:bg-primary/10 gap-1"
                                            >
                                                <GitMerge className="w-3 h-3" />
                                                <span>{t('similarDuplicates.mergeThisGroup', 'Birleştir')}</span>
                                            </Button>

                                            <button
                                                type="button"
                                                onClick={() => handleDismissCluster(cluster.id)}
                                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                                title={t('common.dismiss', 'Yok Say')}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bookmarks in this cluster */}
                                    <div className="p-3.5 space-y-2.5">
                                        <div className="text-[11px] font-medium text-muted-foreground">
                                            {t('similarDuplicates.choosePrimary', 'Ana (korunacak) yer imini seçin:')}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {cluster.bookmarks.map((bm) => {
                                                const isPrimary = bm.id === primaryId;

                                                return (
                                                    <div
                                                        key={bm.id}
                                                        onClick={() => handleSelectPrimary(cluster.id, bm.id)}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2",
                                                            isPrimary
                                                                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/40"
                                                                : "bg-card hover:bg-muted/40 border-border/70"
                                                        )}
                                                    >
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Favicon url={bm.url} className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="font-semibold text-foreground truncate">
                                                                        {bm.title || bm.url}
                                                                    </span>
                                                                </div>

                                                                <span
                                                                    className={cn(
                                                                        "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                                                                        isPrimary
                                                                            ? "bg-primary text-primary-foreground font-semibold"
                                                                            : "bg-muted text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {isPrimary ? t('similarDuplicates.primaryBadge', '✓ Ana Yer İmi') : t('similarDuplicates.duplicateBadge', 'Yinelenen')}
                                                                </span>
                                                            </div>

                                                            <a
                                                                href={bm.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-muted-foreground hover:text-foreground text-[11px] truncate block leading-tight hover:underline mb-1.5"
                                                            >
                                                                {bm.url}
                                                            </a>
                                                        </div>

                                                        {/* Metadata chips */}
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Folder className="w-3 h-3" />
                                                                <span className="truncate max-w-[90px]">{bm.newFolder || bm.originalFolder || t('common.library', 'Kütüphane')}</span>
                                                            </span>

                                                            {bm.tags && bm.tags.length > 0 && (
                                                                <span className="inline-flex items-center gap-0.5 bg-muted px-1 rounded">
                                                                    <Hash className="w-2.5 h-2.5" />
                                                                    <span>{t('similarDuplicates.tagsCount', { count: bm.tags.length, defaultValue: `${bm.tags.length} etiket` })}</span>
                                                                </span>
                                                            )}

                                                            {bm.note && (
                                                                <span className="inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1 rounded">
                                                                    <StickyNote className="w-2.5 h-2.5" />
                                                                    <span>{t('similarDuplicates.hasNote', 'Not var')}</span>
                                                                </span>
                                                            )}

                                                            {bm.addDate && (
                                                                <span className="ml-auto opacity-75">
                                                                    {getRelativeTime(parseInt(bm.addDate) || 0, t)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Merge Outcome Summary Preview */}
                                    <div className="p-3 bg-muted/20 text-xs flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                            <span className="font-semibold text-foreground">{t('similarDuplicates.mergeResult', 'Birleşme Sonucu:')}</span>

                                            {cluster.mergedPreview.tags.length > 0 && (
                                                <span className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded-md border border-border/60">
                                                    <Hash className="w-3 h-3 text-primary" />
                                                    <span>{t('similarDuplicates.mergedTags', { count: cluster.mergedPreview.tags.length, defaultValue: `${cluster.mergedPreview.tags.length} birleşik etiket` })}</span>
                                                </span>
                                            )}

                                            {cluster.mergedPreview.note && (
                                                <span className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded-md border border-border/60">
                                                    <StickyNote className="w-3 h-3 text-amber-500" />
                                                    <span>{t('similarDuplicates.mergedNotes', 'Birleşik notlar')}</span>
                                                </span>
                                            )}

                                            <span className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded-md border border-border/60">
                                                <Trash2 className="w-3 h-3 text-rose-500" />
                                                <span>{t('similarDuplicates.copiesDeleted', { count: cluster.bookmarks.length - 1, defaultValue: `${cluster.bookmarks.length - 1} kopya silinecek` })}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </SimpleModal>
    );
}
