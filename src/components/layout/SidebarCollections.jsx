import React, { useState } from 'react'
import { Library, Plus, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Trash2, Share2, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useAppStore } from '../../store/useAppStore'

export function SidebarCollections({
    collections = [],
    onCreateCollection,
    onEditCollection,
    onDeleteCollection,
    onShareCollection,
    filterSearch = '',
    onItemSelect
}) {
    const { t } = useTranslation()
    const { activeCollection, setActiveCollection, collapsedSections, toggleSection } = useAppStore()
    const collapsed = collapsedSections.collections
    const onToggle = () => toggleSection('collections')
    const [contextMenu, setContextMenu] = useState(null)

    // Reactively compute counts via useLiveQuery
    const collectionCounts = useLiveQuery(async () => {
        const counts = {}
        for (const collection of collections) {
            counts[collection.id] = await db.bookmarks
                .where('collections')
                .equals(collection.id)
                .count()
        }
        return counts
    }, [collections]) || {}

    const searchTerm = (filterSearch || '').trim().toLowerCase()
    const filteredCollections = searchTerm
        ? collections.filter(c => c.name.toLowerCase().includes(searchTerm))
        : collections

    const handleCollectionClick = (collectionId) => {
        const next = activeCollection === collectionId ? null : collectionId
        setActiveCollection(next)
        onItemSelect?.()
    }

    if (searchTerm && filteredCollections.length === 0) {
        return null
    }

    return (
        <div className="space-y-1">
            <div
                className="flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group select-none"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 font-medium text-sm text-foreground/80 group-hover:text-foreground">
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" />
                    )}
                    <Library className="h-4 w-4 text-purple-500" />
                    <span>{t('sidebar.sections.collections')}</span>
                    <span className="text-xs text-muted-foreground font-normal">({collections.length})</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation()
                        onCreateCollection?.()
                    }}
                    title={t('collections.add', 'Yeni Koleksiyon')}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>

            {!collapsed && (
                <div className="space-y-0.5 pl-2 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {collections.length === 0 ? (
                        <div className="px-2 py-3 text-center border border-dashed rounded-lg bg-muted/20 my-1">
                            <p className="text-xs text-muted-foreground mb-2">{t('collections.empty')}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 gap-1.5 font-medium"
                                onClick={onCreateCollection}
                            >
                                <Plus className="h-3 w-3" />
                                {t('collections.createFirst')}
                            </Button>
                        </div>
                    ) : (
                        filteredCollections.map(collection => {
                            const isActive = activeCollection === collection.id
                            const count = collectionCounts[collection.id] || 0
                            return (
                                <div key={collection.id} className="group/item relative min-w-0 w-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "flex items-center justify-between w-full min-w-0 px-2.5 py-1.5 text-xs rounded-md transition-all text-left overflow-hidden",
                                            isActive
                                                ? "bg-primary/10 text-primary font-semibold shadow-xs"
                                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleCollectionClick(collection.id)}
                                            title={collection.name}
                                            className="flex items-center gap-2 min-w-0 flex-1 mr-1.5 overflow-hidden text-left cursor-pointer"
                                        >
                                            <span
                                                className="text-sm shrink-0 w-5 h-5 flex items-center justify-center rounded"
                                                style={{ backgroundColor: `${collection.color || '#8b5cf6'}20` }}
                                            >
                                                {collection.icon || '📁'}
                                            </span>
                                            <span className="truncate block">{collection.name}</span>
                                        </button>
                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.2 rounded-full font-medium",
                                                isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                            )}>
                                                {count}
                                            </span>
                                            <button
                                                type="button"
                                                className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setContextMenu(contextMenu === collection.id ? null : collection.id)
                                                }}
                                                aria-label="Koleksiyon İşlemleri"
                                            >
                                                <MoreHorizontal className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Context menu */}
                                    {contextMenu === collection.id && (
                                        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-xl p-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-150">
                                            <button
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors cursor-pointer"
                                                onClick={() => {
                                                    onEditCollection?.(collection)
                                                    setContextMenu(null)
                                                }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                                <span>{t('common.edit')}</span>
                                            </button>
                                            <button
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent text-primary font-medium transition-colors cursor-pointer"
                                                onClick={() => {
                                                    useAppStore.getState().openShareHub(collection)
                                                    setContextMenu(null)
                                                }}
                                            >
                                                <Sparkles className="h-3 w-3 text-amber-500" />
                                                <span>{t('collections.hub.menuItem', 'Web Sayfası (Bento / Hub)')}</span>
                                            </button>
                                            <button
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors cursor-pointer"
                                                onClick={() => {
                                                    onShareCollection?.(collection.id, 'markdown')
                                                    setContextMenu(null)
                                                }}
                                            >
                                                <Share2 className="h-3 w-3" />
                                                <span>{t('collections.share.markdown')}</span>
                                            </button>
                                            <button
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors cursor-pointer"
                                                onClick={() => {
                                                    onShareCollection?.(collection.id, 'text')
                                                    setContextMenu(null)
                                                }}
                                            >
                                                <Share2 className="h-3 w-3" />
                                                <span>{t('collections.share.text')}</span>
                                            </button>
                                            <div className="h-px bg-border mx-1 my-0.5" />
                                            <button
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
                                                onClick={() => {
                                                    onDeleteCollection?.(collection.id)
                                                    setContextMenu(null)
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                <span>{t('common.delete')}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
