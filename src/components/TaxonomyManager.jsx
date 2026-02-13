import React, { useState } from 'react';
import { Trash2, Plus, Folder, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export function TaxonomyManager({
    folders = [],
    setFolders,
    tags = [],
    setTags
}) {
    const [activeTab, setActiveTab] = useState('folders'); // 'folders' | 'tags'
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (!newItem.trim()) return;

        if (activeTab === 'folders') {
            if (!folders.includes(newItem.trim())) {
                setFolders([...folders, newItem.trim()]);
            }
        } else {
            if (!tags.includes(newItem.trim())) {
                setTags([...tags, newItem.trim()]);
            }
        }
        setNewItem('');
    };

    const handleDelete = (item) => {
        if (activeTab === 'folders') {
            setFolders(folders.filter(f => f !== item));
        } else {
            setTags(tags.filter(t => t !== item));
        }
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

            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {currentList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No {activeTab} defined yet.
                    </p>
                )}
                {currentList.map((item) => (
                    <div key={item} className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted group">
                        <span className="text-sm font-medium">{item}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(item)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
