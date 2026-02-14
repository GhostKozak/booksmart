import { Tag, Folder, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function SidebarTags({
    uniqueTags,
    availableTags,
    discoveredTags,
    activeTag,
    setActiveTag,
    saveToTaxonomy,
    collapsed,
    onToggle
}) {
    return (
        <>
            <div
                className="flex items-center justify-between mb-4 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
                onClick={onToggle}
            >
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    {collapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
                    <Tag className="h-5 w-5" /> Tags
                </h2>
            </div>

            {!collapsed && (
                <div className="mb-6 space-y-1 max-h-[30vh] min-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {uniqueTags.length === 0 && <p className="text-sm text-muted-foreground px-2">No tags found.</p>}

                    {/* User Defined Tags */}
                    {uniqueTags
                        .filter(tag => availableTags.some(t => t.name === tag.name))
                        .map(tag => {
                            const config = availableTags.find(t => t.name === tag.name)
                            const color = config ? config.color : '#64748b'
                            return (
                                <button
                                    key={tag.name}
                                    onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                                    className={cn(
                                        "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent",
                                        activeTag === tag.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span>#{tag.name}</span>
                                    </div>
                                    <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{tag.count}</span>
                                </button>
                            )
                        })}

                    {/* Discovered Tags */}
                    {discoveredTags.length > 0 && (
                        <>
                            <div className="px-2 pt-4 pb-2">
                                <div className="border-t border-dashed" />
                                <div className="text-[10px] uppercase font-bold text-muted-foreground mt-2 px-1">Discovered</div>
                            </div>
                            {discoveredTags.map(tag => {
                                const tagInfo = uniqueTags.find(ut => ut.name === tag.name)
                                return (
                                    <div key={tag.name} className="flex items-center gap-1 group/item">
                                        <button
                                            onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                                            className={cn(
                                                "flex items-center justify-between flex-1 px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent italic opacity-70",
                                                activeTag === tag.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                <span>#{tag.name}</span>
                                            </div>
                                            <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{tagInfo?.count || 0}</span>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => saveToTaxonomy(tag.name, 'tag')}
                                            title="Add to permanent tags"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            )}
        </>
    )
}
