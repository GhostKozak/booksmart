import { Trash2, FolderInput, X, Loader2, Check, XCircle, Tag, Folder } from 'lucide-react';
import { Button } from './ui/button';

import { useState, useRef, useEffect } from 'react';

export function FloatingActionBar({
    selectedCount,
    onDelete,
    onMove,
    onClearSelection,
    allFolders,
    allTags,
    onOverrideStatus,
    onAddTags
}) {
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [isTagOpen, setIsTagOpen] = useState(false);
    const [targetFolder, setTargetFolder] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const moveInputRef = useRef(null);
    const tagInputRef = useRef(null);

    // Close popovers on click outside (simple implementation)
    // For now, reliance on clicking close buttons or main buttons is fine

    // Auto-focus logic
    useEffect(() => {
        if (isMoveOpen) {
            moveInputRef.current?.focus();
        }
    }, [isMoveOpen]);

    useEffect(() => {
        if (isTagOpen) {
            tagInputRef.current?.focus();
        }
    }, [isTagOpen]);

    if (selectedCount === 0) return null;

    const handleTagSubmit = () => {
        if (tagsInput.trim()) {
            onAddTags(tagsInput);
            setIsTagOpen(false);
            setTagsInput('');
        }
    };

    const handleMoveSubmit = (folderName) => {
        const target = folderName || targetFolder;
        if (target.trim()) {
            onMove(target);
            setIsMoveOpen(false);
            setTargetFolder('');
        }
    };

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

            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0 relative">
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

                {/* Add Tags */}
                {onAddTags && (
                    <div className="relative">
                        {isTagOpen && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-popover border rounded-lg p-3 shadow-xl w-64 animate-in zoom-in-95 duration-200 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={tagInputRef}
                                        className="bg-muted px-2 py-1.5 rounded text-sm outline-none w-full border focus:border-primary"
                                        placeholder="Add tags..."
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleTagSubmit();
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsTagOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                {allTags && allTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-1">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag.id}
                                                className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-full transition-colors truncate max-w-full"
                                                onClick={() => {
                                                    // Append tag to input
                                                    const current = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                                                    if (!current.includes(tag.name)) {
                                                        const newVal = [...current, tag.name].join(', ');
                                                        setTagsInput(newVal);
                                                        // Keep focus
                                                        tagInputRef.current?.focus();
                                                    }
                                                }}
                                            >
                                                #{tag.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <Button size="sm" className="w-full mt-1" onClick={handleTagSubmit}>
                                    Apply Tags
                                </Button>
                            </div>
                        )}
                        <Button
                            variant={isTagOpen ? "secondary" : "outline"}
                            size="sm"
                            className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                            onClick={() => {
                                setIsTagOpen(!isTagOpen);
                                setIsMoveOpen(false);
                            }}
                        >
                            <Tag className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Tags</span>
                        </Button>
                    </div>
                )}

                {/* Move */}
                <div className="relative">
                    {isMoveOpen && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-popover border rounded-lg p-3 shadow-xl w-64 animate-in zoom-in-95 duration-200 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={moveInputRef}
                                    className="bg-muted px-2 py-1.5 rounded text-sm outline-none w-full border focus:border-primary"
                                    placeholder="New folder name..."
                                    value={targetFolder}
                                    onChange={(e) => setTargetFolder(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleMoveSubmit();
                                    }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsMoveOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {allFolders && allFolders.length > 0 && (
                                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                    {allFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            className="text-sm text-left px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 transition-colors"
                                            onClick={() => handleMoveSubmit(folder.name)}
                                        >
                                            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="truncate">{folder.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <Button size="sm" className="w-full mt-1" onClick={() => handleMoveSubmit()}>
                                Move to Folder
                            </Button>
                        </div>
                    )}
                    <Button
                        variant={isMoveOpen ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                        onClick={() => {
                            setIsMoveOpen(!isMoveOpen);
                            setIsTagOpen(false);
                        }}
                    >
                        <FolderInput className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span className="hidden sm:inline">Move</span>
                    </Button>
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

// Add click outside or similar if needed for robustness
