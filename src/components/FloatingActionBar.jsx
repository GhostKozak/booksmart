import { Trash2, FolderInput, X, Loader2, Check, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useState } from 'react';

export function FloatingActionBar({
    selectedCount,
    onDelete,
    onMove,
    onClearSelection,
    allFolders,
    onOverrideStatus
}) {
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [targetFolder, setTargetFolder] = useState('');

    if (selectedCount === 0) return null;

    return (

        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm border shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 sm:gap-4 z-50 animate-in slide-in-from-bottom-5 duration-300 w-[90vw] max-w-fit justify-between sm:justify-center">
            <div className="flex items-center gap-2 border-r pr-2 sm:pr-4 mx-auto sm:mx-0">
                <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
                    {selectedCount}
                </div>
                <span className="text-sm font-medium hidden sm:inline">Selected</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full -ml-1 hover:bg-muted shrink-0"
                    onClick={onClearSelection}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0">
                {/* Delete */}
                <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                    onClick={onDelete}
                >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                </Button>

                {/* Move */}
                <div className="relative">
                    {isMoveOpen ? (
                        <div className="flex items-center gap-1 sm:gap-2 bg-popover border rounded-full p-1 animate-in zoom-in-95 duration-200 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 min-w-[180px] sm:min-w-[200px] shadow-lg">
                            <input
                                autoFocus
                                className="bg-transparent text-sm px-2 outline-none w-full"
                                placeholder="Folder..."
                                value={targetFolder}
                                onChange={(e) => setTargetFolder(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && targetFolder.trim()) {
                                        onMove(targetFolder);
                                        setIsMoveOpen(false);
                                        setTargetFolder('');
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full shrink-0"
                                onClick={() => {
                                    if (targetFolder.trim()) {
                                        onMove(targetFolder);
                                        setIsMoveOpen(false);
                                        setTargetFolder('');
                                    }
                                }}
                            >
                                <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-full shrink-0"
                                onClick={() => setIsMoveOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 border shrink-0"
                            onClick={() => setIsMoveOpen(true)}
                        >
                            <FolderInput className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Move</span>
                        </Button>
                    )}
                </div>

                {/* Status Override */}
                {onOverrideStatus && (
                    <div className="flex gap-1 border-l pl-2 ml-1 sm:ml-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full shrink-0"
                            title="Mark as Alive (Safe)"
                            onClick={() => onOverrideStatus('alive')}
                        >
                            <Check className="h-4 w-4 sm:h-4 sm:w-4 text-emerald-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 rounded-full shrink-0"
                            title="Mark as Dead"
                            onClick={() => onOverrideStatus('dead')}
                        >
                            <XCircle className="h-4 w-4 sm:h-4 sm:w-4 text-red-500" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
