import React, { useState } from 'react';
import {
    HIGHLIGHT_COLORS,
    updateHighlight,
    deleteHighlight,
    exportHighlightsToMarkdown
} from '../../lib/highlight-service';
import {
    X,
    Trash2,
    Copy,
    Check,
    MessageSquare,
    Highlighter,
    FileText,
    ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function ReaderHighlightsSidebar({
    isOpen,
    onClose,
    bookmark,
    highlights = [],
    onRefreshHighlights,
    onScrollToHighlight
}) {
    const { t } = useTranslation();
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [copiedAll, setCopiedAll] = useState(false);

    if (!isOpen) return null;

    const handleSaveNote = async (highlightId) => {
        await updateHighlight(highlightId, { note: noteDraft });
        setEditingNoteId(null);
        setNoteDraft('');
        onRefreshHighlights();
        toast.success(t('reader.highlights.noteSaved', 'Not kaydedildi'));
    };

    const handleDelete = async (highlightId) => {
        await deleteHighlight(highlightId, bookmark?.id);
        onRefreshHighlights();
        toast.success(t('reader.highlights.deleted', 'Vurgu silindi'));
    };

    const handleChangeColor = async (highlightId, colorId) => {
        await updateHighlight(highlightId, { color: colorId });
        onRefreshHighlights();
    };

    const handleCopyAll = async () => {
        const md = exportHighlightsToMarkdown(bookmark, highlights);
        if (!md) return;
        try {
            await navigator.clipboard.writeText(md);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
            toast.success(t('reader.highlights.allCopied', 'All highlights copied as Markdown!'));
        } catch {
            toast.error(t('common.error', 'Failed to copy'));
        }
    };

    return (
        <aside
            aria-label={t('reader.highlights.title', 'Highlights & Notes')}
            className="w-80 sm:w-88 border-l bg-card flex flex-col h-full z-20 shadow-xl transition-all duration-300 animate-in slide-in-from-right-4"
        >
            {/* Header */}
            <div className="p-3.5 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Highlighter className="w-4 h-4" />
                    </span>
                    <div>
                        <h3 className="font-semibold text-xs leading-tight">
                            {t('reader.highlights.title', 'Highlights & Notes')}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            {highlights.length} {t('reader.highlights.countSuffix', 'highlight(s)')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {highlights.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyAll}
                            className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                            title={t('reader.highlights.copyAllMarkdown', 'Copy All as Markdown')}
                        >
                            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-7 w-7 rounded-full cursor-pointer hover:bg-muted"
                        title={t('common.close', 'Kapat')}
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {highlights.length === 0 ? (
                    <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
                        <FileText className="w-8 h-8 mx-auto opacity-30" />
                        <p className="text-xs font-medium">
                            {t('reader.highlights.emptyTitle', 'No highlights yet')}
                        </p>
                        <p className="text-[11px] opacity-75 leading-relaxed">
                            {t('reader.highlights.emptyDesc', 'Select any text in the article to highlight in color and add margin notes.')}
                        </p>
                    </div>
                ) : (
                    highlights.map((h) => {
                        const colorObj = HIGHLIGHT_COLORS.find(c => c.id === h.color) || HIGHLIGHT_COLORS[0];
                        const isEditing = editingNoteId === h.id;

                        return (
                            <div
                                key={h.id}
                                className="group relative rounded-xl border bg-muted/20 p-2.5 text-xs space-y-2 transition-all hover:bg-muted/40 hover:border-border"
                            >
                                {/* Quote Text */}
                                <div
                                    onClick={() => onScrollToHighlight && onScrollToHighlight(h.id)}
                                    className="cursor-pointer border-l-3 pl-2 leading-relaxed text-foreground select-none hover:opacity-85 transition-opacity"
                                    style={{ borderColor: colorObj.border }}
                                    title={t('reader.highlights.scrollTo', 'Scroll to in article')}
                                >
                                    <p className="italic text-[11.5px] line-clamp-4">
                                        "{h.text}"
                                    </p>
                                </div>

                                {/* Note / Annotation Section */}
                                {isEditing ? (
                                    <div className="space-y-1.5 pt-1">
                                        <textarea
                                            value={noteDraft}
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                            placeholder={t('reader.highlights.notePlaceholder', 'Write your note...')}
                                            rows={2}
                                            autoFocus
                                            className="w-full text-xs p-1.5 rounded-lg border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden resize-none"
                                        />
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingNoteId(null);
                                                    setNoteDraft('');
                                                }}
                                                className="h-6 text-[11px] px-2"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleSaveNote(h.id)}
                                                className="h-6 text-[11px] px-2.5 bg-primary text-primary-foreground gap-1"
                                            >
                                                <Check className="w-3 h-3" />
                                                <span>{t('common.save', 'Kaydet')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : h.note ? (
                                    <div
                                        onClick={() => {
                                            setEditingNoteId(h.id);
                                            setNoteDraft(h.note);
                                        }}
                                        className="p-2 rounded-lg bg-background border text-[11px] text-foreground/90 cursor-pointer hover:border-primary/50 transition-colors flex items-start gap-1.5"
                                        title={t('common.edit', 'Düzenle')}
                                    >
                                        <MessageSquare className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                                        <span className="leading-snug">{h.note}</span>
                                    </div>
                                ) : null}

                                {/* Card Actions Footer */}
                                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                                    {/* Color Picker Buttons */}
                                    <div className="flex items-center gap-1">
                                        {HIGHLIGHT_COLORS.map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => handleChangeColor(h.id, c.id)}
                                                className={cn(
                                                    "w-3.5 h-3.5 rounded-full cursor-pointer transition-transform hover:scale-125 border border-black/10 dark:border-white/10",
                                                    h.color === c.id ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-60"
                                                )}
                                                style={{ backgroundColor: c.hex }}
                                                title={t(c.nameKey, c.name)}
                                            />
                                        ))}
                                    </div>

                                    {/* Edit Note & Delete buttons */}
                                    <div className="flex items-center gap-1">
                                        {!isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingNoteId(h.id);
                                                    setNoteDraft(h.note || '');
                                                }}
                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                title={h.note ? t('reader.highlights.editNote', 'Notu Düzenle') : t('reader.highlights.addNote', 'Not Ekle')}
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(h.id)}
                                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                            title={t('common.delete', 'Sil')}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}
