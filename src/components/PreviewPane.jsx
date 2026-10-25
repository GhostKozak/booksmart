import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ExternalLink, RefreshCw, StickyNote, Wand2, Loader2, Globe, Image, BookOpen } from 'lucide-react';
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
    setAutoSummarizeEnabled,
    isLocalAIProvider
} from '../lib/key-vault';
import { useBookmarkPreview } from '../lib/metadata-fetcher';
import { Favicon } from './Favicon';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../store/useAppStore';
import { subscribeToFeed, unsubscribeFeed } from '../lib/rss-service';
import { formatReadingTime } from '../lib/reader-service';
import { PreviewPaneHeader } from './preview/PreviewPaneHeader';
import { PreviewAISummaryCard } from './preview/PreviewAISummaryCard';
import { PreviewRssCard } from './preview/PreviewRssCard';
import { PreviewIframeView } from './preview/PreviewIframeView';

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
        const direct = await db.feeds.where('siteUrl').equals(bookmark.url).first();
        if (direct) return direct;

        // Origin-level match for sub-pages or individual articles of a subscribed site
        try {
            const bookmarkOrigin = new URL(bookmark.url).origin;
            const feeds = await db.feeds.toArray();
            return feeds.find(f => {
                if (!f.siteUrl) return false;
                try {
                    return new URL(f.siteUrl).origin === bookmarkOrigin;
                } catch {
                    return false;
                }
            }) || null;
        } catch {
            return null;
        }
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

        if ((!apiKey && !isLocalAIProvider(provider)) || (hasVault() && !isVaultUnlocked() && !apiKey)) {
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

        if ((!apiKey && !isLocalAIProvider(provider)) || (hasVault() && !isVaultUnlocked() && !apiKey)) {
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
            <PreviewPaneHeader
                bookmark={bookmark}
                onClose={onClose}
                isNoteOpen={isNoteOpen}
                setIsNoteOpen={setIsNoteOpen}
                handleSummarize={handleSummarize}
                isSummarizing={isSummarizing}
                handleReload={handleReload}
                isLoading={isLoading}
            />

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

                    {/* AI One-Sentence Summary Card */}
                    <PreviewAISummaryCard
                        aiSummary={aiSummary}
                        hasCopied={hasCopied}
                        handleCopySummary={handleCopySummary}
                        handleAppendSummaryToNotes={handleAppendSummaryToNotes}
                        handleGenerateOneSentenceSummary={handleGenerateOneSentenceSummary}
                        isSummarizingOneSentence={isSummarizingOneSentence}
                        autoSummarizeEnabled={autoSummarizeEnabled}
                        toggleAutoSummarize={toggleAutoSummarize}
                    />

                    {/* RSS / Newsletter Feed Card */}
                    <PreviewRssCard
                        subscribedFeed={subscribedFeed}
                        isSubscribingFeed={isSubscribingFeed}
                        handleSubscribeFeed={handleSubscribeFeed}
                        handleUnsubscribeFeed={handleUnsubscribeFeed}
                        handleOpenInReader={handleOpenInReader}
                    />

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
                <PreviewIframeView
                    bookmark={bookmark}
                    refreshKey={refreshKey}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    aiSummary={aiSummary}
                    hasCopied={hasCopied}
                    handleCopySummary={handleCopySummary}
                />
            )}
        </div>
    );
}
