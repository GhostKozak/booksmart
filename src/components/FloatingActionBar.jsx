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
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-2 border-r pr-4">
                <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {selectedCount}
                </div>
                <span className="text-sm font-medium">Selected</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full -ml-1 hover:bg-muted"
                    onClick={onClearSelection}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>

            <div className="flex items-center gap-2">
                {/* Delete */}
                <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full gap-2 h-8 px-4"
                    onClick={onDelete}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                </Button>

                {/* Move */}
                <div className="relative">
                    {isMoveOpen ? (
                        <div className="flex items-center gap-2 bg-popover border rounded-full p-1 animate-in zoom-in-95 duration-200 absolute bottom-full mb-2 left-0 min-w-[200px] shadow-lg">
                            <input
                                autoFocus
                                className="bg-transparent text-sm px-2 outline-none w-full"
                                placeholder="Folder name..."
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
                                className="h-6 w-6 rounded-full"
                                onClick={() => {
                                    if (targetFolder.trim()) {
                                        onMove(targetFolder);
                                        setIsMoveOpen(false);
                                        setTargetFolder('');
                                    }
                                }}
                            >
                                <Check className="h-3 w-3 text-green-500" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full"
                                onClick={() => setIsMoveOpen(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full gap-2 h-8 px-4 border"
                            onClick={() => setIsMoveOpen(true)}
                        >
                            <FolderInput className="h-3.5 w-3.5" />
                            Move
                        </Button>
                    )}
                </div>

                {/* Status Override - Only useful if we track specific statuses */}
                {onOverrideStatus && (
                    <div className="flex gap-1 border-l pl-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Mark as Alive (Safe)"
                            onClick={() => onOverrideStatus('alive')}
                        >
                            <Check className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            title="Mark as Dead"
                            onClick={() => onOverrideStatus('dead')}
                        >
                            <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}
