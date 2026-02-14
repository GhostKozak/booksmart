import * as React from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Favicon } from './Favicon';
import { cn } from '../lib/utils';
import { Folder, ExternalLink } from 'lucide-react';

// Extracted Item Component for state management
const GridItem = ({ bookmark, isSelected, folderColor, folderName, context, showThumbnails }) => {
    const [imageStatus, setImageStatus] = React.useState('loading'); // 'loading' | 'loaded' | 'error'

    // Reset loading state if thumbnail visibility toggles or bookmark changes
    React.useEffect(() => {
        if (showThumbnails) {
            setImageStatus('loading');
        }
    }, [showThumbnails, bookmark.id]);

    return (
        <div className="h-full flex flex-col">
            <Card
                className={cn(
                    "h-full flex flex-col transition-all duration-200 cursor-pointer hover:shadow-md border overflow-hidden group relative",
                    isSelected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/20",
                )}
                onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                        context.toggleSelection(bookmark.id);
                    } else {
                        context.onPreview(bookmark);
                    }
                }}
            >
                {/* Screenshot Thumbnail */}
                {showThumbnails && (
                    <div className="relative aspect-video w-full bg-muted/30 overflow-hidden border-b">
                        {imageStatus !== 'error' && (
                            <img
                                src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=400&h=225`}
                                alt={`Screenshot of ${bookmark.title}`}
                                className={cn(
                                    "w-full h-full object-cover transition-opacity duration-500 group-hover:scale-105",
                                    imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                                )}
                                loading="lazy"
                                onLoad={() => setImageStatus('loaded')}
                                onError={() => setImageStatus('error')}
                            />
                        )}

                        {/* Loading State or Error Fallback */}
                        {(imageStatus === 'loading' || imageStatus === 'error') && (
                            <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                                <Favicon url={bookmark.url} className="w-12 h-12 opacity-50 grayscale" />
                            </div>
                        )}

                        {/* Selection Overlay */}
                        {isSelected && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center z-10">
                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                    <Folder className="w-6 h-6" />
                                </div>
                            </div>
                        )}

                        <div className="absolute top-2 right-2 z-20">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => context.toggleSelection(bookmark.id)}
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
                                onCheckedChange={() => context.toggleSelection(bookmark.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 mt-0.5"
                            />
                        )}
                    </div>

                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap overflow-hidden h-5">
                            {bookmark.tags.slice(0, 3).map(tag => {
                                const tagConfig = context.availableTags?.find(t => t.name === tag);
                                const customColor = tagConfig ? tagConfig.color : null;

                                const style = customColor ? {
                                    backgroundColor: customColor + '15',
                                    color: customColor,
                                    borderColor: customColor + '40'
                                } : {};

                                return (
                                    <span key={tag}
                                        style={style}
                                        className={cn(
                                            "px-1 py-0.5 rounded-[3px] text-[8px] font-medium border whitespace-nowrap",
                                            !customColor && "bg-purple-100/50 text-purple-700/70 border-purple-200/50 dark:bg-purple-900/10 dark:text-purple-400/70 dark:border-purple-800/30"
                                        )}>
                                        #{tag}
                                    </span>
                                )
                            })}
                            {bookmark.tags.length > 3 && (
                                <span className="text-[8px] text-muted-foreground self-center opacity-60">
                                    +{bookmark.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="pt-2 mt-auto border-t flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1 max-w-[70%]">
                            <Folder
                                className="w-3 h-3 shrink-0"
                                style={{ color: folderColor }}
                            />
                            <span
                                className="truncate"
                                title={folderName}
                                style={{ color: folderColor }}
                            >
                                {folderName}
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

export function BookmarkGrid({ bookmarks, selectedIds, toggleSelection, onPreview, showThumbnails, availableFolders = [], availableTags = [] }) {
    console.log("BookmarkGrid rendering, showThumbnails:", showThumbnails);

    // Define the grid item structure
    // We don't have direct access to "index" in ItemContent unless we wrapper it, but VirtuosoGrid provides data.
    const ItemContent = (index, context) => {
        const bookmark = bookmarks[index];
        const ctx = context || {};
        const isSelected = ctx.selectedIds?.has(bookmark.id);

        const folderName = bookmark.newFolder || bookmark.originalFolder;
        const folderConfig = ctx.availableFolders?.find(f => f.name === folderName);
        const folderColor = folderConfig ? folderConfig.color : null;

        return (
            <GridItem
                bookmark={bookmark}
                isSelected={isSelected}
                folderColor={folderColor}
                folderName={folderName}
                context={ctx}
                showThumbnails={showThumbnails} // Pass directly from prop closure
            />
        );
    };

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks])

    return (
        <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={displayData.length}
            context={{
                selectedIds,
                toggleSelection,
                onPreview,
                showThumbnails,
                availableFolders,
                availableTags // Although not used here yet (no tags in grid), passing for consistency/future
            }}
            data={displayData}
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
