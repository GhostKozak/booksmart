import { useState } from 'react'
import { Library, Plus, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Trash2, Share2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'

export function SidebarCollections({
    collections,
    activeCollection,
    setActiveCollection,
    onCreateCollection,
    onEditCollection,
    onDeleteCollection,
    onShareCollection,
    collapsed,
    onToggle
}) {
    const { t } = useTranslation()
    const [contextMenu, setContextMenu] = useState(null) // collection id or null

    // Reactively compute counts via useLiveQuery — updates when bookmarks change
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

    return (
        <>
            <div
                className="flex items-center justify-between mb-1 border-t pt-2 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
                onClick={onToggle}
            >
                <h2 className="font-semibold text-base lg:text-lg flex items-center gap-2">
                    {collapsed ? <ChevronRight className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground group-hover:text-primary" />}
                    <Library className="h-4 w-4 lg:h-5 lg:w-5" /> {t('sidebar.sections.collections')}
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation()
                        onCreateCollection()
                    }}
                    title={t('collections.add')}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>

            {!collapsed && (
                <div className="mb-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {collections.length === 0 ? (
                        <div className="px-2 py-3 text-center">
                            <p className="text-xs text-muted-foreground mb-2">{t('collections.empty')}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 gap-1.5"
                                onClick={onCreateCollection}
                            >
                                <Plus className="h-3 w-3" />
                                {t('collections.createFirst')}
                            </Button>
                        </div>
                    ) : (
                        collections.map(collection => (
                            <div key={collection.id} className="group/item relative">
                                <button
                                    onClick={() => setActiveCollection(
                                        activeCollection === collection.id ? null : collection.id
                                    )}
                                    className={cn(
                                        "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-all duration-200 border border-transparent",
                                        activeCollection === collection.id
                                            ? "bg-accent text-accent-foreground font-medium border-border shadow-sm"
                                            : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="text-base shrink-0 w-5 h-5 flex items-center justify-center rounded"
                                            style={{ backgroundColor: `${collection.color}20` }}
                                        >
                                            {collection.icon}
                                        </span>
                                        <span className="truncate">{collection.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">
                                            {collectionCounts[collection.id] || 0}
                                        </span>
                                        <button
                                            className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted-foreground/20"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setContextMenu(contextMenu === collection.id ? null : collection.id)
                                            }}
                                        >
                                            <MoreHorizontal className="h-3 w-3" />
                                        </button>
                                    </div>
                                </button>

                                {/* Context menu */}
                                {contextMenu === collection.id && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-xl p-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                                        <button
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                                            onClick={() => {
                                                onEditCollection(collection)
                                                setContextMenu(null)
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                            {t('common.edit')}
                                        </button>
                                        <button
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                                            onClick={() => {
                                                onShareCollection(collection.id, 'markdown')
                                                setContextMenu(null)
                                            }}
                                        >
                                            <Share2 className="h-3 w-3" />
                                            {t('collections.share.markdown')}
                                        </button>
                                        <button
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                                            onClick={() => {
                                                onShareCollection(collection.id, 'text')
                                                setContextMenu(null)
                                            }}
                                        >
                                            <Share2 className="h-3 w-3" />
                                            {t('collections.share.text')}
                                        </button>
                                        <div className="h-px bg-border mx-1 my-0.5" />
                                        <button
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                            onClick={() => {
                                                onDeleteCollection(collection.id)
                                                setContextMenu(null)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            {t('common.delete')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    )
}
