
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ExternalLink, X, RefreshCw, AlertTriangle, StickyNote, Wand2, Loader2, LayoutDashboard, Globe, Image, Sparkles, Copy, Check, Rss, BookOpen, Clock } from 'lucide-react';
import { cn, isHttpUrl } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { db } from '../db';
import { summarizeContent, generateOneSentenceSummary } from '../services/ai-service';
import { toast } from 'sonner';
import {
    getEffectiveApiKey,
    getStoredProvider,
    getStoredModel,
    isVaultUnlocked,
    hasVault,
    getStoredCorsProxy,
    getAutoSummarizeEnabled,
    setAutoSummarizeEnabled
} from '../lib/key-vault';
import { useBookmarkPreview } from '../lib/metadata-fetcher';
import { Favicon } from './Favicon';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../store/useAppStore';
import { subscribeToFeed, unsubscribeFeed } from '../lib/rss-service';
import { formatReadingTime } from '../lib/reader-service';

export function PreviewPane({ bookmark, onClose, className }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('card'); // 'card' | 'live'
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [noteValue, setNoteValue] = useState(bookmark?.note || '');
    const [isNoteOpen, setIsNoteOpen] = useState(!!(bookmark?.note));
    const [aiSummary, setAiSummary] = useState(bookmark?.aiSummary || '');
    const [isSummarizingOneSentence, setIsSummarizingOneSentence] = useState(false);
    const [autoSummarizeEnabled, setAutoSummarizeEnabledState] = useState(() => getAutoSummarizeEnabled());
    const [hasCopied, setHasCopied] = useState(false);
    const autoSummarizedRef = useRef(new Set());

    const { preview, isLoading: isPreviewLoading, refresh: refreshPreview } = useBookmarkPreview(bookmark?.url);

    const [prevSync, setPrevSync] = useState({ id: bookmark?.id, note: bookmark?.note, aiSummary: bookmark?.aiSummary });

    if (prevSync.id !== bookmark?.id || prevSync.note !== bookmark?.note || prevSync.aiSummary !== bookmark?.aiSummary) {
        setPrevSync({ id: bookmark?.id, note: bookmark?.note, aiSummary: bookmark?.aiSummary });
        setNoteValue(bookmark?.note || '');
        setIsNoteOpen(!!(bookmark?.note));
        setAiSummary(bookmark?.aiSummary || '');
    }

    const { setIsRssReaderOpen, setSelectedFeedUrl, openReaderMode } = useAppStore();
    const [isSubscribingFeed, setIsSubscribingFeed] = useState(false);

    const subscribedFeed = useLiveQuery(async () => {
        if (!bookmark?.url) return null;
        if (bookmark?.feedUrl) {
            const byFeedUrl = await db.feeds.get(bookmark.feedUrl);
            if (byFeedUrl) return byFeedUrl;
        }
        return await db.feeds.where('siteUrl').equals(bookmark.url).first();
    }, [bookmark?.url, bookmark?.feedUrl]);

    const handleSubscribeFeed = async () => {
        if (!bookmark?.url) return;
        setIsSubscribingFeed(true);
        try {
            const { feed } = await subscribeToFeed(bookmark);
            toast.success(t('rss.subscribeSuccess', {
                title: feed.title,
                defaultValue: `"${feed.title}" akışına abone olundu!`
            }));
        } catch (err) {
            toast.error(err.message || t('rss.noFeedFound', { defaultValue: 'Bu site için RSS akışı bulunamadı.' }));
        } finally {
            setIsSubscribingFeed(false);
        }
    };

    const handleUnsubscribeFeed = async (feedUrl) => {
        try {
            await unsubscribeFeed(feedUrl);
            toast.success(t('rss.unsubscribeSuccess', { defaultValue: 'Abonelikten çıkıldı.' }));
        } catch {
            toast.error('Kaldırılamadı');
        }
    };

    const handleOpenInReader = (feedUrl) => {
        setSelectedFeedUrl(feedUrl);
        setIsRssReaderOpen(true);
    };

    const handleReload = () => {
        if (activeTab === 'card') {
            refreshPreview();
        } else {
            setIsLoading(true);
            setRefreshKey(prev => prev + 1);
        }
    };

    const [isSummarizing, setIsSummarizing] = useState(false);

    const saveNote = useCallback(async (value) => {
        if (!bookmark?.id) return;
        setNoteValue(value);
        await db.bookmarks.update(bookmark.id, { note: value });
    }, [bookmark]);

    const handleGenerateOneSentenceSummary = useCallback(async ({ silent = false } = {}) => {
        if (!bookmark?.id || !bookmark?.url) return;

        const provider = getStoredProvider();
        const apiKey = await getEffectiveApiKey(provider);
        const modelId = getStoredModel();

        if ((!apiKey && provider !== 'ollama') || (hasVault() && !isVaultUnlocked() && !apiKey)) {
            if (!silent) {
                toast.error(t('settings.ai.reqOpenAI') || 'API key required');
            }
            return;
        }

        setIsSummarizingOneSentence(true);

        try {
            const corsProxy = getStoredCorsProxy();
            const summary = await generateOneSentenceSummary(bookmark, apiKey, modelId, {
                corsProxy,
                previewMetadata: preview
            });

            if (summary) {
                setAiSummary(summary);
                await db.bookmarks.update(bookmark.id, { aiSummary: summary });
                if (!silent) {
                    toast.success(t('preview.oneSentenceSuccess', 'Tek cümlelik YZ özeti oluşturuldu'));
                }
            }
        } catch (e) {
            console.error('Failed to generate one-sentence summary:', e);
            if (!silent) {
                toast.error(t('preview.oneSentenceError', 'Tek cümlelik özet oluşturulamadı'));
            }
        } finally {
            setIsSummarizingOneSentence(false);
        }
    }, [bookmark, preview, t]);

    // Automatic summarization trigger when entering bookmark details
    useEffect(() => {
        if (!bookmark?.id || !bookmark?.url || bookmark?.aiSummary || aiSummary) return;
        if (!autoSummarizeEnabled) return;
        if (autoSummarizedRef.current.has(bookmark.id)) return;

        const provider = getStoredProvider();
        getEffectiveApiKey(provider).then((apiKey) => {
            if ((apiKey || provider === 'ollama') && (!hasVault() || isVaultUnlocked())) {
                autoSummarizedRef.current.add(bookmark.id);
                handleGenerateOneSentenceSummary({ silent: true });
            }
        });
    }, [bookmark?.id, bookmark?.url, bookmark?.aiSummary, aiSummary, autoSummarizeEnabled, handleGenerateOneSentenceSummary]);

    const handleCopySummary = () => {
        if (!aiSummary) return;
        navigator.clipboard.writeText(aiSummary);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast.success(t('preview.copied', 'Özet panoya kopyalandı'));
    };

    const handleAppendSummaryToNotes = async () => {
        if (!aiSummary) return;
        const newNote = noteValue ? `${noteValue}\n\n---\n**AI Summary:**\n${aiSummary}` : `**AI Summary:**\n${aiSummary}`;
        await saveNote(newNote);
        setIsNoteOpen(true);
        toast.success(t('preview.appendedToNotes', 'Özet notlara eklendi'));
    };

    const toggleAutoSummarize = (checked) => {
        setAutoSummarizeEnabledState(checked);
        setAutoSummarizeEnabled(checked);
        if (checked && !aiSummary && !isSummarizingOneSentence) {
            handleGenerateOneSentenceSummary({ silent: false });
        }
    };

    const handleSummarize = async () => {
        const provider = getStoredProvider();
        const apiKey = await getEffectiveApiKey(provider);
        const modelId = getStoredModel();

        if ((!apiKey && provider !== 'ollama') || (hasVault() && !isVaultUnlocked() && !apiKey)) {
            toast.error(t('settings.ai.reqOpenAI') || 'API key required');
            return;
        }

        setIsSummarizing(true);
        setIsNoteOpen(true);

        try {
            const corsProxy = getStoredCorsProxy();
            const summary = await summarizeContent(bookmark.url, apiKey, modelId, { corsProxy });
            const newNote = noteValue ? `${noteValue}\n\n---\n**AI Summary:**\n${summary}` : `**AI Summary:**\n${summary}`;
            await saveNote(newNote);
            toast.success(t('preview.summarySuccess') || 'AI Summary generated');
        } catch (e) {
            console.error(e);
            toast.error(t('preview.summaryError') || 'Failed to generate summary');
        } finally {
            setIsSummarizing(false);
        }
    };

    if (!bookmark) return null;

    return (
        <div className={cn("flex flex-col h-full bg-background border-l shadow-xl", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-card">
                <div className="flex-1 min-w-0 mr-4">
                    <h3 className="font-semibold text-sm truncate" title={bookmark.title}>
                        {bookmark.title || t('common.untitled')}
                    </h3>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            {bookmark.url} <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                        onClick={() => openReaderMode(bookmark)}
                        title={t('reader.openReaderMode', 'Temiz Okuma Modunda Aç')}
                    >
                        <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        title={t('preview.summarize') || 'Summarize Content'}
                    >
                        {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant={isNoteOpen ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        title={t('notes.toggle')}
                    >
                        <StickyNote className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReload} title={t('preview.reload')}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title={t('preview.close')}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* View Mode Toggle: Card vs Live */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b text-xs">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('card')}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                            activeTab === 'card'
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Image className="w-3.5 h-3.5" />
                        <span>{t('preview.cardView', 'Overview Card')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('live')}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                            activeTab === 'live'
                                ? "bg-background text-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{t('preview.liveView', 'Live Webpage')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => openReaderMode(bookmark)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                        title={t('reader.openReaderMode', 'Temiz Okuma Modunda Aç')}
                    >
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t('reader.modeShort', 'Okuma Modu')}</span>
                        {bookmark.readingTimeMinutes && (
                            <span className="text-[10px] font-semibold bg-amber-500/15 px-1.5 py-0.2 rounded-full">
                                {formatReadingTime(bookmark.readingTimeMinutes, t)}
                            </span>
                        )}
                    </button>
                </div>
                {preview?.siteName && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[150px] font-medium">
                        {preview.siteName}
                    </span>
                )}
            </div>

            {/* Note Area */}
            {isNoteOpen && (
                <div className="border-b bg-muted/30 p-3 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <StickyNote className="h-3 w-3" />
                            {t('notes.label')}
                        </label>
                        <span className="text-[10px] text-muted-foreground/60">
                            {t('notes.chromeWarning')}
                        </span>
                    </div>
                    <textarea
                        value={noteValue}
                        onChange={(e) => saveNote(e.target.value)}
                        placeholder={t('notes.placeholder')}
                        className="w-full bg-background/80 border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px] max-h-[120px]"
                        rows={2}
                    />
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'card' ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-muted/10">
                    {/* OpenGraph Card Hero Image */}
                    <div className="relative w-full aspect-video bg-muted/40 rounded-2xl overflow-hidden border border-border/60 shadow-sm group">
                        <img
                            src={preview?.image || `https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=800&h=450`}
                            alt={bookmark.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                            onError={(e) => {
                                const fallbackUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=800&h=450`;
                                if (e.target.src !== fallbackUrl) {
                                    e.target.src = fallbackUrl;
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                                <Favicon url={bookmark.url} customIcon={preview?.favicon} className="w-3.5 h-3.5" />
                                <span className="font-medium truncate max-w-[180px]">
                                    {preview?.siteName || (() => {
                                        try { return new URL(bookmark.url).hostname; } catch { return bookmark.url; }
                                    })()}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs bg-white/90 hover:bg-white text-black font-medium gap-1 shadow-xs cursor-pointer"
                                onClick={() => {
                                    if (isHttpUrl(bookmark.url)) {
                                        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                            >
                                <ExternalLink className="h-3 w-3" />
                                <span>{t('preview.openExternal')}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Metadata Information */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-start gap-2.5">
                            <Favicon url={bookmark.url} customIcon={preview?.favicon} className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base text-foreground leading-snug">
                                    {preview?.title || bookmark.title || t('common.untitled')}
                                </h4>
                                <a
                                    href={bookmark.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors break-all line-clamp-1 mt-0.5"
                                >
                                    {bookmark.url}
                                </a>
                            </div>
                        </div>

                        {preview?.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40 whitespace-pre-wrap">
                                {preview.description}
                            </p>
                        )}
                    </div>

                    {/* AI One-Sentence Summary Card: "Bu Sayfa Ne Anlatıyor?" */}
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

                    {/* RSS / Newsletter Feed Card */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                                <Rss className="w-4 h-4 shrink-0 text-amber-500" />
                                <span>{t('rss.cardTitle', 'RSS & Bülten Akışı')}</span>
                            </div>
                            {subscribedFeed && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    {t('rss.subscribedBadge', 'Abone Olundu')}
                                </span>
                            )}
                        </div>

                        {subscribedFeed ? (
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                    {subscribedFeed.description || t('rss.subscribedDesc', 'Bu sitenin RSS akışı takip ediliyor. Yeni yazılar otomatik bildirilecek.')}
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenInReader(subscribedFeed.feedUrl)}
                                        className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                    >
                                        <Rss className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{t('rss.openInReader', 'Akışı Aç')}</span>
                                        {subscribedFeed.unreadCount > 0 && (
                                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-semibold">
                                                {subscribedFeed.unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleUnsubscribeFeed(subscribedFeed.feedUrl)}
                                        className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                                    >
                                        <span>{t('rss.unsubscribe', 'Abonelikten Çık')}</span>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-3 pt-0.5">
                                <p className="text-muted-foreground text-[11px] leading-relaxed flex-1">
                                    {t('rss.unsubscribedDesc', 'Bu blog veya haber sitesine abone olarak yeni yazıları akışınızda görün.')}
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSubscribeFeed}
                                    disabled={isSubscribingFeed}
                                    className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shrink-0"
                                >
                                    {isSubscribingFeed ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                    ) : (
                                        <Rss className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                    <span>{t('rss.subscribeBtn', 'Akışa Abone Ol')}</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Quick Action Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSummarize}
                            disabled={isSummarizing}
                            className="text-xs gap-1.5 rounded-xl cursor-pointer"
                        >
                            {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" /> : <Wand2 className="w-3.5 h-3.5 text-purple-500" />}
                            <span>{t('preview.summarize')}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshPreview}
                            disabled={isPreviewLoading}
                            className="text-xs gap-1.5 rounded-xl cursor-pointer"
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isPreviewLoading && "animate-spin")} />
                            <span>{t('preview.refreshMetadata', 'Refresh Preview')}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReaderMode(bookmark)}
                            className="text-xs gap-1.5 rounded-xl cursor-pointer text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        >
                            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t('reader.openReaderMode', 'Temiz Okuma Modu')}</span>
                            {bookmark.readingTimeMinutes && (
                                <span className="opacity-75 text-[11px]">
                                    ({formatReadingTime(bookmark.readingTimeMinutes, t)})
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('live')}
                            className="text-xs gap-1.5 rounded-xl cursor-pointer ml-auto"
                        >
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span>{t('preview.tryIframe', 'Load Live Site')}</span>
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 relative bg-muted/20 overflow-hidden flex flex-col">
                    {aiSummary && (
                        <div className="px-3 py-1.5 bg-card/90 backdrop-blur border-b text-xs flex items-center justify-between gap-2 shadow-xs shrink-0 z-10">
                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium truncate">
                                <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                                <span className="truncate italic">“{aiSummary}”</span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCopySummary}
                                className="h-6 px-1.5 text-[11px] shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                title={t('preview.copySummary', 'Özeti Kopyala')}
                            >
                                {hasCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    )}
                    <div className="flex-1 relative overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">{t('preview.loading')}</span>
                                </div>
                            </div>
                        )}

                        <iframe
                            key={`${bookmark.id}-${refreshKey}`}
                            src={isHttpUrl(bookmark.url) ? bookmark.url : 'about:blank'}
                            className="w-full h-full border-0 bg-white"
                            title={`Preview of ${bookmark.title}`}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                            }}
                            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                            referrerPolicy="no-referrer"
                        />

                        {/* Overlay for potential errors */}
                        <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                            <div className="bg-background/90 backdrop-blur border rounded-lg shadow-lg p-3 pointer-events-auto max-w-[200px] text-xs">
                                <p className="mb-2 text-muted-foreground">
                                    {t('preview.error')}
                                </p>
                                <Button size="sm" variant="outline" className="w-full gap-2 cursor-pointer" onClick={() => {
                                    if (isHttpUrl(bookmark.url)) {
                                        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                                    }
                                }}>
                                    <ExternalLink className="h-3 w-3" /> {t('preview.openExternal')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
