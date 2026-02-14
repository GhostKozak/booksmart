import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';

export function DiscoveredTaxonomy({ items, onAdd, type }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="mt-8 border-t pt-6">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Plus className="h-3 w-3 text-muted-foreground" />
                <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Discovered in Bookmarks
                </h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {items.map((item) => (
                    <div
                        key={item.name}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-dashed hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full opacity-50"
                                style={{ backgroundColor: type === 'folders' ? '#3b82f6' : '#10b981' }}
                            />
                            <span className="text-sm italic text-muted-foreground">{item.name}</span>
                            <span className="text-[10px] bg-muted px-1 rounded opacity-70">count: {item.count}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onAdd(item.name)}
                            title="Add to permanent list"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
