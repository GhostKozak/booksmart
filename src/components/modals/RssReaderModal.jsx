import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import {
    Rss,
    RefreshCw,
    CheckCheck,
    Eye,
    Search
} from 'lucide-react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
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
import { RssSidebar } from './rss/RssSidebar';
import { RssArticleCard } from './rss/RssArticleCard';

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
                defaultValue: `Feeds updated. ${res.newItemsTotal} new item(s).`
            }));
        } catch {
            toast.error(t('rss.refreshError', { defaultValue: 'Failed to refresh feeds.' }));
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
                    defaultValue: `"${feed.title}" feed is already saved.`
                }));
            } else {
                toast.success(t('rss.subscribeSuccess', {
                    title: feed.title,
                    defaultValue: `Subscribed to "${feed.title}" feed!`
                }));
            }
            setNewFeedUrl('');
            setSelectedFeedUrl(feed.feedUrl);
        } catch (err) {
            toast.error(err.message || t('rss.subscribeError', { defaultValue: 'Could not find or add feed.' }));
        } finally {
            setIsAddingFeed(false);
        }
    };

    const handleUnsubscribe = async (feedUrl, feedTitle) => {
        if (!confirm(t('rss.confirmUnsubscribe', {
            title: feedTitle,
            defaultValue: `Are you sure you want to remove "${feedTitle}" feed?`
        }))) {
            return;
        }

        try {
            await unsubscribeFeed(feedUrl);
            if (selectedFeedUrl === feedUrl) {
                setSelectedFeedUrl(null);
            }
            toast.success(t('rss.unsubscribeSuccess', { defaultValue: 'Feed removed.' }));
        } catch {
            toast.error(t('rss.unsubscribeError', { defaultValue: 'Failed to remove feed.' }));
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllFeedItemsRead(selectedFeedUrl);
            toast.success(t('rss.markedAllReadSuccess', { defaultValue: 'All marked as read.' }));
        } catch {
            toast.error(t('common.operationFailed', 'Operation failed'));
        }
    };

    const handleSaveToBookmarks = async (item) => {
        try {
            const res = await addFeedItemToBookmarks(item, 'Reading List');
            if (res?.isExisting) {
                toast.info(t('rss.alreadySaved', {
                    defaultValue: `"${item.title.slice(0, 35)}" is already saved in your library.`
                }));
            } else {
                toast.success(t('rss.savedToBookmarks', {
                    title: item.title,
                    defaultValue: `Saved "${item.title.slice(0, 35)}" to bookmarks!`
                }));
            }
        } catch {
            toast.error(t('common.saveFailed', 'Could not be saved'));
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
            toast.success(t('rss.opmlExportSuccess', { defaultValue: 'Exported OPML file.' }));
        } catch {
            toast.error(t('rss.opmlExportError', { defaultValue: 'Failed to export OPML.' }));
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
                defaultValue: `Successfully imported ${res.importedCount} feed(s).`
            }));
        } catch (err) {
            toast.error(err.message || t('rss.opmlImportError', { defaultValue: 'Failed to import OPML.' }));
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
                <RssSidebar
                    feeds={feeds}
                    selectedFeedUrl={selectedFeedUrl}
                    setSelectedFeedUrl={setSelectedFeedUrl}
                    totalUnreadCount={totalUnreadCount}
                    newFeedUrl={newFeedUrl}
                    setNewFeedUrl={setNewFeedUrl}
                    isAddingFeed={isAddingFeed}
                    handleAddFeed={handleAddFeed}
                    handleUnsubscribe={handleUnsubscribe}
                    handleExportOpml={handleExportOpml}
                    handleImportOpml={handleImportOpml}
                    opmlInputRef={opmlInputRef}
                />

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
                            filteredItems.map((item) => (
                                <RssArticleCard
                                    key={item.id || item.link}
                                    item={item}
                                    onMarkRead={markFeedItemRead}
                                    onSaveToBookmarks={handleSaveToBookmarks}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </SimpleModal>
    );
}
