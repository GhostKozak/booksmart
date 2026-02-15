import React, { useState } from 'react';
import { Trash2, Check, XCircle, Download, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { SelectionInfo } from './actionbar/SelectionInfo';
import { TagBulkPopover } from './actionbar/TagBulkPopover';
import { MoveBulkPopover } from './actionbar/MoveBulkPopover';
import { useTranslation } from 'react-i18next';

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
    onMagicSort,
    isProcessingAI
}) {
    const { t } = useTranslation();
    const [activePopover, setActivePopover] = useState(null); // 'move' | 'tag' | null

    if (selectedCount === 0) return null;

    const togglePopover = (type) => {
        setActivePopover(activePopover === type ? null : type);
    };

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm border shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 sm:gap-4 z-50 animate-in slide-in-from-bottom-5 duration-300 w-[90vw] max-w-fit justify-between sm:justify-center">

            <SelectionInfo
                count={selectedCount}
                onClear={onClearSelection}
            />

            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0 relative">
                {/* Delete */}
                <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                    onClick={onDelete}
                >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{t('actionbar.delete')}</span>
                </Button>

                {/* Add Tags */}
                {onAddTags && (
                    <TagBulkPopover
                        allTags={allTags}
                        onApply={onAddTags}
                        isOpen={activePopover === 'tag'}
                        onToggle={() => togglePopover('tag')}
                    />
                )}

                {/* Move */}
                <MoveBulkPopover
                    allFolders={allFolders}
                    onMove={onMove}
                    isOpen={activePopover === 'move'}
                    onToggle={() => togglePopover('move')}
                />

                {/* Status Override */}
                {onOverrideStatus && (
                    <div className="flex gap-1 border-l pl-2 ml-1 sm:ml-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full shrink-0"
                            title={t('actionbar.markAlive')}
                            onClick={() => onOverrideStatus('alive')}
                        >
                            <Check className="h-4 w-4 sm:h-4 sm:w-4 text-emerald-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full shrink-0"
                            title={t('actionbar.markDead')}
                            onClick={() => onOverrideStatus('dead')}
                        >
                            <XCircle className="h-4 w-4 sm:h-4 sm:w-4 text-red-500" />
                        </Button>
                    </div>
                )}

                {/* Export Selected */}
                {onExportSelected && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                        onClick={onExportSelected}
                        title={t('actionbar.export')}
                    >
                        <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">{t('actionbar.export')}</span>
                    </Button>
                )}

                {/* Clean URLs */}
                {onCleanUrls && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={onCleanUrls}
                        title={t('actionbar.cleanUrls')}
                    >
                        <Sparkles className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">{t('actionbar.cleanUrls')}</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
