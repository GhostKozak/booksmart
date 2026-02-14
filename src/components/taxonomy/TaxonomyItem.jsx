import React, { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/ColorPicker';
import { cn } from '../../lib/utils';

export function TaxonomyItem({ id, item, onDelete, onColorChange }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

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
                "flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted group border mb-1 relative",
                isDragging && "bg-background shadow-lg"
            )}
        >
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
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(item.id)}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
    );
}
