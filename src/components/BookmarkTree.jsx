import React, { useState, useMemo, useCallback } from 'react'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Folder, FolderTree, FolderPlus, Check, X } from 'lucide-react'
import { Favicon } from './Favicon'
import { useTranslation } from 'react-i18next'
import { db } from '../db'
import { generateUUID } from '../lib/utils'
import { toast } from 'sonner'
import { BookmarkTreeFolder } from './bookmark/BookmarkTreeFolder'
import { BookmarkTreeLeaf } from './bookmark/BookmarkTreeLeaf'
import { BookmarkTreeRootDropZone } from './bookmark/BookmarkTreeRootDropZone'

export function BookmarkTree({
    bookmarks,
    selectedIds,
    toggleSelection,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    onMergeDuplicate,
    onMoveFolder,
    onMoveBookmark,
    availableFolders = []
}) {
    const { t } = useTranslation()
    const [activeDragItem, setActiveDragItem] = useState(null)
    const [extraFolders, setExtraFolders] = useState([])
    const [isCreatingRootFolder, setIsCreatingRootFolder] = useState(false)
    const [newRootFolderName, setNewRootFolderName] = useState('')

    // Setup DnD sensors with a distance threshold of 8px to keep simple clicks responsive
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    )

    // Build hierarchical tree structure from flat bookmarks list and configured folders
    const tree = useMemo(() => {
        const root = { subfolders: {}, bookmarks: [] }

        const addPathToTree = (folderStr) => {
            if (!folderStr || folderStr === 'Root') return
            const parts = folderStr.split(' > ').map(p => p.trim()).filter(Boolean)
            let current = root
            parts.forEach(part => {
                if (!current.subfolders[part]) {
                    current.subfolders[part] = { name: part, subfolders: {}, bookmarks: [] }
                }
                current = current.subfolders[part]
            })
        }

        // 1. Configured folders from availableFolders
        availableFolders.forEach(folderObj => {
            const folderName = typeof folderObj === 'string' ? folderObj : folderObj?.name
            addPathToTree(folderName)
        })

        // 2. Extra created folders in current view session
        extraFolders.forEach(folderName => {
            addPathToTree(folderName)
        })

        // 3. Bookmarks and their folders
        bookmarks.forEach(bookmark => {
            const folderStr = bookmark.newFolder || bookmark.originalFolder || 'Root'
            const parts = folderStr.split(' > ').map(p => p.trim()).filter(Boolean)

            if (parts.length === 0) {
                root.bookmarks.push(bookmark)
                return
            }

            let current = root
            parts.forEach(part => {
                if (!current.subfolders[part]) {
                    current.subfolders[part] = { name: part, subfolders: {}, bookmarks: [] }
                }
                current = current.subfolders[part]
            })
            current.bookmarks.push(bookmark)
        })

        return root
    }, [bookmarks, availableFolders, extraFolders])

    // Local state to keep track of expanded folder paths
    const [expandedFolders, setExpandedFolders] = useState(() => {
        // Expand first-level folders by default
        const initial = new Set()
        Object.keys(tree.subfolders).forEach(k => initial.add(k))
        return initial
    })

    const toggleFolder = useCallback((path) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(path)) {
                next.delete(path)
            } else {
                next.add(path)
            }
            return next
        })
    }, [])

    const handleExpandAll = () => {
        const allPaths = new Set()
        const collectPaths = (node, currentPath = '') => {
            Object.keys(node.subfolders).forEach(name => {
                const nextPath = currentPath ? `${currentPath} > ${name}` : name
                allPaths.add(nextPath)
                collectPaths(node.subfolders[name], nextPath)
            })
        }
        collectPaths(tree)
        setExpandedFolders(allPaths)
    }

    const handleCollapseAll = () => {
        setExpandedFolders(new Set())
    }

    // Create a new folder (root or subfolder)
    const handleCreateFolder = useCallback(async (folderPath) => {
        if (!folderPath) return
        const parts = folderPath.split(' > ').map(p => p.trim()).filter(Boolean)
        const cleanPath = parts.join(' > ')
        const folderName = parts[parts.length - 1]

        // Persist to Dexie db.folders
        try {
            const existing = await db.folders.where('name').equals(cleanPath).first()
            if (!existing) {
                await db.folders.add({
                    id: generateUUID(),
                    name: cleanPath,
                    color: '#3b82f6',
                    order: availableFolders.length + extraFolders.length
                })
            }
        } catch {
            // DB might be mocked in test environment
        }

        // Add to local state and auto-expand ancestors
        setExtraFolders(prev => [...new Set([...prev, cleanPath])])
        setExpandedFolders(prev => {
            const next = new Set(prev)
            let curr = ''
            parts.forEach(p => {
                curr = curr ? `${curr} > ${p}` : p
                next.add(curr)
            })
            return next
        })

        toast.success(t('bookmarks.tree.folderCreated', {
            name: folderName,
            defaultValue: `Created folder "${folderName}"`
        }))
    }, [availableFolders.length, extraFolders.length, t])

    const handleConfirmRootCreate = () => {
        const trimmed = newRootFolderName.trim()
        if (trimmed) {
            handleCreateFolder(trimmed)
        }
        setNewRootFolderName('')
        setIsCreatingRootFolder(false)
    }

    const handleCancelRootCreate = () => {
        setNewRootFolderName('')
        setIsCreatingRootFolder(false)
    }

    const handleDragStart = (event) => {
        const data = event.active.data.current
        if (data) {
            setActiveDragItem(data)
        }
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        setActiveDragItem(null)

        if (!active || !over) return

        const activeData = active.data.current
        const overData = over.data.current

        if (!activeData || !overData) return

        if (activeData.type === 'folder' && onMoveFolder) {
            const sourcePath = activeData.path
            const targetParent = overData.type === 'root' ? null : (overData.type === 'folder' ? overData.path : null)
            const leafName = sourcePath.split(' > ').pop()
            const newPath = targetParent ? `${targetParent} > ${leafName}` : leafName

            if (sourcePath !== newPath) {
                setExtraFolders(prev => prev.map(f => {
                    if (f === sourcePath) return newPath
                    if (f.startsWith(sourcePath + ' > ')) {
                        return newPath + f.slice(sourcePath.length)
                    }
                    return f
                }))
            }

            if (overData.type === 'root') {
                onMoveFolder(sourcePath, null)
            } else if (overData.type === 'folder') {
                onMoveFolder(sourcePath, overData.path)
            }
        } else if (activeData.type === 'bookmark' && onMoveBookmark) {
            const bookmarkId = activeData.id
            if (overData.type === 'root') {
                onMoveBookmark(bookmarkId, '')
            } else if (overData.type === 'folder') {
                onMoveBookmark(bookmarkId, overData.path)
            }
        }
    }

    const handleDragCancel = () => {
        setActiveDragItem(null)
    }

    const hasSubfolders = Object.keys(tree.subfolders).length > 0

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className="bg-card rounded-xl border shadow-xs overflow-hidden h-full flex flex-col">
                {/* Header / Actions toolbar */}
                <div className="bg-muted/30 border-b p-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 pl-2">
                        <FolderTree className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('header.treeView', 'Folder Tree')}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                            • {t('bookmarks.tree.hint', 'Drag folders to nest them or move to root level')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1.5 rounded-lg border-primary/30 hover:border-primary text-primary hover:bg-primary/5 cursor-pointer"
                            onClick={() => setIsCreatingRootFolder(true)}
                            title={t('bookmarks.tree.addRootFolder', 'Create New Root Folder')}
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>{t('bookmarks.tree.newFolderBtn', 'New Folder')}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleExpandAll}>
                            {t('bookmarks.tree.expandAll', 'Expand All')}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleCollapseAll}>
                            {t('bookmarks.tree.collapseAll', 'Collapse All')}
                        </Button>
                    </div>
                </div>

                {/* Drop Zone to Unnest to Root Level */}
                <BookmarkTreeRootDropZone activeDragItem={activeDragItem} />

                {/* Inline New Root Folder Input */}
                {isCreatingRootFolder && (
                    <div className="mx-2 mt-2 p-2 bg-primary/5 rounded-xl border border-primary/30 flex items-center gap-2 animate-in fade-in duration-150">
                        <Folder className="h-4 w-4 text-primary fill-primary/20 shrink-0" />
                        <Input
                            autoFocus
                            type="text"
                            value={newRootFolderName}
                            onChange={e => setNewRootFolderName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleConfirmRootCreate()
                                if (e.key === 'Escape') handleCancelRootCreate()
                            }}
                            placeholder={t('bookmarks.tree.rootFolderPlaceholder', 'New root folder name...')}
                            className="h-8 text-xs bg-background py-1 px-2 border-primary/40 focus:border-primary flex-1 rounded-lg"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 px-2.5 rounded-lg cursor-pointer text-xs"
                                onClick={handleConfirmRootCreate}
                            >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                <span>{t('common.save', 'Create')}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={handleCancelRootCreate}
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tree Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                    {/* Render Root-level Bookmarks (no folder) */}
                    {tree.bookmarks.map(bookmark => (
                        <BookmarkTreeLeaf
                            key={bookmark.id}
                            bookmark={bookmark}
                            depth={0}
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

                    {/* Render Root-level Subfolders */}
                    {Object.values(tree.subfolders)
                        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                        .map(sub => (
                            <BookmarkTreeFolder
                                key={sub.name}
                                node={sub}
                                path={sub.name}
                                depth={0}
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
                                onCreateSubfolder={handleCreateFolder}
                                t={t}
                            />
                        ))}

                    {!hasSubfolders && tree.bookmarks.length === 0 && !isCreatingRootFolder && (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            {t('main.empty.desc', 'No folders or bookmarks yet.')}
                        </div>
                    )}
                </div>
            </div>

            {/* Drag Overlay for Smooth Ghost Preview */}
            <DragOverlay dropAnimation={null}>
                {activeDragItem ? (
                    activeDragItem.type === 'folder' ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-md border-2 border-primary/70 shadow-2xl rounded-xl text-xs font-semibold text-foreground pointer-events-none ring-4 ring-primary/10">
                            <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                            <span>{activeDragItem.name}</span>
                            {activeDragItem.count !== undefined && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full">
                                    {activeDragItem.count}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-md border-2 border-primary/70 shadow-2xl rounded-xl text-xs font-medium text-foreground max-w-xs truncate pointer-events-none ring-4 ring-primary/10">
                            <Favicon url={activeDragItem.bookmark.url} className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{activeDragItem.bookmark.title}</span>
                        </div>
                    )
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
