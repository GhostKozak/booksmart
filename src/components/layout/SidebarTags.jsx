import React from 'react'
import { Tag, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function SidebarTags({
    uniqueTags = [],
    availableTags = [],
    discoveredTags = [],
    saveToTaxonomy,
    filterSearch = '',
    onItemSelect
}) {
    const { t } = useTranslation()
    const { activeTag, setActiveTag, collapsedSections, toggleSection } = useAppStore()
    const collapsed = collapsedSections.tags
    const onToggle = () => toggleSection('tags')

    const searchTerm = (filterSearch || '').trim().toLowerCase()

    const sortedAvailable = [...availableTags].sort((a, b) => (a.order || 0) - (b.order || 0))
    const filteredAvailable = searchTerm
        ? sortedAvailable.filter(t => t.name.toLowerCase().includes(searchTerm))
        : sortedAvailable

    const filteredDiscovered = searchTerm
        ? discoveredTags.filter(t => t.name.toLowerCase().includes(searchTerm))
        : discoveredTags

    const totalCount = availableTags.length + discoveredTags.length

    const handleTagClick = (tagName) => {
        const next = activeTag === tagName ? null : tagName
        setActiveTag(next)
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
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span>{t('sidebar.sections.tags')}</span>
                    <span className="text-xs text-muted-foreground font-normal">({totalCount})</span>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-0.5 pl-2 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* User Defined Tags */}
                    {filteredAvailable.length > 0 && (
                        <div className="text-[10px] uppercase font-bold text-muted-foreground/60 px-2 py-1 tracking-wider">
                            {t('sidebar.myTags')}
                        </div>
                    )}

                    {filteredAvailable.map((tag, idx) => {
                        const tagStats = uniqueTags.find(t => t.name === tag.name)
                        const count = tagStats ? tagStats.count : 0
                        const isActive = activeTag === tag.name
                        return (
                            <button
                                key={tag.id ? `tag-${tag.id}` : `tag-${tag.name || idx}-${idx}`}
                                onClick={() => handleTagClick(tag.name)}
                                title={`#${tag.name}`}
                                className={cn(
                                    "flex items-center justify-between w-full min-w-0 px-2.5 py-1.5 text-xs rounded-md transition-all group text-left overflow-hidden",
                                    isActive
                                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5 overflow-hidden group-hover:translate-x-0.5 transition-transform duration-150">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: tag.color || '#3b82f6' }}
                                    />
                                    <span className="truncate block">#{tag.name}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.2 rounded-full shrink-0 font-medium ml-auto",
                                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}

                    {/* Discovered Tags */}
                    {filteredDiscovered.length > 0 && (
                        <>
                            <div className="px-2 pt-2 pb-0.5">
                                <div className="border-t border-dashed border-border/60 mb-1" />
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                    {t('sidebar.discovered')}
                                </div>
                            </div>
                            {filteredDiscovered.map(tag => {
                                const tagInfo = uniqueTags.find(ut => ut.name === tag.name)
                                const isActive = activeTag === tag.name
                                return (
                                    <div key={`discovered-${tag.name}`} className="flex items-center gap-1 group/item min-w-0 w-full overflow-hidden">
                                        <button
                                            onClick={() => handleTagClick(tag.name)}
                                            title={`#${tag.name}`}
                                            className={cn(
                                                "flex items-center justify-between flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-md transition-all italic text-left overflow-hidden",
                                                isActive
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5 overflow-hidden group-hover/item:translate-x-0.5 transition-transform duration-150">
                                                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                                <span className="truncate block">#{tag.name}</span>
                                            </div>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded-full font-medium shrink-0 ml-auto">
                                                {tagInfo?.count || 0}
                                            </span>
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10 shrink-0"
                                            onClick={() => saveToTaxonomy(tag.name, 'tag')}
                                            title={t('taxonomy.discovered.addTag')}
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
