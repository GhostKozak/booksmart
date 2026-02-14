import React, { useState } from 'react';
import { Plus, Folder, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn, generateUUID } from '../lib/utils';
import {
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { TaxonomyList } from './taxonomy/TaxonomyList';
import { DiscoveredTaxonomy } from './taxonomy/DiscoveredTaxonomy';

export function TaxonomyManager({
    folders = [],
    setFolders,
    tags = [],
    setTags,
    discoveredFolders = [],
    discoveredTags = [],
    defaultTab = 'folders'
}) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [newItem, setNewItem] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = (name) => {
        const value = name || newItem.trim();
        if (!value) return;

        const setFn = activeTab === 'folders' ? setFolders : setTags;
        const list = activeTab === 'folders' ? folders : tags;
        const defaultColor = activeTab === 'folders' ? '#3b82f6' : '#10b981';

        if (!list.some(i => i.name.toLowerCase() === value.toLowerCase())) {
            const newItemObj = {
                id: generateUUID(),
                name: value,
                color: defaultColor,
                order: list.length
            };
            setFn([...list, newItemObj]);
        }
        if (!name) setNewItem('');
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

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active && over && active.id !== over.id) {
            const setFn = activeTab === 'folders' ? setFolders : setTags;

            setFn((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                return newItems.map((item, idx) => ({ ...item, order: idx }));
            });
        }
    };

    const currentList = activeTab === 'folders' ? folders : tags;
    const discoveredList = activeTab === 'folders' ? discoveredFolders : discoveredTags;

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
                <Button onClick={() => handleAdd()} disabled={!newItem.trim()}>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 pb-10">
                {currentList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No {activeTab} defined yet.
                    </p>
                )}

                <TaxonomyList
                    items={currentList}
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                    onDelete={handleDelete}
                    onColorChange={handleColorChange}
                />

                <DiscoveredTaxonomy
                    items={discoveredList}
                    type={activeTab}
                    onAdd={handleAdd}
                />
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Drag to reorder. Click the color dot to change color.
            </p>
        </div>
    );
}
