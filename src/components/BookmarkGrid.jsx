import * as React from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { BookmarkGridCard } from './bookmark/BookmarkGridCard';

export function BookmarkGrid({
    bookmarks,
    selectedIds,
    toggleSelection,
    onPreview,
    onEdit,
    showThumbnails,
    availableFolders = [],
    availableTags = [],
    detailed = false,
    allCollections = [],
    onRemoveFromCollection
}) {
    // Define the grid item structure
    const ItemContent = (index, bookmark, context) => {
        const ctx = context || {};
        const isSelected = ctx.selectedIds?.has(bookmark.id);

        const folderName = bookmark.newFolder || bookmark.originalFolder;
        const folderConfig = ctx.availableFolders?.find(f => (typeof f === 'string' ? f === folderName : f?.name === folderName));
        const folderColor = typeof folderConfig === 'object' ? folderConfig?.color : null;

        return (
            <BookmarkGridCard
                bookmark={bookmark}
                index={index}
                isSelected={isSelected}
                folderColor={folderColor}
                folderName={folderName}
                context={ctx}
                showThumbnails={showThumbnails}
                detailed={detailed}
            />
        );
    };

    // Force a new data reference when metadata changes to trigger Virtuoso refresh
    const displayData = React.useMemo(() => [...bookmarks], [bookmarks]);

    return (
        <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={displayData.length}
            context={{
                selectedIds,
                toggleSelection,
                onPreview,
                onEdit,
                showThumbnails,
                availableFolders,
                availableTags,
                allCollections,
                onRemoveFromCollection
            }}
            data={displayData}
            itemContent={ItemContent}
            listClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 px-4"
            components={{
                Header: () => <div className="h-1"></div>,
                Footer: () => <div className="h-1"></div>
            }}
            overscan={200}
        />
    );
}
