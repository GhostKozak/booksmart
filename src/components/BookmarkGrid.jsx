import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Favicon } from './Favicon';
import { cn } from '../lib/utils';
import { Folder, ExternalLink } from 'lucide-react';

export function BookmarkGrid({ bookmarks, selectedIds, toggleSelection, onPreview, showThumbnails }) {

    // Define the grid item structure
    // We don't have direct access to "index" in ItemContent unless we wrapper it, but VirtuosoGrid provides data.
    const ItemContent = (index) => {
        const bookmark = bookmarks[index];
        const isSelected = selectedIds.has(bookmark.id);

        return (
            <div className="h-full flex flex-col">
                <Card
                    className={cn(
                        "h-full flex flex-col transition-all duration-200 cursor-pointer hover:shadow-md border overflow-hidden group",
                        isSelected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/20",
                    )}
                    onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                            toggleSelection(bookmark.id);
                        } else {
                            onPreview(bookmark);
                        }
                    }}
                >
                    {/* Screenshot Thumbnail - Only show if enabled */}
                    {showThumbnails && (
                        <div className="relative aspect-video w-full bg-muted/30 overflow-hidden border-b">
                            <img
                                src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=400&h=225`}
                                alt={`Screenshot of ${bookmark.title}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                            {/* Fallback pattern if image fails or while loading */}
                            <div className="absolute inset-0 hidden items-center justify-center bg-secondary/50">
                                <Favicon url={bookmark.url} className="w-12 h-12 opacity-50 grayscale" />
                            </div>

                            {/* Selection Overlay */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                                        <Folder className="w-6 h-6" />
                                    </div>
                                </div>
                            )}

                            <div className="absolute top-2 right-2">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelection(bookmark.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-background/80 backdrop-blur-sm shadow-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-3 flex flex-col flex-1 gap-2">
                        <div className="flex items-start gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted/50 shrink-0 mt-0.5">
                                <Favicon url={bookmark.url} className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm line-clamp-1 leading-tight" title={bookmark.title}>
                                    {bookmark.title || 'Untitled'}
                                </h3>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 break-all opacity-80">
                                    {bookmark.url}
                                </p>
                            </div>
                            {!showThumbnails && (
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelection(bookmark.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 mt-0.5"
                                />
                            )}
                        </div>

                        <div className="pt-2 mt-auto border-t flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1 max-w-[70%]">
                                <Folder className="w-3 h-3 shrink-0" />
                                <span className="truncate" title={bookmark.newFolder || bookmark.originalFolder}>
                                    {bookmark.newFolder || bookmark.originalFolder}
                                </span>
                            </div>
                            {bookmark.addDate && (
                                <span className="opacity-70">
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
            listClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 px-4"
            components={{
                Header: () => <div className="h-1"></div>,
                Footer: () => <div className="h-1"></div>
            }}
            overscan={200}
        />
    );
}
