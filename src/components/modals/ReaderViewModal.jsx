import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    BookOpen,
    Clock,
    ExternalLink,
    RefreshCw,
    Check,
    Copy,
    StickyNote,
    Type,
    Minus,
    Plus,
    Loader2,
    Share2,
    BookmarkCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { Favicon } from '../Favicon';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { db } from '../../db/schema';
import {
    fetchAndExtractArticle,
    getReaderPreferences,
    setReaderPreferences,
    formatReadingTime
} from '../../lib/reader-service';
import { toast } from 'sonner';

export function ReaderViewModal({ isOpen, onClose, bookmark }) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [article, setArticle] = useState(null);
    const [error, setError] = useState(null);
    const [hasCopied, setHasCopied] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);

    const [prefs, setPrefsState] = useState(() => getReaderPreferences());
    const contentRef = useRef(null);

    const updatePrefs = useCallback((newPartial) => {
        setPrefsState(prev => {
            const next = { ...prev, ...newPartial };
            setReaderPreferences(next);
            return next;
        });
    }, []);

    const loadArticle = useCallback(async (force = false) => {
        if (!bookmark?.url) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetchAndExtractArticle(bookmark.url, {
                bookmarkId: bookmark.id,
                forceRefresh: force
            });
            setArticle(res);
        } catch (err) {
            console.error('Failed to load article:', err);
            setError(err.message || 'Makale içeriği yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    }, [bookmark]);

    useEffect(() => {
        let isMounted = true;
        if (!isOpen || !bookmark?.url) {
            return;
        }

        fetchAndExtractArticle(bookmark.url, {
            bookmarkId: bookmark.id,
            forceRefresh: false
        }).then(res => {
            if (isMounted) {
                setArticle(res);
                setIsLoading(false);
            }
        }).catch(err => {
            if (isMounted) {
                console.error('Failed to load article:', err);
                setError(err.message || 'Makale içeriği yüklenemedi');
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [isOpen, bookmark]);

    // Handle scroll progress
    const handleScroll = (e) => {
        const el = e.currentTarget;
        const total = el.scrollHeight - el.clientHeight;
        if (total > 0) {
            const current = el.scrollTop;
            const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
            setScrollProgress(pct);
        }
    };

    // Keyboard navigation (Escape to close)
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    const handleCopyText = () => {
        if (!article?.textContent) return;
        navigator.clipboard.writeText(`${article.title}\n\n${article.textContent}`);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        toast.success(t('reader.copiedToClipboard', 'Makale metni panoya kopyalandı'));
    };

    const handleAppendToNote = async () => {
        if (!bookmark?.id || !article) return;
        const summarySnippet = article.textContent.slice(0, 450) + '...';
        const noteText = bookmark.note
            ? `${bookmark.note}\n\n---\n**Okuma Özeti (${formatReadingTime(article.readingTimeMinutes, t)}):**\n${summarySnippet}`
            : `**Okuma Özeti (${formatReadingTime(article.readingTimeMinutes, t)}):**\n${summarySnippet}`;

        await db.bookmarks.update(bookmark.id, { note: noteText });
        toast.success(t('preview.appendedToNotes', 'Notlara eklendi'));
    };

    const handleMarkAsRead = async () => {
        if (!bookmark?.id) return;
        const currentTags = bookmark.tags || [];
        if (!currentTags.includes('read')) {
            await db.bookmarks.update(bookmark.id, {
                tags: [...currentTags, 'read']
            });
            toast.success(t('reader.markedAsRead', 'Okundu olarak işaretlendi'));
        } else {
            toast.info(t('reader.alreadyMarkedRead', 'Zaten okundu olarak işaretli'));
        }
    };

    if (!isOpen) return null;

    // Theme styles
    const themeStyles = {
        light: 'bg-white text-stone-900 border-stone-200',
        sepia: 'bg-[#fbf0d9] text-[#43302b] border-[#e6d7ba]',
        dark: 'bg-[#18181b] text-[#f4f4f5] border-zinc-800'
    };

    const themeArticleStyles = {
        light: 'prose-stone prose-headings:text-stone-900 prose-a:text-blue-600',
        sepia: 'prose-[#43302b] prose-headings:text-[#2b1f1c] prose-a:text-[#8a4b2d]',
        dark: 'prose-invert prose-headings:text-zinc-100 prose-a:text-sky-400'
    };

    const fontStyles = {
        serif: 'font-serif',
        sans: 'font-sans',
        mono: 'font-mono'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

            <div
                className={cn(
                    "relative w-full max-w-4xl h-[94vh] mx-3 sm:mx-6 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors border",
                    themeStyles[prefs.theme] || themeStyles.light
                )}
                role="dialog"
                aria-modal="true"
                aria-label={article?.title || 'Reader View'}
            >
                {/* ── Top Reading Progress Bar ── */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 z-30">
                    <div
                        className="h-full bg-amber-500 transition-all duration-150 ease-out"
                        style={{ width: `${scrollProgress}%` }}
                    />
                </div>

                {/* ── Reader Top Bar Controls ── */}
                <header className="px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 z-20 backdrop-blur-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 truncate">
                            <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="hidden sm:inline font-semibold">{t('reader.modeTitle', 'Okuma Modu')}</span>
                            {article && (
                                <>
                                    <span className="hidden sm:inline opacity-50">•</span>
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px] shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {formatReadingTime(article.readingTimeMinutes, t)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Typography & Actions Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Font Size Selector */}
                        <div className="flex items-center border rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updatePrefs({ fontSize: Math.max(14, prefs.fontSize - 1) })}
                                disabled={prefs.fontSize <= 14}
                                className="h-7 w-7 rounded-none cursor-pointer"
                                title={t('reader.smallerFont', 'Yazı Boyutunu Küçült')}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                            <span className="px-1.5 text-xs font-mono font-medium">{prefs.fontSize}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updatePrefs({ fontSize: Math.min(26, prefs.fontSize + 1) })}
                                disabled={prefs.fontSize >= 26}
                                className="h-7 w-7 rounded-none cursor-pointer"
                                title={t('reader.largerFont', 'Yazı Boyutunu Büyüt')}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>

                        {/* Font Family Selector */}
                        <div className="flex items-center border rounded-lg p-0.5 bg-black/5 dark:bg-white/5 text-xs">
                            <button
                                type="button"
                                onClick={() => updatePrefs({ font: 'serif' })}
                                className={cn(
                                    "px-2 py-1 rounded font-serif transition-colors cursor-pointer",
                                    prefs.font === 'serif' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                                )}
                            >
                                Serif
                            </button>
                            <button
                                type="button"
                                onClick={() => updatePrefs({ font: 'sans' })}
                                className={cn(
                                    "px-2 py-1 rounded font-sans transition-colors cursor-pointer",
                                    prefs.font === 'sans' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                                )}
                            >
                                Sans
                            </button>
                            <button
                                type="button"
                                onClick={() => updatePrefs({ font: 'mono' })}
                                className={cn(
                                    "px-2 py-1 rounded font-mono transition-colors cursor-pointer",
                                    prefs.font === 'mono' ? "bg-background shadow-xs font-bold" : "opacity-70 hover:opacity-100"
                                )}
                            >
                                Mono
                            </button>
                        </div>

                        {/* Theme Switcher */}
                        <div className="flex items-center border rounded-lg p-0.5 bg-black/5 dark:bg-white/5 text-xs">
                            <button
                                type="button"
                                onClick={() => updatePrefs({ theme: 'light' })}
                                className={cn(
                                    "w-5 h-5 rounded-full bg-white border border-stone-300 transition-transform cursor-pointer",
                                    prefs.theme === 'light' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                                )}
                                title={t('reader.lightTheme', 'Açık')}
                            />
                            <button
                                type="button"
                                onClick={() => updatePrefs({ theme: 'sepia' })}
                                className={cn(
                                    "w-5 h-5 rounded-full bg-[#fbf0d9] border border-[#d9c49a] ml-1 transition-transform cursor-pointer",
                                    prefs.theme === 'sepia' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                                )}
                                title={t('reader.sepiaTheme', 'Sepya')}
                            />
                            <button
                                type="button"
                                onClick={() => updatePrefs({ theme: 'dark' })}
                                className={cn(
                                    "w-5 h-5 rounded-full bg-[#18181b] border border-zinc-700 ml-1 transition-transform cursor-pointer",
                                    prefs.theme === 'dark' ? "scale-110 ring-2 ring-amber-500" : "opacity-70"
                                )}
                                title={t('reader.darkTheme', 'Koyu')}
                            />
                        </div>

                        {/* Quick Action Buttons */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => loadArticle(true)}
                            disabled={isLoading}
                            className="h-8 w-8 cursor-pointer"
                            title={t('reader.reloadArticle', 'Yeniden Yükle')}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-amber-500")} />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleMarkAsRead}
                            className="h-8 w-8 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                            title={t('reader.markAsRead', 'Okundu Olarak İşaretle')}
                        >
                            <BookmarkCheck className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleAppendToNote}
                            className="h-8 w-8 cursor-pointer"
                            title={t('preview.addToNote', 'Notlara Ekle')}
                        >
                            <StickyNote className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyText}
                            className="h-8 w-8 cursor-pointer"
                            title={t('reader.copyText', 'Metni Kopyala')}
                        >
                            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>

                        {bookmark?.url && (
                            <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-colors"
                                title={t('preview.openExternal', 'Orijinal Sayfayı Aç')}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-full ml-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                            title={t('common.close', 'Kapat')}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                {/* ── Article Content Area ── */}
                <main
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 selection:bg-amber-500/25"
                >
                    <div className="max-w-2xl mx-auto">
                        {isLoading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-3 text-center opacity-70">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">{t('reader.loadingText', 'Sayfa temizleniyor ve makale metni çıkartılıyor...')}</p>
                                    <p className="text-xs opacity-75">{t('reader.loadingDesc', 'Reklamlar, menüler ve dikkat dağıtıcı öğeler eleniyor.')}</p>
                                </div>
                            </div>
                        ) : error ? (
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
                        ) : article ? (
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
                                    dangerouslySetInnerHTML={{ __html: article.contentHtml }}
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
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    );
}
