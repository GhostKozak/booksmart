import { useState, useMemo, useEffect } from 'react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { generateCollectionHubHtml } from '../../lib/collection-hub-generator';
import { db } from '../../db';
import {
    LayoutGrid,
    List,
    Layers,
    Download,
    ExternalLink,
    Copy,
    Check,
    Smartphone,
    Monitor,
    Sparkles,
    Github,
    ChevronDown,
    ChevronUp,
    FileText,
    Share2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const COLOR_PRESETS = [
    { name: 'Indigo', color: '#6366f1' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Sky', color: '#0ea5e9' },
    { name: 'Slate', color: '#475569' }
];

export function ShareCollectionModal({ isOpen, collection, onClose }) {
    const { t } = useTranslation();
    const [bookmarks, setBookmarks] = useState([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(true);

    // Hub Customization State
    const [layout, setLayout] = useState('bento'); // 'bento' | 'linktree' | 'cards'
    const [accentColor, setAccentColor] = useState(collection?.color || '#6366f1');
    const [bio, setBio] = useState('');
    const [author, setAuthor] = useState('');
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
    const [showGithubGuide, setShowGithubGuide] = useState(false);
    const [copiedHtml, setCopiedHtml] = useState(false);

    // Fetch bookmarks for this collection
    useEffect(() => {
        if (!isOpen || !collection?.id) {
            return;
        }
        let isMounted = true;

        db.bookmarks
            .where('collections')
            .equals(collection.id)
            .toArray()
            .then((list) => {
                if (isMounted) {
                    setBookmarks(list || []);
                    setAccentColor(collection.color || '#6366f1');
                    setLoadingBookmarks(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load collection bookmarks:', err);
                if (isMounted) setLoadingBookmarks(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, collection]);

    // Generate standalone HTML
    const generatedHtml = useMemo(() => {
        if (!collection) return '';
        return generateCollectionHubHtml(collection, bookmarks, {
            layout,
            accentColor,
            bio,
            author,
            includeSearch: true,
            defaultTheme: 'auto'
        });
    }, [collection, bookmarks, layout, accentColor, bio, author]);

    if (!isOpen || !collection) return null;

    const handleOpenLivePreview = () => {
        if (!generatedHtml) return;
        const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const handleDownloadHtml = () => {
        if (!generatedHtml) return;
        const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `index.html`; // default index.html for ready GitHub Pages drop-in
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('collections.hub.downloadSuccess', '"index.html" olarak indirildi! GitHub Pages için hazır.'));
    };

    const handleCopyHtml = async () => {
        if (!generatedHtml) return;
        try {
            await navigator.clipboard.writeText(generatedHtml);
            setCopiedHtml(true);
            toast.success(t('collections.hub.copiedHtml', 'HTML kodu panoya kopyalandı!'));
            setTimeout(() => setCopiedHtml(false), 2000);
        } catch {
            toast.error(t('common.error', 'Kopyalanamadı'));
        }
    };

    const handleCopyMarkdown = async () => {
        let output = `# ${collection.icon} ${collection.name}\n\n`;
        if (bio) output += `> ${bio}\n\n`;
        bookmarks.forEach((b) => {
            const title = b.title || b.url;
            output += `- [${title}](${b.url})\n`;
        });
        output += `\n---\n*Curated with BookSmart • ${bookmarks.length} links*\n`;
        await navigator.clipboard.writeText(output);
        toast.success(t('collections.share.copiedMarkdown', 'Markdown panoya kopyalandı!'));
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('collections.hub.modalTitle', 'Koleksiyon Paylaşım Sayfası (Public Link Hub / Bento)')}
            className="max-w-5xl"
        >
            <div className="space-y-4">
                {/* Header Summary & Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border">
                    <div className="flex items-center gap-2.5">
                        <span
                            className="text-xl w-9 h-9 flex items-center justify-center rounded-lg shadow-xs"
                            style={{ backgroundColor: `${accentColor}25` }}
                        >
                            {collection.icon}
                        </span>
                        <div>
                            <h3 className="font-semibold text-sm leading-tight">{collection.name}</h3>
                            <p className="text-xs text-muted-foreground">
                                {loadingBookmarks ? t('common.loading', 'Yükleniyor...') : `${bookmarks.length} ${t('common.bookmarks', 'Yer İmi')}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenLivePreview}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-primary" />
                            <span>{t('collections.hub.openLivePreview', 'Yeni Sekmede Canlı Aç')}</span>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleDownloadHtml}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('collections.hub.downloadHtml', 'HTML İndir (index.html)')}</span>
                        </Button>
                    </div>
                </div>

                {/* Main Content Area: Controls (Left) & Live Iframe Preview (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Column: Style & Options (5 cols) */}
                    <div className="lg:col-span-5 space-y-3.5">
                        {/* Layout Selector */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                {t('collections.hub.layoutStyle', 'Görünüm Tasarımı')}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLayout('bento')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-all cursor-pointer",
                                        layout === 'bento'
                                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    <span>Bento Grid</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLayout('linktree')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-all cursor-pointer",
                                        layout === 'linktree'
                                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                    <span>Linktree</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLayout('cards')}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border text-xs gap-1 transition-all cursor-pointer",
                                        layout === 'cards'
                                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                            : "border-border hover:bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    <Layers className="w-4 h-4" />
                                    <span>Kartlar</span>
                                </button>
                            </div>
                        </div>

                        {/* Accent Color Picker */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                {t('collections.hub.accentColor', 'Vurgu Rengi')}
                            </label>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {COLOR_PRESETS.map((p) => (
                                    <button
                                        key={p.color}
                                        type="button"
                                        onClick={() => setAccentColor(p.color)}
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-transform cursor-pointer border border-black/10 dark:border-white/10",
                                            accentColor === p.color ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110 opacity-80"
                                        )}
                                        style={{ backgroundColor: p.color }}
                                        title={p.name}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={accentColor}
                                    onChange={(e) => setAccentColor(e.target.value)}
                                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                                    title={t('collections.hub.customColor', 'Özel Renk')}
                                />
                            </div>
                        </div>

                        {/* Bio / Description Input */}
                        <div>
                            <label htmlFor="hub-bio-input" className="block text-xs font-medium text-muted-foreground mb-1">
                                {t('collections.hub.bioLabel', 'Başlık Açıklaması / Bio')}
                            </label>
                            <input
                                id="hub-bio-input"
                                type="text"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder={t('collections.hub.bioPlaceholder', 'Örn: Yazılımcılar ve tasarımcılar için 50 faydalı kaynak')}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                            />
                        </div>

                        {/* Author Input */}
                        <div>
                            <label htmlFor="hub-author-input" className="block text-xs font-medium text-muted-foreground mb-1">
                                {t('collections.hub.authorLabel', 'Yazar / İsim (İsteğe bağlı)')}
                            </label>
                            <input
                                id="hub-author-input"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder={t('collections.share.authorPlaceholder', 'Örn: @ghostkozak')}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                            />
                        </div>

                        {/* Quick Copy Action Buttons */}
                        <div className="pt-2 flex flex-col gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCopyHtml}
                                className="w-full justify-start text-xs h-8 cursor-pointer"
                            >
                                {copiedHtml ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                                <span>{t('collections.hub.copyHtmlCode', 'Tüm HTML Kodunu Kopyala')}</span>
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyMarkdown}
                                className="w-full justify-start text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <FileText className="w-3.5 h-3.5 mr-2" />
                                <span>{t('collections.share.markdown', 'Markdown Listesi Olarak Kopyala')}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Live Iframe Preview (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col items-center">
                        {/* Device toggle toolbar */}
                        <div className="w-full flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                {t('collections.hub.livePreviewTitle', 'Canlı Önizleme')}
                            </span>
                            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={cn(
                                        "px-2 py-1 rounded text-xs flex items-center gap-1 transition-all cursor-pointer",
                                        previewDevice === 'desktop' ? "bg-background shadow-xs text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Monitor className="w-3 h-3" />
                                    <span>Desktop</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={cn(
                                        "px-2 py-1 rounded text-xs flex items-center gap-1 transition-all cursor-pointer",
                                        previewDevice === 'mobile' ? "bg-background shadow-xs text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Smartphone className="w-3 h-3" />
                                    <span>Mobile</span>
                                </button>
                            </div>
                        </div>

                        {/* Embedded Iframe */}
                        <div
                            className={cn(
                                "relative transition-all duration-300 overflow-hidden border rounded-2xl bg-neutral-900 shadow-md flex items-center justify-center",
                                previewDevice === 'mobile'
                                    ? "w-[320px] sm:w-[350px] h-[440px] border-4 border-neutral-700 shadow-xl"
                                    : "w-full h-[440px]"
                            )}
                        >
                            <iframe
                                title="Collection Hub Preview"
                                srcDoc={generatedHtml}
                                className="w-full h-full border-0 bg-white dark:bg-neutral-950"
                                sandbox="allow-scripts"
                            />
                        </div>
                    </div>
                </div>

                {/* GitHub Pages 1-Minute Deployment Guide Accordion */}
                <div className="border rounded-xl p-3 bg-muted/20 text-xs space-y-2">
                    <button
                        type="button"
                        onClick={() => setShowGithubGuide(!showGithubGuide)}
                        className="w-full flex items-center justify-between text-left font-medium text-foreground cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <Github className="w-4 h-4 text-primary" />
                            <span>{t('collections.hub.githubGuideTitle', 'GitHub Pages ile Ücretsiz Nasıl Yayınlanır? (1 Dakika)')}</span>
                        </span>
                        {showGithubGuide ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {showGithubGuide && (
                        <div className="pt-2 text-muted-foreground space-y-1.5 leading-relaxed border-t border-border/60 animate-in fade-in duration-200">
                            <p><strong>1.</strong> {t('collections.share.guideStep1', 'Yukarıdaki "HTML İndir (index.html)" butonuna tıklayarak dosyayı indirin.')}</p>
                            <p><strong>2.</strong> <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="text-primary underline">github.com/new</a> {t('collections.share.guideStep2', 'adresinde yeni bir genel (Public) repository oluşturun (örn: linkler).')}</p>
                            <p><strong>3.</strong> {t('collections.share.guideStep3', 'İndirdiğiniz index.html dosyasını repo içine sürükleyip Commit edin.')}</p>
                            <p><strong>4.</strong> {t('collections.share.guideStep4', 'Repo içinde Settings > Pages sekmesine gidin, Source kısmından Deploy from a branch ve main seçip kaydedin.')}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium">🎉 {t('collections.share.guideStep5', 'Tebrikler! Sayfanız https://<kullanici-adiniz>.github.io/<repo>/ adresinde yayında!')}</p>
                        </div>
                    )}
                </div>

                {/* Footer Close */}
                <div className="flex items-center justify-end pt-2 border-t">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.close', 'Kapat')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
