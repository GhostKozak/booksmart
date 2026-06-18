import React, { useState, useMemo, useCallback } from 'react'
import { Checkbox } from './ui/checkbox'
import { Favicon } from './Favicon'
import { BookmarkHealthStatus } from './bookmark/BookmarkHealthStatus'
import { LinkTooltip } from './bookmark/LinkTooltip'
import { Button } from './ui/button'
import { Folder, ChevronDown, Pencil, Eye, FolderOpen, MoreVertical } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'

// Bookmarks Leaf (File) Node
const BookmarkLeaf = ({
    bookmark,
    depth,
    selectedIds,
    toggleSelection,
    onPreview,
    onEdit,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    t
}) => {
    const isSelected = selectedIds.has(bookmark.id)
    const isIgnored = ignoredUrls?.has(bookmark.url)
    const healthStatus = isIgnored ? 'ignored' : (linkHealth[bookmark.url] || 'idle')

    return (
        <div
            className={cn(
                "flex items-center justify-between py-1.5 px-3 border-b border-muted/10 hover:bg-muted/40 transition-colors group/leaf",
                isSelected && "bg-primary/5 border-primary/20"
            )}
            style={{ paddingLeft: `${depth * 16 + 28}px` }}
        >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(bookmark.id)}
                    className="h-3.5 w-3.5 shrink-0"
                    aria-label={t('common.select')}
                />
                <LinkTooltip bookmark={bookmark}>
                    <div className="flex items-center gap-1.5 min-w-0 cursor-pointer flex-1" onClick={() => onPreview(bookmark)}>
                        <Favicon url={bookmark.url} className="w-3.5 h-3.5 shrink-0" />
                        <span className={cn(
                            "text-sm truncate font-medium hover:text-primary transition-colors",
                            (bookmark.status === 'suggested' || bookmark.status === 'ai-suggested') && "text-purple-700 dark:text-purple-300",
                            (bookmark.status === 'matched' || bookmark.status === 'conflict') && "text-emerald-700 dark:text-emerald-300",
                            healthStatus === 'dead' && "text-red-600 dark:text-red-400 line-through"
                        )} title={bookmark.title}>
                            {bookmark.title || t('common.untitled')}
                        </span>
                    </div>
                </LinkTooltip>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-4">
                <BookmarkHealthStatus
                    url={bookmark.url}
                    status={healthStatus}
                    onToggleIgnore={toggleIgnoreUrl}
                />
                <div className="flex items-center md:opacity-0 group-hover/leaf:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                        onClick={() => onEdit?.(bookmark)}
                        title={t('common.edit')}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                        onClick={() => onPreview(bookmark)}
                        title={t('preview.open')}
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// Collapsible Folder Node
const FolderNode = ({
    node,
    path,
    depth,
    expandedFolders,
    toggleFolder,
    selectedIds,
    toggleSelection,
    onPreview,
    onEdit,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    t
}) => {
    const isExpanded = expandedFolders.has(path)
    const hasChildren = Object.keys(node.subfolders).length > 0 || node.bookmarks.length > 0

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

    const handleCheckboxChange = (e) => {
        // Toggle selection for all children
        const useAppStore = require('../store/useAppStore').useAppStore
        const setSelectedIds = useAppStore.getState().setSelectedIds
        const currentSelected = new Set(selectedIds)

        if (isFolderAllSelected) {
            // Deselect all
            folderBookmarkIds.forEach(id => currentSelected.delete(id))
        } else {
            // Select all
            folderBookmarkIds.forEach(id => currentSelected.add(id))
        }
        setSelectedIds(currentSelected)
    }

    return (
        <div className="select-none">
            {/* Folder Header */}
            <div
                className="flex items-center justify-between py-1.5 px-3 hover:bg-muted/20 cursor-pointer border-b border-muted/5 transition-colors group/folder"
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => toggleFolder(path)}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        <FolderOpen className="h-4 w-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    ) : (
                        <Folder className="h-4 w-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}

                    <span className="truncate text-sm font-semibold text-foreground/90">{node.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-normal shrink-0">
                        ({totalCount})
                    </span>
                </div>
            </div>

            {/* Folder Contents */}
            {isExpanded && (
                <div className="space-y-0.5">
                    {/* Render subfolders sorted by name */}
                    {Object.values(node.subfolders)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(sub => (
                            <FolderNode
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
                                linkHealth={linkHealth}
                                ignoredUrls={ignoredUrls}
                                toggleIgnoreUrl={toggleIgnoreUrl}
                                t={t}
                            />
                        ))}

                    {/* Render bookmarks in this exact folder */}
                    {node.bookmarks.map(bookmark => (
                        <BookmarkLeaf
                            key={bookmark.id}
                            bookmark={bookmark}
                            depth={depth + 1}
                            selectedIds={selectedIds}
                            toggleSelection={toggleSelection}
                            onPreview={onPreview}
                            onEdit={onEdit}
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

export function BookmarkTree({
    bookmarks,
    selectedIds,
    toggleSelection,
    linkHealth,
    ignoredUrls,
    toggleIgnoreUrl,
    onPreview,
    onEdit,
    availableFolders = [],
    availableTags = []
}) {
    const { t } = useTranslation()

    // Build hierarchical tree structure from flat bookmarks list
    const tree = useMemo(() => {
        const root = { subfolders: {}, bookmarks: [] }

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
    }, [bookmarks])

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

    const hasSubfolders = Object.keys(tree.subfolders).length > 0

    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            {/* Header / Actions toolbar */}
            <div className="bg-muted/30 border-b p-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">
                    {t('header.treeView') || 'Folder Tree'}
                </span>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleExpandAll}>
                        {t('bookmarks.tree.expandAll') || 'Expand All'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleCollapseAll}>
                        {t('bookmarks.tree.collapseAll') || 'Collapse All'}
                    </Button>
                </div>
            </div>

            {/* Tree Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {/* Render Root-level Bookmarks (no folder) */}
                {tree.bookmarks.map(bookmark => (
                    <BookmarkLeaf
                        key={bookmark.id}
                        bookmark={bookmark}
                        depth={0}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        onPreview={onPreview}
                        onEdit={onEdit}
                        linkHealth={linkHealth}
                        ignoredUrls={ignoredUrls}
                        toggleIgnoreUrl={toggleIgnoreUrl}
                        t={t}
                    />
                ))}

                {/* Render Root-level Subfolders */}
                {Object.values(tree.subfolders)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(sub => (
                        <FolderNode
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
                            linkHealth={linkHealth}
                            ignoredUrls={ignoredUrls}
                            toggleIgnoreUrl={toggleIgnoreUrl}
                            t={t}
                        />
                    ))}

                {!hasSubfolders && tree.bookmarks.length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                        {t('main.empty.desc')}
                    </div>
                )}
            </div>
        </div>
    )
}
