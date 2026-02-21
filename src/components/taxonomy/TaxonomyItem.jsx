import React, { useState } from 'react';
import { Trash2, GripVertical, StickyNote, ChevronDown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/ColorPicker';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export function TaxonomyItem({ id, item, onDelete, onColorChange, onNoteChange }) {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : (isColorPickerOpen ? 50 : 'auto'),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "rounded-md bg-muted/50 hover:bg-muted group border mb-1 relative",
                isDragging && "bg-background shadow-lg"
            )}
        >
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3 flex-1">
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>

                    <ColorPicker
                        currentColor={item.color}
                        isOpen={isColorPickerOpen}
                        onToggle={() => setIsColorPickerOpen(!isColorPickerOpen)}
                        onSelect={(color) => onColorChange(item.id, color)}
                    />

                    <span className="text-sm font-medium">{item.name}</span>

                    {item.note && !isNoteOpen && (
                        <StickyNote className="h-3 w-3 text-amber-500/60" />
                    )}
                </div>

                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 text-muted-foreground transition-opacity",
                            isNoteOpen ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={() => setIsNoteOpen(!isNoteOpen)}
                        title={t('notes.toggle')}
                    >
                        <StickyNote className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDelete(item.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {isNoteOpen && (
                <div className="px-2 pb-2 animate-in slide-in-from-top-1 duration-150">
                    <textarea
                        value={item.note || ''}
                        onChange={(e) => onNoteChange(item.id, e.target.value)}
                        placeholder={t('notes.placeholder')}
                        className="w-full bg-background/80 border rounded-md p-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[40px] max-h-[80px]"
                        rows={2}
                    />
                </div>
            )}
        </div>
    );
}
