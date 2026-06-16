import React, { useState, useRef, useEffect } from 'react';
import { X, Folder, FolderInput } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export function MoveBulkPopover({ allFolders, onMove, isOpen, onToggle, isVertical = false }) {
    const { t } = useTranslation();
    const [targetFolder, setTargetFolder] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = (folderName) => {
        const target = folderName || targetFolder;
        if (target.trim()) {
            onMove(target);
            onToggle();
            setTargetFolder('');
        }
    };

    return (
        <div className={cn("relative", isVertical && "w-full")}>
            {isOpen && (
                <div className={cn(
                    "z-10 flex flex-col gap-2 bg-popover shadow-xl p-3 border rounded-lg animate-in duration-200 zoom-in-95",
                    isVertical
                        ? "relative mt-1 mb-2 w-full left-0 translate-x-0"
                        : "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64"
                )}>
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            className="bg-muted px-2 py-1.5 border focus:border-primary rounded outline-none w-full text-sm"
                            placeholder={t('actionbar.move.placeholder')}
                            value={targetFolder}
                            onChange={(e) => setTargetFolder(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                            }}
                        />
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={onToggle}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {allFolders && allFolders.length > 0 && (
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                            {allFolders.map(folder => (
                                <button
                                    key={folder.id}
                                    className="flex items-center gap-2 hover:bg-muted px-2 py-1.5 rounded text-sm text-left transition-colors"
                                    onClick={() => handleSubmit(folder.name)}
                                >
                                    <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="truncate">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <Button size="sm" className="mt-1 w-full" onClick={() => handleSubmit()}>
                        {t('actionbar.move.submit')}
                    </Button>
                </div>
            )}
            <Button
                variant={isOpen ? "secondary" : "outline"}
                size="sm"
                className={cn(
                    "gap-3 px-3 sm:px-4 rounded-full h-9 sm:h-8 overflow-hidden shrink-0",
                    isVertical ? "w-full justify-start rounded-xl h-10 border-none px-2" : "justify-center"
                )}
                onClick={onToggle}
            >
                <FolderInput className="w-4 sm:w-3.5 h-4 sm:h-3.5 shrink-0" />
                <span className={cn(
                    "truncate",
                    !isVertical && "hidden sm:inline"
                )}>{t('actionbar.move.button')}</span>
            </Button>
        </div>
    );
}
