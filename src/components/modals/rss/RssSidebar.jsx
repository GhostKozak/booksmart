import React from 'react';
import { Rss, Plus, Loader2, Upload, Download, Trash2 } from 'lucide-react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Favicon } from '../../Favicon';
import { cn } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

export function RssSidebar({
    feeds,
    selectedFeedUrl,
    setSelectedFeedUrl,
    totalUnreadCount,
    newFeedUrl,
    setNewFeedUrl,
    isAddingFeed,
    handleAddFeed,
    handleUnsubscribe,
    handleExportOpml,
    handleImportOpml,
    opmlInputRef
}) {
    const { t } = useTranslation();

    return (
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
    );
}
