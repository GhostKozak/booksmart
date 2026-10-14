import React from 'react'
import { Folder, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function SidebarFolders({
    availableFolders = [],
    uniqueFolders = [],
    discoveredFolders = [],
    bookmarks = [],
    saveToTaxonomy,
    filterSearch = '',
    onItemSelect
}) {
    const { t } = useTranslation()
    const { activeFolder, setActiveFolder, collapsedSections, toggleSection } = useAppStore()
    const collapsed = collapsedSections.folders
    const onToggle = () => toggleSection('folders')

    const searchTerm = (filterSearch || '').trim().toLowerCase()

    // Filter user defined folders
    const sortedAvailable = [...availableFolders].sort((a, b) => (a.order || 0) - (b.order || 0))
    const filteredAvailable = searchTerm
        ? sortedAvailable.filter(f => f.name.toLowerCase().includes(searchTerm))
        : sortedAvailable

    // Filter discovered folders
    const filteredDiscovered = searchTerm
        ? discoveredFolders.filter(f => f.name.toLowerCase().includes(searchTerm))
        : discoveredFolders

    const totalCount = availableFolders.length + discoveredFolders.length

    const handleFolderClick = (folderName) => {
        const next = activeFolder === folderName ? null : folderName
        setActiveFolder(next)
        onItemSelect?.()
    }

    if (searchTerm && filteredAvailable.length === 0 && filteredDiscovered.length === 0) {
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
                    <Folder className="h-4 w-4 text-amber-500" />
                    <span>{t('sidebar.sections.folders')}</span>
                    <span className="text-xs text-muted-foreground font-normal">({totalCount})</span>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-0.5 pl-2 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* User Defined Folders */}
                    {filteredAvailable.length > 0 && (
                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 px-2 py-1 tracking-wider">
                            {t('sidebar.myFolders')}
                        </div>
                    )}

                    {filteredAvailable.map(folder => {
                        const count = bookmarks.filter(b => (b.newFolder || b.originalFolder) === folder.name).length
                        const isActive = activeFolder === folder.name
                        return (
                            <button
                                key={folder.id}
                                onClick={() => handleFolderClick(folder.name)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-md transition-all group text-left",
                                    isActive
                                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0 truncate group-hover:translate-x-0.5 transition-transform duration-150">
                                    <Folder
                                        className="h-3.5 w-3.5 shrink-0"
                                        style={{ color: folder.color || '#f59e0b' }}
                                    />
                                    <span className="truncate">{folder.name}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.2 rounded-full shrink-0 font-medium",
                                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}

                    {/* Discovered Folders */}
                    {filteredDiscovered.length > 0 && (
                        <>
                            <div className="px-2 pt-2 pb-0.5">
                                <div className="border-t border-dashed border-border/60 mb-1" />
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                    {t('sidebar.discovered')}
                                </div>
                            </div>
                            {filteredDiscovered.map(folder => {
                                const folderInfo = uniqueFolders.find(uf => uf.name === folder.name)
                                const isActive = activeFolder === folder.name
                                return (
                                    <div key={`discovered-${folder.name}`} className="flex items-center gap-1 group/item">
                                        <button
                                            onClick={() => handleFolderClick(folder.name)}
                                            className={cn(
                                                "flex items-center justify-between flex-1 px-2.5 py-1.5 text-xs rounded-md transition-all italic text-left",
                                                isActive
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 truncate group-hover/item:translate-x-0.5 transition-transform duration-150">
                                                <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                <span className="truncate">{folder.name}</span>
                                            </div>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded-full font-medium">
                                                {folderInfo?.count || 0}
                                            </span>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10 shrink-0"
                                            onClick={() => saveToTaxonomy(folder.name, 'folder')}
                                            title={t('taxonomy.discovered.addFolder')}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
