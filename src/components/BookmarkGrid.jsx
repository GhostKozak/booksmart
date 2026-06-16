import * as React from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Favicon } from './Favicon';
import { cn } from '../lib/utils';
import { Folder, ExternalLink, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { LinkTooltip } from './bookmark/LinkTooltip';

// Extracted Item Component for state management
const GridItem = ({ bookmark, index, isSelected, folderColor, folderName, context, showThumbnails }) => {
    const { t } = useTranslation();
    const [imageStatus, setImageStatus] = React.useState('loading'); // 'loading' | 'loaded' | 'error'

    // Reset loading state if thumbnail visibility toggles or bookmark changes
    React.useEffect(() => {
        if (showThumbnails) {
            setImageStatus('loading');
        }
    }, [showThumbnails, bookmark.id]);

    return (
        <div className="flex flex-col h-full">
            <Card
                className={cn(
                    "group relative flex flex-col hover:shadow-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2 h-full overflow-hidden transition-all hover:-translate-y-1 cursor-pointer",
                    isSelected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/20",
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (e.ctrlKey || e.metaKey) {
                            context.toggleSelection(bookmark.id);
                        } else {
                            context.onPreview(bookmark);
                        }
                    }
                }}
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
                    <div className="relative bg-muted/30 border-b w-full aspect-video overflow-hidden">
                        {imageStatus !== 'error' && (
                            <img
                                src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(bookmark.url)}?w=400&h=225`}
                                alt={`Screenshot of ${bookmark.title}`}
                                className={cn(
                                    "w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out",
                                    imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                                )}
                                loading="lazy"
                                onLoad={() => setImageStatus('loaded')}
                                onError={() => setImageStatus('error')}
                            />
                        )}

                        {/* Loading State or Error Fallback */}
                        {(imageStatus === 'loading' || imageStatus === 'error') && (
                            <div className="absolute inset-0 flex justify-center items-center bg-secondary/50">
                                <Favicon url={bookmark.url} className="opacity-50 grayscale w-12 h-12" />
                            </div>
                        )}

                        {/* Selection Overlay */}
                        {isSelected && (
                            <div className="z-5 absolute inset-0 flex justify-center items-center bg-primary/10">
                                <div className="bg-primary p-1 rounded-full text-primary-foreground">
                                    <Folder className="w-6 h-6" />
                                </div>
                            </div>
                        )}

                        <div className="top-2 right-2 z-10 absolute flex gap-1">
                            <Button
                                variant="secondary"
                                size="icon"
                                className="bg-background/80 hover:bg-primary shadow-sm backdrop-blur-sm w-6 h-6 hover:text-primary-foreground transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    context.onPreview(bookmark);
                                }}
                                title={t('preview.open')}
                                aria-label={t('preview.open')}
                            >
                                <Eye className="w-3 h-3" />
                            </Button>
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => context.toggleSelection(bookmark.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-background/80 data-[state=checked]:bg-primary shadow-sm backdrop-blur-sm focus-visible:ring-2 data-[state=checked]:text-primary-foreground"
                                aria-label={t('common.select')}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col flex-1 gap-2 p-3">
                    <div className="flex items-start gap-2">
                        <div className="flex justify-center items-center bg-muted/50 mt-0.5 rounded-full w-6 h-6 shrink-0">
                            <Favicon url={bookmark.url} className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <LinkTooltip bookmark={bookmark}>
                                <h3 className="font-semibold text-sm line-clamp-1 leading-tight" title={bookmark.title}>
                                    {bookmark.title || t('common.untitled')}
                                </h3>
                                <p className="opacity-80 text-[10px] text-muted-foreground break-all line-clamp-1">
                                    {bookmark.url}
                                </p>
                            </LinkTooltip>
                        </div>
                        {!showThumbnails && (
                            <div className="flex items-center gap-1 mt-0.5 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        context.onPreview(bookmark);
                                    }}
                                    title={t('preview.open')}
                                    aria-label={t('preview.open')}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </Button>
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => context.toggleSelection(bookmark.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={t('common.select')}
                                />
                            </div>
                        )}
                    </div>

                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 h-5 overflow-hidden">
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
                                            "px-1 py-0.5 border rounded-[3px] font-medium text-[8px] whitespace-nowrap",
                                            !customColor && "bg-purple-100/50 text-purple-700/70 border-purple-200/50 dark:bg-purple-900/10 dark:text-purple-400/70 dark:border-purple-800/30"
                                        )}>
                                        #{tag}
                                    </span>
                                )
                            })}
                            {bookmark.tags.length > 3 && (
                                <span className="self-center opacity-60 text-[8px] text-muted-foreground">
                                    +{bookmark.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-auto pt-2 border-t text-[10px] text-muted-foreground">
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


    // Define the grid item structure
    const ItemContent = (index, bookmark, context) => {
        const ctx = context || {};
        const isSelected = ctx.selectedIds?.has(bookmark.id);

        const folderName = bookmark.newFolder || bookmark.originalFolder;
        const folderConfig = ctx.availableFolders?.find(f => f.name === folderName);
        const folderColor = folderConfig ? folderConfig.color : null;

        return (
            <GridItem
                bookmark={bookmark}
                index={index}
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
