import React from 'react';
import { Button } from '../ui/button';
import { Rss, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PreviewRssCard({
    subscribedFeed,
    isSubscribingFeed,
    handleSubscribeFeed,
    handleUnsubscribeFeed,
    handleOpenInReader
}) {
    const { t } = useTranslation();

    return (
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
    );
}
