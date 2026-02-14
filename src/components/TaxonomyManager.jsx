import React, { useState } from 'react';
import { Trash2, Plus, Folder, Tag, GripVertical, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn, generateUUID } from '../lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
];

function SortableItem({ id, item, onDelete, onColorChange, type }) {
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
        zIndex: isDragging ? 100 : (isColorPickerOpen ? 50 : 'auto'), // High z-index when open (above z-40 backdrop)
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <>
            {/* Backdrop to close picker */}
            {isColorPickerOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsColorPickerOpen(false)}
                />
            )}

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

                    {/* Color Dot / Picker */}
                    <div className="relative">
                        <div
                            className="w-4 h-4 rounded-full border cursor-pointer ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2"
                            style={{ backgroundColor: item.color }}
                            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                        />
                        {/* Color Picker Popover */}
                        {isColorPickerOpen && (
                            <div className="absolute left-0 top-full mt-2 bg-popover border rounded-md shadow-lg p-2 z-50 grid grid-cols-4 gap-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        className={cn(
                                            "w-5 h-5 rounded-full border transition-transform hover:scale-110",
                                            item.color === c && "ring-2 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => {
                                            onColorChange(item.id, c);
                                            setIsColorPickerOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

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
        </>
    );
}

export function TaxonomyManager({
    folders = [],
    setFolders,
    tags = [],
    setTags,
    defaultTab = 'folders'
}) {
    const [activeTab, setActiveTab] = useState(defaultTab); // 'folders' | 'tags'
    const [newItem, setNewItem] = useState('');
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = () => {
        if (!newItem.trim()) return;

        const setFn = activeTab === 'folders' ? setFolders : setTags;
        const list = activeTab === 'folders' ? folders : tags;
        const defaultColor = activeTab === 'folders' ? '#3b82f6' : '#10b981';

        // Check duplicate names
        if (!list.some(i => i.name.toLowerCase() === newItem.trim().toLowerCase())) {
            const newItemObj = {
                id: generateUUID(),
                name: newItem.trim(),
                color: defaultColor,
                order: list.length
            };
            setFn([...list, newItemObj]);
        }
        setNewItem('');
    };

    const handleDelete = (id) => {
        const setFn = activeTab === 'folders' ? setFolders : setTags;
        const list = activeTab === 'folders' ? folders : tags;
        setFn(list.filter(item => item.id !== id));
    };

    const handleColorChange = (id, color) => {
        const setFn = activeTab === 'folders' ? setFolders : setTags;
        const list = activeTab === 'folders' ? folders : tags;
        setFn(list.map(item => item.id === id ? { ...item, color } : item));
    }

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const setFn = activeTab === 'folders' ? setFolders : setTags;
            const list = activeTab === 'folders' ? folders : tags;

            setFn((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                // Update order property
                return newItems.map((item, idx) => ({ ...item, order: idx }));
            });
        }
        setActiveId(null);
    };

    const currentList = activeTab === 'folders' ? folders : tags;

    return (
        <div className="space-y-4">
            <div className="flex border-b">
                <button
                    className={cn(
                        "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'folders' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('folders')}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Folder className="h-4 w-4" /> Folders
                    </div>
                </button>
                <button
                    className={cn(
                        "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'tags' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab('tags')}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Tag className="h-4 w-4" /> Tags
                    </div>
                </button>
            </div>

            <div className="flex gap-2">
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={`Add new ${activeTab === 'folders' ? 'folder' : 'tag'}...`}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} disabled={!newItem.trim()}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 pb-10"> {/* Added pb-10 for color popover space */}
                {currentList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No {activeTab} defined yet.
                    </p>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={currentList.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {currentList.map((item) => (
                            <SortableItem
                                key={item.id}
                                id={item.id}
                                item={item}
                                onDelete={handleDelete}
                                onColorChange={handleColorChange}
                                type={activeTab}
                            />
                        ))}
                    </SortableContext>

                    {/* Placeholder for overlay if needed for smoother visual */}
                </DndContext>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Drag to reorder. Click the color dot to change color.
            </p>
        </div>
    );
}
