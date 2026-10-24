import React from 'react';
import { Eye, EyeOff, BookOpen, BookmarkPlus, ExternalLink } from 'lucide-react';
import { Button } from '../../ui/button';
import { Favicon } from '../../Favicon';
import { cn, getRelativeTime } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store/useAppStore';

function getSafeHostname(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function RssArticleCard({
    item,
    onMarkRead,
    onSaveToBookmarks
}) {
    const { t } = useTranslation();
    const isRead = !!item.read;

    return (
        <div
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
                                onMarkRead(item.id, 1);
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
                        onClick={() => onMarkRead(item.id, isRead ? 0 : 1)}
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
                                onMarkRead(item.id, 1);
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
                        onClick={() => onSaveToBookmarks(item)}
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
}
