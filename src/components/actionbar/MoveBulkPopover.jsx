import React, { useState, useRef, useEffect } from 'react';
import { X, Folder, FolderInput } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

export function MoveBulkPopover({ allFolders, onMove, isOpen, onToggle }) {
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
        <div className="relative">
            {isOpen && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-popover border rounded-lg p-3 shadow-xl w-64 animate-in zoom-in-95 duration-200 flex flex-col gap-2 z-50">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            className="bg-muted px-2 py-1.5 rounded text-sm outline-none w-full border focus:border-primary"
                            placeholder={t('actionbar.move.placeholder')}
                            value={targetFolder}
                            onChange={(e) => setTargetFolder(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                            }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggle}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {allFolders && allFolders.length > 0 && (
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                            {allFolders.map(folder => (
                                <button
                                    key={folder.id}
                                    className="text-sm text-left px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 transition-colors"
                                    onClick={() => handleSubmit(folder.name)}
                                >
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="truncate">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <Button size="sm" className="w-full mt-1" onClick={() => handleSubmit()}>
                        {t('actionbar.move.submit')}
                    </Button>
                </div>
            )}
            <Button
                variant={isOpen ? "secondary" : "outline"}
                size="sm"
                className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                onClick={onToggle}
            >
                <FolderInput className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{t('actionbar.move.button')}</span>
            </Button>
        </div>
    );
}
