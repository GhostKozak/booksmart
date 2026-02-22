import { useState } from 'react';
import { Trash2, Check, XCircle, Download, Sparkles, Loader2, Zap, Menu, X, MoreVertical, Wand2, Search } from 'lucide-react';
import { Button } from './ui/button';
import { SelectionInfo } from './actionbar/SelectionInfo';
import { TagBulkPopover } from './actionbar/TagBulkPopover';
import { MoveBulkPopover } from './actionbar/MoveBulkPopover';
import { CollectionBulkPopover } from './actionbar/CollectionBulkPopover';
import { DropdownMenu, DropdownItem, DropdownSeparator } from './ui/DropdownMenu';
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
    isProcessingAI,
    allCollections,
    onAddToCollection,
    onRemoveFromCollection,
    onFixTitles,
    onFindSmartDuplicates,
    isProcessingAITitles,
    isProcessingAIDupes,
    onCancelAITasks
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

    const isAnyProcessing = isProcessingAI || isProcessingAITitles || isProcessingAIDupes;

    const getProcessingText = () => {
        if (isProcessingAI) return t('actionbar.sorting');
        if (isProcessingAITitles) return t('actionbar.fixTitles');
        if (isProcessingAIDupes) return t('actionbar.smartDuplicates');
        return t('actionbar.moreTools');
    };

    return (
        <div className="fixed bottom-6 right-6 min-[1200px]:left-1/2 min-[1200px]:-translate-x-1/2 z-[100] flex flex-col items-end min-[1200px]:items-center gap-3">
            {/* Mobile Actions Menu (Expanded) */}
            <div className={cn(
                "flex flex-col gap-2 bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl p-3 transition-all duration-300 origin-bottom-right min-[1200px]:hidden mb-1 w-72", // Slightly wider for labels
                isMenuOpen ? "scale-100 opacity-100 pointer-events-auto translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
            )}>
                <div className="text-sm font-bold text-foreground px-2 mb-1 flex justify-between items-center border-b pb-2">
                    <span>{t('common.actions')}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsMenuOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Vertical Actions List */}
                <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1 pb-1">

                    {/* Primary Actions Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-0.5 tracking-wider opacity-70">
                            {t('common.actions')}
                        </div>
                        <Button variant="destructive" size="sm" className="justify-start gap-2 h-9 px-3 rounded-xl shadow-sm" onClick={() => { onDelete(); setIsMenuOpen(false); }}>
                            <Trash2 className="h-4 w-4" />
                            <span>{t('actionbar.delete')}</span>
                        </Button>
                        <TagBulkPopover allTags={allTags} onApply={onAddTags} isOpen={activePopover === 'tag'} onToggle={() => togglePopover('tag')} isVertical />
                        <MoveBulkPopover allFolders={allFolders} onMove={onMove} isOpen={activePopover === 'move'} onToggle={() => togglePopover('move')} isVertical />
                        <CollectionBulkPopover collections={allCollections} onAddToCollection={(cid) => { onAddToCollection(cid); setIsMenuOpen(false); }} onRemoveFromCollection={(cid) => { onRemoveFromCollection(cid); setIsMenuOpen(false); }} isOpen={activePopover === 'collection'} onToggle={() => togglePopover('collection')} isVertical />
                    </div>

                    <div className="h-px bg-border/50 mx-1" />

                    {/* Maintenance / Health & Export Group */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-0.5 tracking-wider opacity-70">
                            {t('header.tools')}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="justify-start gap-2 h-9 px-2 rounded-xl shadow-sm" onClick={() => { onExportSelected(); setIsMenuOpen(false); }}>
                                <Download className="h-4 w-4 shrink-0" />
                                <span className="truncate">{t('actionbar.export')}</span>
                            </Button>

                            <Button variant="outline" size="sm" className="justify-start gap-2 h-9 px-2 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400" onClick={() => { onCleanUrls(); setIsMenuOpen(false); }}>
                                <Sparkles className="h-4 w-4 shrink-0" />
                                <span className="truncate">{t('actionbar.cleanUrls')}</span>
                            </Button>
                        </div>

                        <Button variant="default" size="sm" className="justify-start gap-2 h-9 px-3 mt-1 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm text-white" onClick={() => { onAutoSort(); setIsMenuOpen(false); }} disabled={isProcessingAI}>
                            <Zap className="h-4 w-4 fill-current" />
                            <span>{t('actionbar.autoSort')}</span>
                        </Button>

                        <Button variant="default" size="sm" className="justify-start gap-2 h-9 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 shadow-md text-white" onClick={() => { onMagicSort(); setIsMenuOpen(false); }} disabled={isProcessingAI} title={t('actionbar.tooltips.magicSort')}>
                            {isProcessingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            <span>{isProcessingAI ? t('actionbar.sorting') : t('actionbar.magicSort')}</span>
                        </Button>

                        <Button variant="outline" size="sm" className="justify-start gap-2 h-9 px-3 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400" onClick={() => { onFixTitles(); setIsMenuOpen(false); }} disabled={isProcessingAITitles} title={t('actionbar.tooltips.fixTitles')}>
                            {isProcessingAITitles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 shrink-0" />}
                            <span>{t('actionbar.fixTitles')}</span>
                        </Button>

                        <Button variant="outline" size="sm" className="justify-start gap-2 h-9 px-3 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400" onClick={() => { onFindSmartDuplicates(); setIsMenuOpen(false); }} disabled={isProcessingAIDupes} title={t('actionbar.tooltips.smartDuplicates')}>
                            {isProcessingAIDupes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 shrink-0" />}
                            <span>{t('actionbar.smartDuplicates')}</span>
                        </Button>

                        <div className="flex items-center gap-2 px-1 mt-1 bg-muted/30 rounded-xl p-1">
                            <span className="text-[11px] font-medium text-muted-foreground ml-2 mr-auto">{t('bookmarks.columns.status')}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-emerald-500/20" title={t('actionbar.markAlive')} onClick={() => onOverrideStatus('alive')}>
                                <Check className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-red-500/20" title={t('actionbar.markDead')} onClick={() => onOverrideStatus('dead')}>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
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
                    <CollectionBulkPopover collections={allCollections} onAddToCollection={onAddToCollection} onRemoveFromCollection={onRemoveFromCollection} isOpen={activePopover === 'collection'} onToggle={() => togglePopover('collection')} />

                    <div className="flex gap-2 border-l pl-2 border-border">
                        <DropdownMenu
                            align="right"
                            side="top"
                            trigger={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "group rounded-full gap-2 h-8 px-4 font-medium transition-all duration-300",
                                        isAnyProcessing && "border-primary/50 text-primary bg-primary/5 hover:border-destructive hover:text-destructive hover:bg-destructive/10 active:border-destructive active:text-destructive active:bg-destructive/10"
                                    )}
                                    title={isAnyProcessing ? t('common.cancel') : t('actionbar.moreTools')}
                                    onClick={(e) => {
                                        if (isAnyProcessing) {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onCancelAITasks();
                                        }
                                    }}
                                >
                                    {isAnyProcessing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin group-hover:hidden group-active:hidden" />
                                            <X className="h-3.5 w-3.5 hidden group-hover:block group-active:block" />
                                            <span className="truncate max-w-[120px] group-hover:hidden group-active:hidden animate-pulse">
                                                {getProcessingText()}
                                            </span>
                                            <span className="truncate max-w-[120px] hidden group-hover:block group-active:block font-bold">
                                                {t('common.cancel')}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                            <span className="truncate max-w-[120px]">
                                                {getProcessingText()}
                                            </span>
                                        </>
                                    )}
                                </Button>
                            }
                        >
                            <DropdownItem onClick={onExportSelected} icon={Download}>
                                {t('actionbar.export')}
                            </DropdownItem>

                            <DropdownItem onClick={onCleanUrls} icon={Sparkles} className="text-amber-600 dark:text-amber-400">
                                {t('actionbar.cleanUrls')}
                            </DropdownItem>

                            <DropdownSeparator />

                            <DropdownItem onClick={onAutoSort} icon={Zap} disabled={isProcessingAI} className="text-blue-600 dark:text-blue-400">
                                {t('actionbar.autoSort')}
                            </DropdownItem>

                            <DropdownItem
                                onClick={onMagicSort}
                                icon={isProcessingAI ? Loader2 : Sparkles}
                                disabled={isProcessingAI}
                                className="text-purple-600 dark:text-purple-400"
                                title={t('actionbar.tooltips.magicSort')}
                            >
                                <span className={cn(isProcessingAI && "animate-pulse")}>
                                    {isProcessingAI ? t('actionbar.sorting') : t('actionbar.magicSort')}
                                </span>
                            </DropdownItem>

                            <DropdownItem
                                onClick={onFixTitles}
                                icon={isProcessingAITitles ? Loader2 : Wand2}
                                disabled={isProcessingAITitles}
                                className="text-purple-600 dark:text-purple-400"
                                title={t('actionbar.tooltips.fixTitles')}
                            >
                                <span className={cn(isProcessingAITitles && "animate-pulse")}>
                                    {t('actionbar.fixTitles')}
                                </span>
                            </DropdownItem>

                            <DropdownItem
                                onClick={onFindSmartDuplicates}
                                icon={isProcessingAIDupes ? Loader2 : Search}
                                disabled={isProcessingAIDupes}
                                className="text-purple-600 dark:text-purple-400"
                                title={t('actionbar.tooltips.smartDuplicates')}
                            >
                                <span className={cn(isProcessingAIDupes && "animate-pulse")}>
                                    {t('actionbar.smartDuplicates')}
                                </span>
                            </DropdownItem>

                            <DropdownSeparator />

                            <DropdownItem onClick={() => onOverrideStatus('alive')} icon={Check} className="text-emerald-600 dark:text-emerald-400">
                                {t('actionbar.markAlive')}
                            </DropdownItem>

                            <DropdownItem onClick={() => onOverrideStatus('dead')} icon={XCircle} className="text-red-600 dark:text-red-400">
                                {t('actionbar.markDead')}
                            </DropdownItem>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Mobile Toggle Button (Hidden on Desktop) */}
                <Button
                    variant={isAnyProcessing ? "outline" : (isMenuOpen ? "secondary" : "default")}
                    size="sm"
                    className={cn(
                        "min-[1200px]:hidden rounded-full h-9 shadow-lg transition-all duration-300",
                        isAnyProcessing ? "px-2 py-0 border-primary/50 bg-primary/5" : "px-4 gap-2"
                    )}
                    onClick={(e) => {
                        if (isAnyProcessing) {
                            e.stopPropagation();
                            e.preventDefault();
                            onCancelAITasks();
                        } else {
                            toggleMenu();
                        }
                    }}
                >
                    {isAnyProcessing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1" />
                            <span className="text-xs font-bold uppercase truncate max-w-[90px] text-primary">
                                {getProcessingText()}
                            </span>
                            <div className="bg-destructive/10 text-destructive rounded-full p-1 ml-1 flex items-center justify-center">
                                <X className="h-3 w-3" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                            <span className="text-xs font-bold uppercase">{t('common.actions')}</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
