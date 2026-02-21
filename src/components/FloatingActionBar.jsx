import { useState } from 'react';
import { Trash2, Check, XCircle, Download, Sparkles, Loader2, Zap, Menu, X, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import { SelectionInfo } from './actionbar/SelectionInfo';
import { TagBulkPopover } from './actionbar/TagBulkPopover';
import { MoveBulkPopover } from './actionbar/MoveBulkPopover';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function FloatingActionBar({
    selectedCount,
    onDelete,
    onMove,
    onClearSelection,
    allFolders,
    allTags,
    onOverrideStatus,
    onAddTags,
    onExportSelected,
    onCleanUrls,
    onAutoSort,
    onMagicSort,
    isProcessingAI
}) {
    const { t } = useTranslation();
    const [activePopover, setActivePopover] = useState(null); // 'move' | 'tag' | null
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (selectedCount === 0) return null;

    const togglePopover = (type) => {
        setActivePopover(activePopover === type ? null : type);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
        if (isMenuOpen) setActivePopover(null);
    };

    return (
        <div className="fixed bottom-6 right-6 min-[1200px]:left-1/2 min-[1200px]:-translate-x-1/2 z-[100] flex flex-col items-end min-[1200px]:items-center gap-3">
            {/* Mobile Actions Menu (Expanded) */}
            <div className={cn(
                "flex flex-col gap-2 bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl p-3 transition-all duration-300 origin-bottom-right min-[1200px]:hidden mb-1 w-72", // Slightly wider for labels
                isMenuOpen ? "scale-100 opacity-100 pointer-events-auto translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
            )}>
                <div className="text-sm font-bold text-foreground px-2 mb-1 flex justify-between items-center border-b pb-2">
                    <span>{t('common.actions', 'Menu')}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsMenuOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Vertical Actions List */}
                <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">

                    {/* Primary Actions Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1 tracking-wider opacity-70">
                            {t('common.actions', 'Basic Actions')}
                        </div>
                        <Button variant="destructive" size="sm" className="justify-start gap-3 h-10 px-3 rounded-xl shadow-sm" onClick={() => { onDelete(); setIsMenuOpen(false); }}>
                            <Trash2 className="h-4 w-4" />
                            <span>{t('actionbar.delete')}</span>
                        </Button>
                        <TagBulkPopover allTags={allTags} onApply={onAddTags} isOpen={activePopover === 'tag'} onToggle={() => togglePopover('tag')} isVertical />
                        <MoveBulkPopover allFolders={allFolders} onMove={onMove} isOpen={activePopover === 'move'} onToggle={() => togglePopover('move')} isVertical />
                    </div>

                    <div className="h-px bg-border/50 mx-1" />

                    {/* Organization Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1 tracking-wider opacity-70">
                            {t('header.maintenance', 'Organization')}
                        </div>
                        <Button variant="default" size="sm" className="justify-start gap-3 h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm text-white" onClick={() => { onAutoSort(); setIsMenuOpen(false); }} disabled={isProcessingAI}>
                            <Zap className="h-4 w-4 fill-current" />
                            <span>{t('actionbar.autoSort')}</span>
                        </Button>

                        <Button variant="default" size="sm" className="justify-start gap-3 h-10 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md text-white" onClick={() => { onMagicSort(); setIsMenuOpen(false); }} disabled={isProcessingAI}>
                            {isProcessingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            <span>{isProcessingAI ? t('actionbar.sorting') : t('actionbar.magicSort')}</span>
                        </Button>
                    </div>

                    <div className="h-px bg-border/50 mx-1" />

                    {/* Maintenance / Health Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1 tracking-wider opacity-70">
                            {t('header.tools', 'Link Tools')}
                        </div>
                        <Button variant="outline" size="sm" className="justify-start gap-3 h-10 px-3 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400" onClick={() => { onCleanUrls(); setIsMenuOpen(false); }}>
                            <Sparkles className="h-4 w-4" />
                            <span>{t('actionbar.cleanUrls')}</span>
                        </Button>

                        <div className="flex items-center gap-2 px-1 mt-1 bg-muted/30 rounded-xl p-1">
                            <span className="text-[11px] font-medium text-muted-foreground ml-2 mr-auto">{t('bookmarks.columns.status')}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-500/20" title={t('actionbar.markAlive')} onClick={() => onOverrideStatus('alive')}>
                                <Check className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/20" title={t('actionbar.markDead')} onClick={() => onOverrideStatus('dead')}>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    </div>

                    <div className="h-px bg-border/50 mx-1" />

                    {/* Secondary Actions / Data Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1 tracking-wider opacity-70">
                            {t('header.export', 'Data & Sharing')}
                        </div>
                        <Button variant="outline" size="sm" className="justify-start gap-3 h-10 px-3 rounded-xl shadow-sm" onClick={() => { onExportSelected(); setIsMenuOpen(false); }}>
                            <Download className="h-4 w-4" />
                            <span>{t('actionbar.export')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Bar (Desktop: Horizontal | Mobile: Small Compact FAB) */}
            <div className="bg-card/95 backdrop-blur-md border shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 min-[1200px]:gap-4 animate-in slide-in-from-bottom-5 duration-300 max-w-fit">
                <SelectionInfo count={selectedCount} onClear={onClearSelection} isMobileBreakpoint />

                {/* Desktop Buttons (Hidden on Mobile) */}
                <div className="hidden min-[1200px]:flex items-center gap-2">
                    <Button variant="destructive" size="sm" className="rounded-full gap-2 h-8 px-4" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t('actionbar.delete')}</span>
                    </Button>

                    <TagBulkPopover allTags={allTags} onApply={onAddTags} isOpen={activePopover === 'tag'} onToggle={() => togglePopover('tag')} />
                    <MoveBulkPopover allFolders={allFolders} onMove={onMove} isOpen={activePopover === 'move'} onToggle={() => togglePopover('move')} />

                    <div className="flex gap-1 border-l pl-2 border-border">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title={t('actionbar.markAlive')} onClick={() => onOverrideStatus('alive')}>
                            <Check className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title={t('actionbar.markDead')} onClick={() => onOverrideStatus('dead')}>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>

                    <div className="flex gap-2 border-l pl-2 border-border">
                        <Button variant="outline" size="sm" className="rounded-full gap-2 h-8 px-4" onClick={onExportSelected} title={t('actionbar.export')}>
                            <Download className="h-3.5 w-3.5" />
                            <span>{t('actionbar.export')}</span>
                        </Button>

                        <Button variant="outline" size="sm" className="rounded-full gap-2 h-8 px-4 border-amber-500/30 text-amber-600 dark:text-amber-400" onClick={onCleanUrls} title={t('actionbar.cleanUrls')}>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('actionbar.cleanUrls')}</span>
                        </Button>

                        <Button variant="default" size="sm" className="rounded-full gap-2 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={onAutoSort} disabled={isProcessingAI}>
                            <Zap className="h-3.5 w-3.5 fill-current" />
                            <span>{t('actionbar.autoSort')}</span>
                        </Button>

                        <Button variant="default" size="sm" className="rounded-full gap-2 h-8 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm" onClick={onMagicSort} disabled={isProcessingAI}>
                            {isProcessingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            <span>{isProcessingAI ? t('actionbar.sorting') : t('actionbar.magicSort')}</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile Toggle Button (Hidden on Desktop) */}
                <Button
                    variant={isMenuOpen ? "secondary" : "default"}
                    size="sm"
                    className="min-[1200px]:hidden rounded-full h-9 px-4 gap-2 shadow-lg"
                    onClick={toggleMenu}
                >
                    {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    <span className="text-xs font-bold uppercase">{t('common.actions', 'Actions')}</span>
                </Button>
            </div>
        </div>
    );
}
