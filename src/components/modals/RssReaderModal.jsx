import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import {
    Rss,
    RefreshCw,
    CheckCheck,
    BookmarkPlus,
    Trash2,
    ExternalLink,
    Plus,
    Loader2,
    Eye,
    EyeOff,
    Search,
    BookOpen,
    Upload,
    Download
} from 'lucide-react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Favicon } from '../Favicon';
import { cn, getRelativeTime } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import {
    refreshAllFeeds,
    subscribeToFeed,
    unsubscribeFeed,
    markFeedItemRead,
    markAllFeedItemsRead,
    addFeedItemToBookmarks,
    exportFeedsToOpml,
    importFeedsFromOpml
} from '../../lib/rss-service';
import { toast } from 'sonner';

/**
 * Safely extracts hostname from a URL without throwing on malformed or relative inputs.
 */
function getSafeHostname(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function RssReaderModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { selectedFeedUrl, setSelectedFeedUrl } = useAppStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddingFeed, setIsAddingFeed] = useState(false);
    const [newFeedUrl, setNewFeedUrl] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [onlyUnread, setOnlyUnread] = useState(false);
    const opmlInputRef = useRef(null);

    // Live query for feeds and items with default empty array
    const feeds = useLiveQuery(() => db.feeds.toArray(), [], []);

    // Query items and always sort newest-to-oldest in JavaScript
    const rawItems = useLiveQuery(async () => {
        let items = [];
        if (selectedFeedUrl) {
            items = await db.feedItems
                .where('feedUrl')
                .equals(selectedFeedUrl)
                .toArray();
        } else {
            items = await db.feedItems.toArray();
        }
        return items.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
    }, [selectedFeedUrl], []);

    const totalUnreadCount = useMemo(() => {
        return feeds.reduce((acc, f) => acc + (f.unreadCount || 0), 0);
    }, [feeds]);

    const filteredItems = useMemo(() => {
        let list = rawItems || [];
        if (onlyUnread) {
            list = list.filter(item => !item.read);
        }
        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase();
            list = list.filter(item =>
                (item.title && item.title.toLowerCase().includes(q)) ||
                (item.summary && item.summary.toLowerCase().includes(q)) ||
                (item.author && item.author.toLowerCase().includes(q))
            );
        }
        return list;
    }, [rawItems, onlyUnread, searchFilter]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // silent: true prevents duplicate toast between service and modal
            const res = await refreshAllFeeds({ silent: true });
            toast.success(t('rss.refreshedSuccess', {
                count: res.newItemsTotal,
                defaultValue: `Akışlar güncellendi. ${res.newItemsTotal} yeni yazı.`
            }));
        } catch {
            toast.error(t('rss.refreshError', { defaultValue: 'Akışlar güncellenirken hata oluştu.' }));
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddFeed = async (e) => {
        e.preventDefault();
        if (!newFeedUrl.trim()) return;

        setIsAddingFeed(true);
        try {
            const { feed, isExisting } = await subscribeToFeed(null, newFeedUrl.trim());
            if (isExisting) {
                toast.info(t('rss.alreadySubscribed', {
                    defaultValue: `"${feed.title}" akışı zaten kayıtlı.`
                }));
            } else {
                toast.success(t('rss.subscribeSuccess', {
                    title: feed.title,
                    defaultValue: `"${feed.title}" akışına abone olundu!`
                }));
            }
            setNewFeedUrl('');
            setSelectedFeedUrl(feed.feedUrl);
        } catch (err) {
            toast.error(err.message || t('rss.subscribeError', { defaultValue: 'Akış bulunamadı veya eklenemedi.' }));
        } finally {
            setIsAddingFeed(false);
        }
    };

    const handleUnsubscribe = async (feedUrl, feedTitle) => {
        if (!confirm(t('rss.confirmUnsubscribe', {
            title: feedTitle,
            defaultValue: `"${feedTitle}" akışını kaldırmak istediğinize emin misiniz?`
        }))) {
            return;
        }

        try {
            await unsubscribeFeed(feedUrl);
            if (selectedFeedUrl === feedUrl) {
                setSelectedFeedUrl(null);
            }
            toast.success(t('rss.unsubscribeSuccess', { defaultValue: 'Akış kaldırıldı.' }));
        } catch {
            toast.error(t('rss.unsubscribeError', { defaultValue: 'Kaldırılamadı.' }));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllFeedItemsRead(selectedFeedUrl);
            toast.success(t('rss.markedAllReadSuccess', { defaultValue: 'Tümü okundu olarak işaretlendi.' }));
        } catch {
            toast.error('İşlem başarısız');
        }
    };

    const handleSaveToBookmarks = async (item) => {
        try {
            const res = await addFeedItemToBookmarks(item, 'Okuma Listesi');
            if (res?.isExisting) {
                toast.info(t('rss.alreadySaved', {
                    defaultValue: `"${item.title.slice(0, 35)}" zaten kütüphanenizde kayıtlı.`
                }));
            } else {
                toast.success(t('rss.savedToBookmarks', {
                    title: item.title,
                    defaultValue: `"${item.title.slice(0, 35)}" yer imlerine kaydedildi!`
                }));
            }
        } catch {
            toast.error('Kaydedilemedi');
        }
    };

    const handleExportOpml = async () => {
        try {
            const opml = await exportFeedsToOpml();
            const blob = new Blob([opml], { type: 'text/x-opml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `booksmart-feeds-${new Date().toISOString().slice(0, 10)}.opml`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(t('rss.opmlExportSuccess', { defaultValue: 'OPML dosyası dışa aktarıldı.' }));
        } catch {
            toast.error(t('rss.opmlExportError', { defaultValue: 'OPML dışa aktarma başarısız.' }));
        }
    };

    const handleImportOpml = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAddingFeed(true);
        try {
            const text = await file.text();
            const res = await importFeedsFromOpml(text);
            toast.success(t('rss.opmlImportSuccess', {
                count: res.importedCount,
                defaultValue: `${res.importedCount} akış başarıyla içe aktarıldı.`
            }));
        } catch (err) {
            toast.error(err.message || t('rss.opmlImportError', { defaultValue: 'OPML içe aktarma başarısız.' }));
        } finally {
            setIsAddingFeed(false);
            if (opmlInputRef.current) {
                opmlInputRef.current.value = '';
            }
        }
    };

    const selectedFeed = feeds.find(f => f.feedUrl === selectedFeedUrl);

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Rss className="w-5 h-5 text-amber-500" />
                    <span>{t('rss.readerTitle', 'RSS & Bülten Akışları')}</span>
                    {totalUnreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            {totalUnreadCount} {t('rss.unread', 'okunmamış')}
                        </span>
                    )}
                </div>
            }
            className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
        >
            <div className="flex flex-col md:flex-row flex-1 min-h-[500px] h-[72vh] overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
                {/* ── Left Sidebar: Feeds List ── */}
                <div className="w-full md:w-72 bg-muted/20 flex flex-col shrink-0">
                    {/* Add Feed Input */}
                    <form onSubmit={handleAddFeed} className="p-3 border-b border-border/80 flex gap-1.5">
                        <Input
                            placeholder={t('rss.addInputPlaceholder', 'URL veya Blog adresi...')}
                            value={newFeedUrl}
                            onChange={(e) => setNewFeedUrl(e.target.value)}
                            disabled={isAddingFeed}
                            className="h-8 text-xs bg-background"
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isAddingFeed || !newFeedUrl.trim()}
                            className="h-8 px-2.5 bg-amber-500 hover:bg-amber-600 text-white shrink-0 cursor-pointer"
                            title={t('rss.addFeedBtn', 'Akış Ekle')}
                        >
                            {isAddingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                    </form>

                    {/* All Feeds Toggle & OPML Tools */}
                    <div className="p-2 border-b border-border/50 flex items-center justify-between gap-1">
                        <button
                            type="button"
                            onClick={() => setSelectedFeedUrl(null)}
                            className={cn(
                                "flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                                !selectedFeedUrl
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <Rss className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                <span className="truncate">{t('rss.allFeeds', 'Tüm Akışlar')}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                                {totalUnreadCount}
                            </span>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                            <input
                                type="file"
                                ref={opmlInputRef}
                                onChange={handleImportOpml}
                                accept=".opml,.xml"
                                className="hidden"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => opmlInputRef.current?.click()}
                                title={t('rss.importOpml', 'OPML İçe Aktar')}
                                disabled={isAddingFeed}
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={handleExportOpml}
                                title={t('rss.exportOpml', 'OPML Dışa Aktar')}
                                disabled={feeds.length === 0}
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Subscribed Feeds Scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {feeds.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                <p className="mb-2">{t('rss.noFeedsYet', 'Henüz kayıtlı RSS akışı yok.')}</p>
                                <p className="text-[11px] opacity-75">
                                    {t('rss.noFeedsHelp', 'Favori sitenizin adresini yukarıya yapıştırıp "+" ile ekleyin.')}
                                </p>
                            </div>
                        ) : (
                            feeds.map((feed) => {
                                const isSelected = selectedFeedUrl === feed.feedUrl;
                                return (
                                    <div
                                        key={feed.feedUrl}
                                        className={cn(
                                            "group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer",
                                            isSelected
                                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                        )}
                                        onClick={() => setSelectedFeedUrl(feed.feedUrl)}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                                            <Favicon url={feed.siteUrl || feed.feedUrl} className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate" title={feed.title}>
                                                {feed.title}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {(feed.unreadCount || 0) > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                                                    {feed.unreadCount}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnsubscribe(feed.feedUrl, feed.title);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-opacity"
                                                title={t('rss.unsubscribe', 'Abonelikten Çık')}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Right Content: Articles Feed ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                    {/* Header Controls */}
                    <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 bg-card/60 backdrop-blur-xs shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-semibold text-sm truncate">
                                {selectedFeed ? selectedFeed.title : t('rss.allArticles', 'Tüm Yazılar')}
                            </h4>
                            <span className="text-xs text-muted-foreground shrink-0">
                                ({filteredItems.length})
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder={t('common.search', 'Ara...')}
                                    className="h-7 pl-7 pr-2 text-xs w-28 sm:w-36"
                                />
                            </div>

                            <Button
                                variant={onlyUnread ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setOnlyUnread(!onlyUnread)}
                                className={cn("h-7 px-2 text-xs cursor-pointer", onlyUnread && "bg-amber-500/15 text-amber-600")}
                                title={t('rss.onlyUnread', 'Sadece Okunmamışlar')}
                            >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                <span className="hidden sm:inline">{t('rss.unreadOnly', 'Okunmamış')}</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllRead}
                                disabled={filteredItems.length === 0}
                                className="h-7 px-2 text-xs cursor-pointer"
                                title={t('rss.markAllRead', 'Tümünü Okundu Say')}
                            >
                                <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                                <span className="hidden sm:inline">{t('rss.markAllRead', 'Tümünü Okundu Say')}</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="h-7 px-2 text-xs cursor-pointer"
                                title={t('rss.refreshAll', 'Akışları Güncelle')}
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-amber-500")} />
                            </Button>
                        </div>
                    </div>

                    {/* Articles Scrollable Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <Rss className="w-10 h-10 text-muted-foreground/40 mb-3" />
                                <h5 className="font-medium text-sm text-foreground mb-1">
                                    {t('rss.noArticlesTitle', 'Gösterilecek yazı yok')}
                                </h5>
                                <p className="text-xs max-w-sm">
                                    {onlyUnread
                                        ? t('rss.noUnreadArticles', 'Tüm yazılarınızı okudunuz! Harika bir iş.')
                                        : t('rss.refreshPrompt', 'Yeni içerikleri denetlemek için yukarıdaki yenile düğmesine basabilirsiniz.')}
                                </p>
                            </div>
                        ) : (
                            filteredItems.map((item) => {
                                const isRead = !!item.read;
                                return (
                                    <div
                                        key={item.id || item.link}
                                        className={cn(
                                            "p-3.5 rounded-xl border transition-all hover:border-primary/40 flex flex-col gap-2 group",
                                            isRead
                                                ? "bg-card/40 opacity-75 border-border/60"
                                                : "bg-card border-border shadow-2xs font-normal"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                                                    <Favicon url={item.link} className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="font-medium truncate max-w-[160px]">
                                                        {item.author || getSafeHostname(item.link) || 'Web'}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{getRelativeTime(Math.floor(item.pubDate / 1000), t)}</span>
                                                    {!isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-1" />
                                                    )}
                                                </div>

                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => {
                                                        if (!isRead && item.id) {
                                                            markFeedItemRead(item.id, 1);
                                                        }
                                                    }}
                                                    className="font-semibold text-sm sm:text-base text-foreground hover:text-primary transition-colors block line-clamp-2 leading-snug"
                                                >
                                                    {item.title}
                                                </a>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    onClick={() => markFeedItemRead(item.id, isRead ? 0 : 1)}
                                                    title={isRead ? t('rss.markUnread', 'Okunmadı Yap') : t('rss.markRead', 'Okundu Yap')}
                                                >
                                                    {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-primary/80 hover:text-primary hover:bg-primary/10 cursor-pointer"
                                                    onClick={() => {
                                                        if (!isRead && item.id) {
                                                            markFeedItemRead(item.id, 1);
                                                        }
                                                        useAppStore.getState().openReaderMode({ id: item.id, title: item.title, url: item.link });
                                                    }}
                                                    title={t('reader.openReaderMode', 'Okuma Modunu Aç')}
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 cursor-pointer"
                                                    onClick={() => handleSaveToBookmarks(item)}
                                                    title={t('rss.addToBookmarks', 'BookSmart Yer İmlerine Ekle')}
                                                >
                                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                                </Button>

                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                                    title={t('common.openInNewTab', 'Yeni Sekmede Aç')}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </div>

                                        {item.summary && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {item.summary}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </SimpleModal>
    );
}
