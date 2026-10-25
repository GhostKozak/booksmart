import React, { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Folder, ChevronDown, FolderOpen, GripVertical, CornerDownRight, FolderPlus, Check, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { BookmarkTreeLeaf } from './BookmarkTreeLeaf'

export const BookmarkTreeFolder = ({
    node,
    path,
    depth,
    expandedFolders,
    toggleFolder,
    selectedIds,
    toggleSelection,
    onPreview,
    onEdit,
    onMergeDuplicate,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    activeDragItem,
    onCreateSubfolder,
    t
}) => {
    const isExpanded = expandedFolders.has(path)
    const hasChildren = Object.keys(node.subfolders).length > 0 || node.bookmarks.length > 0
    const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false)
    const [newSubfolderName, setNewSubfolderName] = useState('')

    // Get bookmark count inside this folder recursively
    const getDeepCount = (folderNode) => {
        let count = folderNode.bookmarks.length
        Object.values(folderNode.subfolders).forEach(sub => {
            count += getDeepCount(sub)
        })
        return count
    }

    const totalCount = getDeepCount(node)

    // Select all bookmarks inside this folder recursively
    const getDeepBookmarkIds = (folderNode, ids = []) => {
        folderNode.bookmarks.forEach(b => ids.push(b.id))
        Object.values(folderNode.subfolders).forEach(sub => {
            getDeepBookmarkIds(sub, ids)
        })
        return ids
    }

    const folderBookmarkIds = getDeepBookmarkIds(node)
    const isFolderAllSelected = folderBookmarkIds.length > 0 && folderBookmarkIds.every(id => selectedIds.has(id))
    const isFolderSomeSelected = folderBookmarkIds.some(id => selectedIds.has(id)) && !isFolderAllSelected

    const handleCheckboxChange = () => {
        const setSelectedIds = useAppStore.getState().setSelectedIds
        const currentSelected = new Set(selectedIds)

        if (isFolderAllSelected) {
            folderBookmarkIds.forEach(id => currentSelected.delete(id))
        } else {
            folderBookmarkIds.forEach(id => currentSelected.add(id))
        }
        setSelectedIds(currentSelected)
    }

    const handleConfirmCreate = () => {
        const trimmed = newSubfolderName.trim()
        if (!trimmed) {
            setIsCreatingSubfolder(false)
            return
        }
        const newPath = `${path} > ${trimmed}`
        onCreateSubfolder?.(newPath)
        setNewSubfolderName('')
        setIsCreatingSubfolder(false)
    }

    const handleCancelCreate = () => {
        setNewSubfolderName('')
        setIsCreatingSubfolder(false)
    }

    // Draggable hook for moving this folder
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging
    } = useDraggable({
        id: `folder:${path}`,
        data: {
            type: 'folder',
            path,
            name: node.name,
            count: totalCount
        }
    })

    // Droppable hook for accepting other folders or bookmarks inside this folder
    const {
        setNodeRef: setDropRef,
        isOver
    } = useDroppable({
        id: `drop:folder:${path}`,
        data: {
            type: 'folder',
            path
        }
    })

    // Validate if current active dragged item can be dropped here
    const canDrop = (() => {
        if (!activeDragItem) return false
        if (activeDragItem.type === 'folder') {
            // Cannot drop onto itself
            if (activeDragItem.path === path) return false
            // Cannot drop parent into its own child (Cycle prevention)
            if (path.startsWith(activeDragItem.path + ' > ')) return false
            return true
        }
        if (activeDragItem.type === 'bookmark') {
            const currentBookmarkFolder = activeDragItem.bookmark.newFolder || activeDragItem.bookmark.originalFolder || ''
            return currentBookmarkFolder !== path
        }
        return false
    })()

    const isDropTarget = isOver && canDrop

    return (
        <div className="select-none">
            {/* Folder Header Row */}
            <div
                ref={setDropRef}
                className={cn(
                    "flex items-center justify-between py-1.5 px-3 hover:bg-muted/30 cursor-pointer border-b border-muted/5 transition-all group/folder relative",
                    isDragging && "opacity-35 bg-muted/50",
                    isDropTarget && "bg-primary/15 ring-2 ring-primary ring-inset border-primary/40 font-bold"
                )}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => toggleFolder(path)}
            >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Drag Handle */}
                    <div
                        ref={setDragRef}
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground group-hover/folder:text-muted-foreground/60 transition-colors p-0.5 -ml-1 rounded shrink-0"
                        title={t('bookmarks.tree.dragFolder', 'Drag to move folder')}
                        aria-label={t('bookmarks.tree.dragFolder', 'Drag to move folder')}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </div>

                    {/* Collapsible toggle */}
                    {hasChildren ? (
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground/70 transition-transform shrink-0 hover:text-primary", !isExpanded && "-rotate-90")} />
                    ) : (
                        <div className="w-4 h-4 shrink-0" />
                    )}

                    {/* Checkbox for selecting folder contents */}
                    <div onClick={e => e.stopPropagation()} className="flex items-center shrink-0">
                        <Checkbox
                            checked={isFolderAllSelected}
                            className={cn(isFolderSomeSelected && "data-[state=unchecked]:bg-primary/20 data-[state=unchecked]:text-primary")}
                            onCheckedChange={handleCheckboxChange}
                            aria-label={t('common.select')}
                        />
                    </div>

                    {isExpanded ? (
                        <FolderOpen className={cn("h-4 w-4 shrink-0 transition-colors", isDropTarget ? "text-primary fill-primary/20" : "text-blue-500 fill-blue-500/10")} />
                    ) : (
                        <Folder className={cn("h-4 w-4 shrink-0 transition-colors", isDropTarget ? "text-primary fill-primary/20" : "text-blue-500 fill-blue-500/10")} />
                    )}

                    <span className={cn("truncate text-sm font-semibold transition-colors", isDropTarget ? "text-primary" : "text-foreground/90")}>
                        {node.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-normal shrink-0">
                        ({totalCount})
                    </span>

                    {/* Drop Indicator Badge */}
                    {isDropTarget && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground animate-pulse shrink-0">
                            <CornerDownRight className="w-2.5 h-2.5" />
                            <span>{t('bookmarks.tree.nestInto', 'Nest Into')}</span>
                        </span>
                    )}
                </div>

                {/* Right Actions: Add Subfolder Button (Visible on Hover) */}
                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover/folder:opacity-100 hover:bg-primary/10 hover:text-primary transition-opacity cursor-pointer rounded-md"
                        onClick={() => {
                            if (!isExpanded) {
                                toggleFolder(path)
                            }
                            setIsCreatingSubfolder(true)
                        }}
                        title={t('bookmarks.tree.addSubfolder', 'Add Subfolder')}
                        aria-label={t('bookmarks.tree.addSubfolder', 'Add Subfolder')}
                    >
                        <FolderPlus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                    </Button>
                </div>
            </div>

            {/* Folder Contents */}
            {isExpanded && (
                <div className="space-y-0.5">
                    {/* Inline New Subfolder Input Row */}
                    {isCreatingSubfolder && (
                        <div
                            className="flex items-center gap-2 py-1.5 px-3 bg-primary/5 border-b border-primary/20 animate-in fade-in duration-150"
                            style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
                        >
                            <Folder className="h-4 w-4 text-primary shrink-0 fill-primary/10" />
                            <Input
                                autoFocus
                                type="text"
                                value={newSubfolderName}
                                onChange={e => setNewSubfolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleConfirmCreate()
                                    if (e.key === 'Escape') handleCancelCreate()
                                }}
                                placeholder={t('bookmarks.tree.newSubfolderPlaceholder', 'Subfolder name...')}
                                className="h-7 text-xs bg-background py-1 px-2 border-primary/40 focus:border-primary flex-1 min-w-[140px] max-w-xs rounded-md shadow-xs"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-6 w-6 rounded-md cursor-pointer"
                                    onClick={handleConfirmCreate}
                                    title={t('common.save', 'Save')}
                                    aria-label={t('common.save', 'Save')}
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={handleCancelCreate}
                                    title={t('common.cancel', 'Cancel')}
                                    aria-label={t('common.cancel', 'Cancel')}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Render subfolders sorted by name */}
                    {Object.values(node.subfolders)
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                        .map(sub => (
                            <BookmarkTreeFolder
                                key={sub.name}
                                node={sub}
                                path={`${path} > ${sub.name}`}
                                depth={depth + 1}
                                expandedFolders={expandedFolders}
                                toggleFolder={toggleFolder}
                                selectedIds={selectedIds}
                                toggleSelection={toggleSelection}
                                onPreview={onPreview}
                                onEdit={onEdit}
                                onMergeDuplicate={onMergeDuplicate}
                                linkHealth={linkHealth}
                                ignoredUrls={ignoredUrls}
                                toggleIgnoreUrl={toggleIgnoreUrl}
                                activeDragItem={activeDragItem}
                                onCreateSubfolder={onCreateSubfolder}
                                t={t}
                            />
                        ))}

                    {/* Render bookmarks in this exact folder */}
                    {node.bookmarks.map(bookmark => (
                        <BookmarkTreeLeaf
                            key={bookmark.id}
                            bookmark={bookmark}
                            depth={depth + 1}
                            selectedIds={selectedIds}
                            toggleSelection={toggleSelection}
                            onPreview={onPreview}
                            onEdit={onEdit}
                            onMergeDuplicate={onMergeDuplicate}
                            linkHealth={linkHealth}
                            ignoredUrls={ignoredUrls}
                            toggleIgnoreUrl={toggleIgnoreUrl}
                            t={t}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
