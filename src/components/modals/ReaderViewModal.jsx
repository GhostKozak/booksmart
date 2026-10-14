import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { db } from '../../db/schema';
import {
    fetchAndExtractArticle,
    getReaderPreferences,
    setReaderPreferences,
    formatReadingTime
} from '../../lib/reader-service';
import {
    getHighlightsForBookmark,
    addHighlight,
    applyHighlightsToHtml
} from '../../lib/highlight-service';
import {
    saveSnapshot,
    getSnapshot
} from '../../lib/snapshot-service';
import { HighlightSelectionMenu } from '../reader/HighlightSelectionMenu';
import { ReaderHighlightsSidebar } from '../reader/ReaderHighlightsSidebar';
import { ReaderTopBar } from '../reader/ReaderTopBar';
import { ReaderArticleView } from '../reader/ReaderArticleView';
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

    // ── Highlights & Annotations State ──
    const [highlights, setHighlights] = useState([]);
    const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState(null);

    // ── Offline Snapshot State ──
    const [isSnapshotSaved, setIsSnapshotSaved] = useState(false);
    const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

    const loadHighlights = useCallback(async () => {
        if (!bookmark) return;
        const list = await getHighlightsForBookmark(bookmark.id, bookmark.url);
        setHighlights(list || []);
    }, [bookmark]);

    useEffect(() => {
        let isMounted = true;
        if (!isOpen || !bookmark) {
            return;
        }

        getHighlightsForBookmark(bookmark.id, bookmark.url).then(list => {
            if (isMounted) {
                setHighlights(list || []);
            }
        });

        getSnapshot(bookmark.url, bookmark.id).then(snap => {
            if (isMounted) {
                setIsSnapshotSaved(!!snap);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [isOpen, bookmark]);

    const handleToggleSnapshot = async () => {
        if (!bookmark || !article) return;
        setIsSavingSnapshot(true);
        try {
            const saved = await saveSnapshot({
                bookmarkId: bookmark.id,
                url: bookmark.url,
                title: article.title,
                html: article.contentHtml,
                textContent: article.textContent
            });
            if (saved) {
                setIsSnapshotSaved(true);
                toast.success(t('snapshots.savedSuccess', "Sayfa çevrimdışı IndexedDB'ye arşivlendi!"));
            }
        } catch {
            toast.error(t('common.error', 'Hata'));
        } finally {
            setIsSavingSnapshot(false);
        }
    };

    const handleCreateHighlight = async ({ text, color, note }) => {
        if (!text || !bookmark) return;
        const created = await addHighlight({
            bookmarkId: bookmark.id,
            url: bookmark.url,
            text,
            color,
            note
        });
        if (created) {
            setHighlights(prev => [...prev, created]);
            toast.success(t('reader.highlights.savedSuccess', 'Vurgu kaydedildi!'));
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
        }
    };

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !contentRef.current) {
            setSelectionMenu(null);
            return;
        }

        const selectedText = selection.toString().trim();
        if (selectedText.length < 2) {
            setSelectionMenu(null);
            return;
        }

        // Ensure selection is inside the article container
        if (!contentRef.current.contains(selection.anchorNode)) {
            setSelectionMenu(null);
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                setSelectionMenu({
                    position: {
                        top: rect.top,
                        left: rect.left + rect.width / 2
                    },
                    text: selectedText
                });
            }
        } catch {
            setSelectionMenu(null);
        }
    }, []);

    const scrollToHighlight = (highlightId) => {
        if (!contentRef.current) return;
        const mark = contentRef.current.querySelector(`[data-highlight-id="${highlightId}"]`);
        if (mark) {
            mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mark.classList.add('animate-pulse');
            setTimeout(() => mark.classList.remove('animate-pulse'), 2000);
        }
    };

    const articleContentHtml = article?.contentHtml;
    const renderedContentHtml = useMemo(() => {
        if (!articleContentHtml) return '';
        return applyHighlightsToHtml(articleContentHtml, highlights);
    }, [articleContentHtml, highlights]);

    const handleArticleClick = (e) => {
        const mark = e.target.closest('[data-highlight-id]');
        if (mark) {
            setShowHighlightsSidebar(true);
        }
    };

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
                <ReaderTopBar
                    article={article}
                    bookmark={bookmark}
                    prefs={prefs}
                    updatePrefs={updatePrefs}
                    isLoading={isLoading}
                    loadArticle={loadArticle}
                    handleMarkAsRead={handleMarkAsRead}
                    handleAppendToNote={handleAppendToNote}
                    handleCopyText={handleCopyText}
                    hasCopied={hasCopied}
                    showHighlightsSidebar={showHighlightsSidebar}
                    setShowHighlightsSidebar={setShowHighlightsSidebar}
                    highlightsCount={highlights.length}
                    handleToggleSnapshot={handleToggleSnapshot}
                    isSavingSnapshot={isSavingSnapshot}
                    isSnapshotSaved={isSnapshotSaved}
                    onClose={onClose}
                />

                {/* ── Article Content Area & Highlights Sidebar ── */}
                <div className="flex-1 flex overflow-hidden relative">
                    <main
                        ref={contentRef}
                        onScroll={handleScroll}
                        onMouseUp={handleTextSelection}
                        onTouchEnd={handleTextSelection}
                        onClick={handleArticleClick}
                        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 selection:bg-amber-500/25 relative"
                    >
                        <div className="max-w-2xl mx-auto">
                            <ReaderArticleView
                                isLoading={isLoading}
                                error={error}
                                article={article}
                                bookmark={bookmark}
                                prefs={prefs}
                                fontStyles={fontStyles}
                                themeArticleStyles={themeArticleStyles}
                                renderedContentHtml={renderedContentHtml}
                                loadArticle={loadArticle}
                                handleMarkAsRead={handleMarkAsRead}
                            />
                        </div>
                    </main>

                    {showHighlightsSidebar && (
                        <ReaderHighlightsSidebar
                            isOpen={showHighlightsSidebar}
                            onClose={() => setShowHighlightsSidebar(false)}
                            bookmark={bookmark}
                            highlights={highlights}
                            onRefreshHighlights={loadHighlights}
                            onScrollToHighlight={scrollToHighlight}
                        />
                    )}
                </div>

                {selectionMenu && (
                    <HighlightSelectionMenu
                        position={selectionMenu.position}
                        selectedText={selectionMenu.text}
                        onHighlight={handleCreateHighlight}
                        onClose={() => setSelectionMenu(null)}
                    />
                )}
            </div>
        </div>
    );
}
