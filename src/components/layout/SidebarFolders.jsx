import { Folder, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export function SidebarFolders({
    availableFolders,
    uniqueFolders,
    discoveredFolders,
    bookmarks,
    activeFolder,
    setActiveFolder,
    saveToTaxonomy,
    collapsed,
    onToggle
}) {
    return (
        <>
            <div
                className="flex items-center justify-between mb-1 border-t pt-2 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
                onClick={onToggle}
            >
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    {collapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
                    <Folder className="h-5 w-5" /> Folders
                </h2>
            </div>

            {!collapsed && (
                <div className="mb-2 space-y-1 max-h-[18vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* User Defined Folders */}
                    {availableFolders.length > 0 && (
                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-2 px-2 tracking-wider">My Folders</div>
                    )}

                    {[...availableFolders].sort((a, b) => (a.order || 0) - (b.order || 0)).map(folder => {
                        const count = bookmarks.filter(b => (b.newFolder || b.originalFolder) === folder.name).length
                        return (
                            <button
                                key={folder.id}
                                onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent",
                                    activeFolder === folder.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Folder className="h-4 w-4" style={{ color: folder.color }} />
                                    <span>{folder.name}</span>
                                </div>
                                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{count}</span>
                            </button>
                        )
                    })}

                    {/* Discovered Folders */}
                    {discoveredFolders.length > 0 && (
                        <>
                            <div className="px-2 pt-2 pb-1">
                                <div className="border-t border-dashed mb-1" />
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Discovered</div>
                            </div>
                            {discoveredFolders.map(folder => {
                                const folderInfo = uniqueFolders.find(uf => uf.name === folder.name)
                                return (
                                    <div key={folder.name} className="flex items-center gap-1 group/item">
                                        <button
                                            onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
                                            className={cn(
                                                "flex items-center justify-between flex-1 px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent italic opacity-70",
                                                activeFolder === folder.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Folder className="h-4 w-4 text-slate-400" />
                                                <span>{folder.name}</span>
                                            </div>
                                            <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{folderInfo?.count || 0}</span>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={() => saveToTaxonomy(folder.name, 'folder')}
                                            title="Add to permanent folders"
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
