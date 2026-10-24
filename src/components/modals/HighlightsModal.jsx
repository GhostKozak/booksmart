import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import {
    Highlighter,
    Search,
    RefreshCw,
    Download,
    Copy,
    Trash2,
    ExternalLink,
    StickyNote,
    Filter,
    Check,
    FileText,
    Sparkles
} from 'lucide-react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Favicon } from '../Favicon';
import { cn, getRelativeTime } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import {
    HIGHLIGHT_COLORS,
    deleteHighlight,
    updateHighlight,
    syncExtensionHighlightsToDb,
    exportHighlightsToObsidianMarkdown,
    downloadMarkdownFile
} from '../../lib/highlight-service';
import { toast } from 'sonner';

export function HighlightsModal({ isOpen, onClose }) {
    const { t } = useTranslation();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedColor, setSelectedColor] = useState('all');
    const [onlyWithNotes, setOnlyWithNotes] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteDraft, setNoteDraft] = useState('');

    // Live query for all highlights from Dexie db.highlights
    const rawHighlights = useLiveQuery(
        () => db.highlights ? db.highlights.toArray() : [],
        [],
        []
    );

    // Filter highlights
    const filteredHighlights = useMemo(() => {
        let list = (rawHighlights || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (selectedColor !== 'all') {
            list = list.filter(h => h.color === selectedColor);
        }

        if (onlyWithNotes) {
            list = list.filter(h => h.note && h.note.trim().length > 0);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(h =>
                (h.text && h.text.toLowerCase().includes(q)) ||
                (h.note && h.note.toLowerCase().includes(q)) ||
                (h.url && h.url.toLowerCase().includes(q)) ||
                (h.pageTitle && h.pageTitle.toLowerCase().includes(q))
            );
        }

        return list;
    }, [rawHighlights, selectedColor, onlyWithNotes, searchQuery]);

    // Group highlights by page URL
    const groupedHighlights = useMemo(() => {
        const groups = new Map();
        filteredHighlights.forEach(h => {
            const key = h.url || 'Bilinmeyen Kaynak';
            if (!groups.has(key)) {
                groups.set(key, {
                    url: h.url,
                    pageTitle: h.pageTitle || h.url,
                    items: []
                });
            }
            groups.get(key).items.push(h);
        });
        return Array.from(groups.values());
    }, [filteredHighlights]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncExtensionHighlightsToDb();
            if (res.imported > 0) {
                toast.success(t('highlights.syncSuccess', {
                    count: res.imported,
                    defaultValue: `Eklentiden ${res.imported} yeni vurgu başarıyla içe aktarıldı!`
                }));
            } else if (res.total > 0) {
                toast.info(t('highlights.allSynced', 'Tüm eklenti vurguları zaten güncel.'));
            } else {
                toast.info(t('highlights.noExtensionFound', 'Eklentide henüz kayıtlı vurgu bulunamadı.'));
            }
        } catch {
            toast.error(t('highlights.syncError', 'Eklentiden vurgular alınırken hata oluştu.'));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportObsidian = () => {
        if (filteredHighlights.length === 0) return;
        const md = exportHighlightsToObsidianMarkdown(filteredHighlights, {
            title: 'BookSmart Vurgular ve Notlar',
            includeCallouts: true
        });
        downloadMarkdownFile(md, `booksmart-highlights-${new Date().toISOString().split('T')[0]}.md`);
        toast.success(t('highlights.exportSuccess', 'Obsidian Markdown dosyası indirildi!'));
    };

    const handleCopyMarkdown = async () => {
        if (filteredHighlights.length === 0) return;
        const md = exportHighlightsToObsidianMarkdown(filteredHighlights, {
            title: 'BookSmart Vurgular ve Notlar',
            includeCallouts: true
        });
        try {
            await navigator.clipboard.writeText(md);
            toast.success(t('highlights.copySuccess', 'Vurgular Obsidian formatında panoya kopyalandı!'));
        } catch {
            toast.error(t('highlights.copyError', 'Panoya kopyalanamadı.'));
        }
    };

    const handleDelete = async (id, bookmarkId) => {
        await deleteHighlight(id, bookmarkId);
        toast.success(t('highlights.deleted', 'Vurgu silindi.'));
    };

    const handleSaveNote = async (id) => {
        await updateHighlight(id, { note: noteDraft });
        setEditingNoteId(null);
        toast.success(t('highlights.noteUpdated', 'Not güncellendi.'));
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Highlighter className="w-5 h-5 text-amber-500" />
                    <span>{t('highlights.modalTitle', 'Vurgular & Yapışkan Notlar')}</span>
                    {rawHighlights?.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                            {rawHighlights.length}
                        </span>
                    )}
                </div>
            }
            className="max-w-4xl max-h-[88vh] p-0 flex flex-col overflow-hidden"
        >
            <div className="flex flex-col flex-1 min-h-[500px] h-[75vh] overflow-hidden bg-background">
                {/* ── Top Toolbar ── */}
                <div className="p-3.5 border-b border-border/80 flex flex-wrap items-center justify-between gap-2.5 bg-card/60 backdrop-blur-xs shrink-0">
                    {/* Left: Search input */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('highlights.searchPlaceholder', 'Vurgularda veya notlarda ara...')}
                            className="h-8 pl-8 pr-2.5 text-xs bg-background"
                        />
                    </div>

                    {/* Middle: Color filters */}
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
                        <button
                            type="button"
                            onClick={() => setSelectedColor('all')}
                            className={cn(
                                "px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                selectedColor === 'all'
                                    ? "bg-background text-foreground shadow-2xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('common.all', 'Hepsi')}
                        </button>
                        {HIGHLIGHT_COLORS.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedColor(c.id)}
                                style={{ backgroundColor: c.hex }}
                                className={cn(
                                    "w-5 h-5 rounded-full border border-black/15 transition-transform cursor-pointer flex items-center justify-center",
                                    selectedColor === c.id ? "scale-110 ring-2 ring-primary ring-offset-1" : "hover:scale-105 opacity-80"
                                )}
                                title={c.name}
                            >
                                {selectedColor === c.id && <Check className="w-3 h-3 text-slate-800" />}
                            </button>
                        ))}
                    </div>

                    {/* Right: Notes filter & Sync & Export */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                            variant={onlyWithNotes ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setOnlyWithNotes(!onlyWithNotes)}
                            className={cn("h-8 px-2.5 text-xs cursor-pointer", onlyWithNotes && "bg-amber-500/15 text-amber-600 font-semibold")}
                            title={t('highlights.onlyNotesTooltip', 'Sadece not içeren vurguları göster')}
                        >
                            <StickyNote className="w-3.5 h-3.5 mr-1" />
                            <span>{t('highlights.withNotes', 'Notlular')}</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="h-8 px-2.5 text-xs cursor-pointer gap-1"
                            title={t('highlights.syncFromExtension', 'Eklentiden vurguları eşitle')}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-primary")} />
                            <span className="hidden sm:inline">{t('highlights.syncBtn', 'Eklentiden Eşitle')}</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyMarkdown}
                            disabled={filteredHighlights.length === 0}
                            className="h-8 px-2.5 text-xs cursor-pointer gap-1"
                            title={t('highlights.copyObsidian', 'Obsidian formatında panoya kopyala')}
                        >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('common.copy', 'Kopyala')}</span>
                        </Button>

                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleExportObsidian}
                            disabled={filteredHighlights.length === 0}
                            className="h-8 px-2.5 text-xs cursor-pointer bg-purple-600 hover:bg-purple-700 text-white gap-1"
                            title={t('highlights.exportObsidian', 'Obsidian Markdown (.md) Olarak İndir')}
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('highlights.obsidianExportBtn', 'Obsidian .md')}</span>
                        </Button>
                    </div>
                </div>

                {/* ── Main Content Feed ── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {filteredHighlights.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground my-12">
                            <Highlighter className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <h4 className="font-semibold text-base text-foreground mb-1">
                                {t('highlights.emptyTitle', 'Henüz vurgulanmış metin yok')}
                            </h4>
                            <p className="text-xs max-w-md text-muted-foreground leading-relaxed mb-4">
                                {t('highlights.emptyHelp', 'Tarayıcı eklentisiyle internette gezinirken dilediğiniz metni seçip sağ tıklayarak vurgulayabilir ve sayfa üzerine yapışkan notlar bırakabilirsiniz.')}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="cursor-pointer gap-1.5"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                                <span>{t('highlights.trySync', 'Eklentiyi Tara ve Eşitle')}</span>
                            </Button>
                        </div>
                    ) : (
                        groupedHighlights.map((group) => (
                            <div
                                key={group.url}
                                className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs"
                            >
                                {/* Group Header: Page Title & URL */}
                                <div className="p-3.5 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Favicon url={group.url} className="w-4 h-4 shrink-0" />
                                        <h3 className="font-semibold text-sm text-foreground truncate" title={group.pageTitle}>
                                            {group.pageTitle}
                                        </h3>
                                        <span className="text-xs text-muted-foreground shrink-0 font-normal">
                                            ({group.items.length})
                                        </span>
                                    </div>

                                    <a
                                        href={group.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                                    >
                                        <span className="hidden sm:inline truncate max-w-[200px]">
                                            {group.url.replace(/^https?:\/\//, '')}
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>

                                {/* Highlights in this page */}
                                <div className="p-3.5 space-y-3 divide-y divide-border/40">
                                    {group.items.map((item, idx) => {
                                        const colorCfg = HIGHLIGHT_COLORS.find(c => c.id === item.color) || HIGHLIGHT_COLORS[0];
                                        const isEditingThisNote = editingNoteId === item.id;

                                        return (
                                            <div
                                                key={item.id || idx}
                                                className={cn("flex flex-col gap-2.5", idx > 0 && "pt-3")}
                                            >
                                                {/* Highlight Quote Box */}
                                                <div
                                                    className="p-3 rounded-xl border transition-all text-sm leading-relaxed text-foreground"
                                                    style={{
                                                        backgroundColor: colorCfg.bg,
                                                        borderColor: colorCfg.border
                                                    }}
                                                >
                                                    <span className="font-serif italic font-medium">
                                                        &ldquo;{item.text}&rdquo;
                                                    </span>
                                                </div>

                                                {/* Attached Sticky Note */}
                                                {isEditingThisNote ? (
                                                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl border border-border">
                                                        <Input
                                                            value={noteDraft}
                                                            onChange={(e) => setNoteDraft(e.target.value)}
                                                            placeholder={t('highlights.addNotePlaceholder', 'Not ekleyin veya düzenleyin...')}
                                                            className="text-xs h-7 bg-background"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="sm"
                                                            className="h-7 text-xs px-2.5"
                                                            onClick={() => handleSaveNote(item.id)}
                                                        >
                                                            {t('common.save', 'Kaydet')}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs px-2"
                                                            onClick={() => setEditingNoteId(null)}
                                                        >
                                                            {t('common.cancel', 'İptal')}
                                                        </Button>
                                                    </div>
                                                ) : item.note ? (
                                                    <div
                                                        onClick={() => {
                                                            setEditingNoteId(item.id);
                                                            setNoteDraft(item.note);
                                                        }}
                                                        className="group/note flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-xl text-xs text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-500/15 transition-colors"
                                                        title={t('highlights.clickToEditNote', 'Notu düzenlemek için tıklayın')}
                                                    >
                                                        <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                        <p className="flex-1 whitespace-pre-wrap">{item.note}</p>
                                                    </div>
                                                ) : null}

                                                {/* Footer metadata & actions */}
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-block w-2.5 h-2.5 rounded-full border border-black/10"
                                                            style={{ backgroundColor: colorCfg.hex }}
                                                        />
                                                        <span>{colorCfg.name} vurgu</span>
                                                        <span>•</span>
                                                        <span>{getRelativeTime(Math.floor((item.createdAt || Date.now()) / 1000), t)}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {!item.note && !isEditingThisNote && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingNoteId(item.id);
                                                                    setNoteDraft('');
                                                                }}
                                                                className="text-muted-foreground hover:text-foreground text-[11px] px-1.5 py-0.5 rounded hover:bg-muted cursor-pointer"
                                                            >
                                                                + {t('highlights.addNote', 'Not Ekle')}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item.id, item.bookmarkId)}
                                                            className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 cursor-pointer transition-colors"
                                                            title={t('common.delete', 'Sil')}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </SimpleModal>
    );
}
