import React from 'react';
import {
    Clock,
    ExternalLink,
    RefreshCw,
    Check,
    Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Favicon } from '../Favicon';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { formatReadingTime } from '../../lib/reader-service';

export function ReaderArticleView({
    isLoading,
    error,
    article,
    bookmark,
    prefs,
    fontStyles,
    themeArticleStyles,
    renderedContentHtml,
    loadArticle,
    handleMarkAsRead
}) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-center opacity-70">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <div className="space-y-1">
                    <p className="font-semibold text-sm">{t('reader.loadingText', 'Sayfa temizleniyor ve makale metni çıkartılıyor...')}</p>
                    <p className="text-xs opacity-75">{t('reader.loadingDesc', 'Reklamlar, menüler ve dikkat dağıtıcı öğeler eleniyor.')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-16 text-center space-y-4">
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm max-w-md mx-auto">
                    {error}
                </div>
                <div className="flex justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadArticle(true)}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {t('common.retry', 'Tekrar Dene')}
                    </Button>
                    {bookmark?.url && (
                        <Button size="sm" variant="default" onClick={() => window.open(bookmark.url, '_blank')}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> {t('preview.openExternal', 'Orijinal Sitede Oku')}
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (!article) return null;

    return (
        <article className={cn("transition-all duration-150", fontStyles[prefs.font] || fontStyles.serif)}>
            {/* Metadata Header */}
            <header className="mb-8 pb-6 border-b border-current/15">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                    {article.title}
                </h1>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs opacity-75">
                    <div className="flex items-center gap-1.5 font-medium">
                        <Favicon url={article.url} className="w-3.5 h-3.5" />
                        <span>{article.siteName || (new URL(article.url).hostname)}</span>
                    </div>

                    {article.byline && (
                        <>
                            <span>•</span>
                            <span>{article.byline}</span>
                        </>
                    )}

                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        {formatReadingTime(article.readingTimeMinutes, t)}
                    </span>

                    <span className="opacity-75">
                        ({article.wordCount} {t('reader.words', 'kelime')})
                    </span>
                </div>
            </header>

            {/* Lead Hero Image */}
            {article.leadImage && (
                <div className="mb-8 overflow-hidden rounded-xl shadow-md max-h-[420px] bg-black/5">
                    <img
                        src={article.leadImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                </div>
            )}

            {/* Article Body */}
            <div
                style={{
                    fontSize: `${prefs.fontSize}px`,
                    lineHeight: prefs.lineHeight === 'relaxed' ? 1.75 : 1.55
                }}
                className={cn(
                    "prose max-w-none break-words",
                    themeArticleStyles[prefs.theme] || themeArticleStyles.light
                )}
                dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
            />

            {/* Article Footer */}
            <footer className="mt-14 pt-6 border-t border-current/15 flex flex-wrap items-center justify-between gap-3 text-xs opacity-75">
                <span>{t('reader.endOfArticle', 'Makalenin sonu')}</span>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleMarkAsRead}
                        className="h-7 text-xs gap-1.5 cursor-pointer"
                    >
                        <Check className="w-3 h-3" />
                        <span>{t('reader.markAsRead', 'Okundu Olarak İşaretle')}</span>
                    </Button>
                </div>
            </footer>
        </article>
    );
}
