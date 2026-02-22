import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function BookmarkCollections({ collectionIds = [], allCollections = [], onRemove, className }) {
    if (!collectionIds || collectionIds.length === 0) return null

    // Resolve IDs to collection objects
    const resolvedCollections = collectionIds
        .map(id => allCollections.find(c => c.id === id))
        .filter(Boolean)

    if (resolvedCollections.length === 0) return null

    return (
        <div className={cn("flex gap-1 mt-1 flex-wrap", className)}>
            {resolvedCollections.map(collection => (
                <span
                    key={collection.id}
                    className="group/col inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors"
                    style={{
                        backgroundColor: collection.color + '15',
                        color: collection.color,
                        borderColor: collection.color + '30'
                    }}
                >
                    <span className="text-[10px] leading-none">{collection.icon}</span>
                    {collection.name}
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove(collection.id)
                            }}
                            className="ml-0.5 -mr-0.5 opacity-0 group-hover/col:opacity-100 hover:opacity-100 transition-opacity rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-px"
                            title="Remove"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    )}
                </span>
            ))}
        </div>
    )
}

