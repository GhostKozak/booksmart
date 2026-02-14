import React, { useState, useRef, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { Button } from '../ui/button';

export function TagBulkPopover({ allTags, onApply, isOpen, onToggle }) {
    const [tagsInput, setTagsInput] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (tagsInput.trim()) {
            onApply(tagsInput);
            onToggle();
            setTagsInput('');
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
                            placeholder="Add tags..."
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmit();
                            }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggle}>
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
                                        const current = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                                        if (!current.includes(tag.name)) {
                                            const newVal = [...current, tag.name].join(', ');
                                            setTagsInput(newVal);
                                            inputRef.current?.focus();
                                        }
                                    }}
                                >
                                    #{tag.name}
                                </button>
                            ))}
                        </div>
                    )}
                    <Button size="sm" className="w-full mt-1" onClick={handleSubmit}>
                        Apply Tags
                    </Button>
                </div>
            )}
            <Button
                variant={isOpen ? "secondary" : "outline"}
                size="sm"
                className="rounded-full gap-2 h-9 sm:h-8 px-3 sm:px-4 shrink-0"
                onClick={onToggle}
            >
                <Tag className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Tags</span>
            </Button>
        </div>
    );
}
