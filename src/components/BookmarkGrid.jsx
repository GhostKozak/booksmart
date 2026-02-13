import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Favicon } from './Favicon';
import { cn } from '../lib/utils';
import { Folder, ExternalLink } from 'lucide-react';

export function BookmarkGrid({ bookmarks, selectedIds, toggleSelection, onPreview }) {

    // Define the grid item structure
    // We don't have direct access to "index" in ItemContent unless we wrapper it, but VirtuosoGrid provides data.
    const ItemContent = (index) => {
        const bookmark = bookmarks[index];
        const isSelected = selectedIds.has(bookmark.id);

        return (
            <div className="p-2 h-full">
                <Card
                    className={cn(
                        "h-full flex flex-col transition-all duration-200 cursor-pointer hover:shadow-md border",
                        isSelected ? "ring-2 ring-primary border-primary/50 bg-primary/5" : "hover:border-primary/20",
                        // Make it feel interactive
                    )}
                    onClick={(e) => {
                        // Logic handled in App typically, but defining local behavior here for now:
                        // If Ctrl/Cmd, toggle selection
                        // Else, preview
                        if (e.ctrlKey || e.metaKey) {
                            toggleSelection(bookmark.id);
                        } else {
                            onPreview(bookmark);
                        }
                    }}
                >
                    <div className="p-3 flex flex-col h-full gap-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 shrink-0">
                                <Favicon url={bookmark.url} className="w-5 h-5" />
                            </div>
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(bookmark.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent card click
                                className="mt-1"
                            />
                        </div>

                        <div className="flex-1 min-h-0">
                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1" title={bookmark.title}>
                                {bookmark.title || 'Untitled'}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 break-all">
                                {bookmark.url}
                            </p>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground mt-auto">
                            <div className="flex items-center gap-1 max-w-[70%]">
                                <Folder className="w-3 h-3 shrink-0" />
                                <span className="truncate" title={bookmark.newFolder || bookmark.originalFolder}>
                                    {bookmark.newFolder || bookmark.originalFolder}
                                </span>
                            </div>
                            {bookmark.addDate && (
                                <span className="opacity-70 text-[10px]">
                                    {new Date(parseInt(bookmark.addDate) * 1000).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    return (
        <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={bookmarks.length}
            itemContent={ItemContent}
            // Responsive grid layout using Tailwind classes in a wrapper isn't enough for VirtuosoGrid, 
            // it needs a component structure or fixed item dimensions.
            // Using `listClassName` to apply grid styles to the container.
            listClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 p-4"
            overscan={200}
        />
    );
}
