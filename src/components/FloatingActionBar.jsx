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
import { useAppStore } from '../store/useAppStore';

export function FloatingActionBar({
    onDelete,
    onMove,
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

    const selectedIds = useAppStore(state => state.selectedIds);
    const setSelectedIds = useAppStore(state => state.setSelectedIds);
    const selectedCount = selectedIds.size;
    const onClearSelection = () => setSelectedIds(new Set());

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
        <div className="right-6 bottom-6 min-[1200px]:left-1/2 z-100 fixed flex flex-col items-end min-[1200px]:items-center gap-3 min-[1200px]:-translate-x-1/2">
            {/* Mobile Actions Menu (Expanded) */}
            <div className={cn(
                "min-[1200px]:hidden flex flex-col gap-2 bg-card/95 shadow-2xl backdrop-blur-md mb-1 p-3 border rounded-2xl w-72 origin-bottom-right transition-all duration-300", // Slightly wider for labels
                isMenuOpen ? "scale-100 opacity-100 pointer-events-auto translate-y-0" : "scale-90 opacity-0 pointer-events-none translate-y-4"
            )}>
                <div className="flex justify-between items-center mb-1 px-2 pb-2 border-b font-bold text-foreground text-sm">
                    <span>{t('common.actions')}</span>
                    <Button variant="ghost" size="icon" className="rounded-full w-7 h-7" onClick={() => setIsMenuOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Vertical Actions List */}
                <div className="flex flex-col gap-2 pr-1 pb-1 max-h-[55vh] overflow-y-auto">

                    {/* Primary Actions Group */}
                    <div className="flex flex-col gap-1">
                        <div className="opacity-70 mb-0.5 px-2 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                            {t('common.actions')}
                        </div>
                        <Button variant="destructive" size="sm" className="justify-start gap-2 shadow-sm px-3 rounded-xl h-9" onClick={() => { onDelete(); setIsMenuOpen(false); }}>
                            <Trash2 className="w-4 h-4" />
                            <span>{t('actionbar.delete')}</span>
                        </Button>
                        <TagBulkPopover allTags={allTags} onApply={onAddTags} isOpen={activePopover === 'tag'} onToggle={() => togglePopover('tag')} isVertical />
                        <MoveBulkPopover allFolders={allFolders} onMove={onMove} isOpen={activePopover === 'move'} onToggle={() => togglePopover('move')} isVertical />
                        <CollectionBulkPopover collections={allCollections} onAddToCollection={(cid) => { onAddToCollection(cid); setIsMenuOpen(false); }} onRemoveFromCollection={(cid) => { onRemoveFromCollection(cid); setIsMenuOpen(false); }} isOpen={activePopover === 'collection'} onToggle={() => togglePopover('collection')} isVertical />
                    </div>

                    <div className="mx-1 bg-border/50 h-px" />

                    {/* Maintenance / Health & Export Group */}
                    <div className="flex flex-col gap-1">
                        <div className="opacity-70 mb-0.5 px-2 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                            {t('header.tools')}
                        </div>

                        <div className="gap-2 grid grid-cols-2">
                            <Button variant="outline" size="sm" className="justify-start gap-2 shadow-sm px-2 rounded-xl h-9" onClick={() => { onExportSelected(); setIsMenuOpen(false); }}>
                                <Download className="w-4 h-4 shrink-0" />
                                <span className="truncate">{t('actionbar.export')}</span>
                            </Button>

                            <Button variant="outline" size="sm" className="justify-start gap-2 px-2 border-amber-500/30 rounded-xl h-9 text-amber-600 dark:text-amber-400" onClick={() => { onCleanUrls(); setIsMenuOpen(false); }}>
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span className="truncate">{t('actionbar.cleanUrls')}</span>
                            </Button>
                        </div>

                        <Button variant="default" size="sm" className="justify-start gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm mt-1 px-3 rounded-xl h-9 text-white" onClick={() => { onAutoSort(); setIsMenuOpen(false); }} disabled={isProcessingAI}>
                            <Zap className="fill-current w-4 h-4" />
                            <span>{t('actionbar.autoSort')}</span>
                        </Button>

                        <Button variant="default" size="sm" className="justify-start gap-2 bg-linear-to-r from-purple-500 to-indigo-500 shadow-md px-3 rounded-xl h-9 text-white" onClick={() => { onMagicSort(); setIsMenuOpen(false); }} disabled={isProcessingAI} title={t('actionbar.tooltips.magicSort')}>
                            {isProcessingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span>{isProcessingAI ? t('actionbar.sorting') : t('actionbar.magicSort')}</span>
                        </Button>

                        <Button variant="outline" size="sm" className="justify-start gap-2 px-3 border-purple-500/30 rounded-xl h-9 text-purple-600 dark:text-purple-400" onClick={() => { onFixTitles(); setIsMenuOpen(false); }} disabled={isProcessingAITitles} title={t('actionbar.tooltips.fixTitles')}>
                            {isProcessingAITitles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 shrink-0" />}
                            <span>{t('actionbar.fixTitles')}</span>
                        </Button>

                        <Button variant="outline" size="sm" className="justify-start gap-2 px-3 border-purple-500/30 rounded-xl h-9 text-purple-600 dark:text-purple-400" onClick={() => { onFindSmartDuplicates(); setIsMenuOpen(false); }} disabled={isProcessingAIDupes} title={t('actionbar.tooltips.smartDuplicates')}>
                            {isProcessingAIDupes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 shrink-0" />}
                            <span>{t('actionbar.smartDuplicates')}</span>
                        </Button>

                        <div className="flex items-center gap-2 bg-muted/30 mt-1 p-1 px-1 rounded-xl">
                            <span className="mr-auto ml-2 font-medium text-[11px] text-muted-foreground">{t('bookmarks.columns.status')}</span>
                            <Button variant="ghost" size="icon" className="hover:bg-emerald-500/20 rounded-lg w-7 h-7" title={t('actionbar.markAlive')} onClick={() => onOverrideStatus('alive')}>
                                <Check className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-red-500/20 rounded-lg w-7 h-7" title={t('actionbar.markDead')} onClick={() => onOverrideStatus('dead')}>
                                <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Bar (Desktop: Horizontal | Mobile: Small Compact FAB) */}
            <div className="slide-in-from-bottom-5 flex items-center gap-2 min-[1200px]:gap-4 bg-card/95 shadow-2xl backdrop-blur-md px-4 py-2 border rounded-full max-w-fit animate-in duration-300">
                <SelectionInfo count={selectedCount} onClear={onClearSelection} isMobileBreakpoint />

                {/* Desktop Buttons (Hidden on Mobile) */}
                <div className="hidden min-[1200px]:flex items-center gap-2">
                    <Button variant="destructive" size="sm" className="gap-2 px-4 rounded-full h-8" onClick={onDelete}>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('actionbar.delete')}</span>
                    </Button>

                    <TagBulkPopover allTags={allTags} onApply={onAddTags} isOpen={activePopover === 'tag'} onToggle={() => togglePopover('tag')} />
                    <MoveBulkPopover allFolders={allFolders} onMove={onMove} isOpen={activePopover === 'move'} onToggle={() => togglePopover('move')} />
                    <CollectionBulkPopover collections={allCollections} onAddToCollection={onAddToCollection} onRemoveFromCollection={onRemoveFromCollection} isOpen={activePopover === 'collection'} onToggle={() => togglePopover('collection')} />

                    <div className="flex gap-2 pl-2 border-border border-l">
                        <DropdownMenu
                            align="right"
                            side="top"
                            trigger={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "group gap-2 px-4 rounded-full h-8 font-medium transition-all duration-300",
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
                                            <Loader2 className="group-active:hidden group-hover:hidden w-3.5 h-3.5 animate-spin" />
                                            <X className="hidden group-active:block group-hover:block w-3.5 h-3.5" />
                                            <span className="group-active:hidden group-hover:hidden max-w-30 truncate animate-pulse">
                                                {getProcessingText()}
                                            </span>
                                            <span className="hidden group-active:block group-hover:block max-w-30 font-bold truncate">
                                                {t('common.cancel')}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                                            <span className="max-w-30 truncate">
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
                        "min-[1200px]:hidden shadow-lg rounded-full h-9 transition-all duration-300",
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
                            <Loader2 className="ml-1 w-3.5 h-3.5 text-primary animate-spin" />
                            <span className="max-w-22\.5 font-bold text-primary text-xs truncate uppercase">
                                {getProcessingText()}
                            </span>
                            <div className="flex justify-center items-center bg-destructive/10 ml-1 p-1 rounded-full text-destructive">
                                <X className="w-3 h-3" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            <span className="font-bold text-xs uppercase">{t('common.actions')}</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
