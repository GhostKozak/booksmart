import React from 'react'
import {
    Archive,
    History as HistoryIcon,
    ShieldAlert,
    FileQuestion,
    File,
    XCircle,
    Link,
    Video,
    MessageCircle,
    ShoppingCart,
    Newspaper,
    Bell,
    Highlighter,
    HardDrive,
    ChevronRight,
    ChevronDown
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

export function SmartFilters({
    smartCounts = {},
    deadLinkCount = 0,
    filterSearch = '',
    onItemSelect
}) {
    const { t } = useTranslation()
    const { smartFilter, setSmartFilter, collapsedSections, toggleSection } = useAppStore()
    const collapsed = collapsedSections.filters
    const onToggle = () => toggleSection('filters')

    const filters = [
        { key: 'highlights', label: t('sidebar.smartFilters.highlights', 'Highlights & Notes'), icon: Highlighter, count: smartCounts.highlights || 0, color: 'yellow' },
        { key: 'snapshots', label: t('sidebar.smartFilters.snapshots', 'Offline Archive'), icon: HardDrive, count: smartCounts.snapshots || 0, color: 'emerald' },
        { key: 'reminders', label: t('sidebar.smartFilters.reminders', 'Reminders'), icon: Bell, count: smartCounts.reminders || 0, color: 'indigo' },
        { key: 'old', label: t('sidebar.smartFilters.old'), icon: HistoryIcon, count: smartCounts.old || 0, color: 'amber' },
        { key: 'http', label: t('sidebar.smartFilters.http'), icon: ShieldAlert, count: smartCounts.http || 0, color: 'red' },
        { key: 'untitled', label: t('sidebar.smartFilters.untitled'), icon: FileQuestion, count: smartCounts.untitled || 0, color: 'orange' },
        { key: 'docs', label: t('sidebar.smartFilters.docs'), icon: File, count: smartCounts.docs || 0, color: 'blue' },
        { key: 'divider' },
        { key: 'dead', label: t('sidebar.smartFilters.deadLinks'), icon: XCircle, count: deadLinkCount || 0, color: 'gray' },
        { key: 'longurl', label: t('sidebar.smartFilters.longUrls'), icon: Link, count: smartCounts.longurl || 0, color: 'purple' },
        { key: 'media', label: t('sidebar.smartFilters.media'), icon: Video, count: smartCounts.media || 0, color: 'pink' },
        { key: 'social', label: t('sidebar.smartFilters.social'), icon: MessageCircle, count: smartCounts.social || 0, color: 'sky' },
        { key: 'shopping', label: t('sidebar.smartFilters.shopping'), icon: ShoppingCart, count: smartCounts.shopping || 0, color: 'emerald' },
        { key: 'news', label: t('sidebar.smartFilters.news'), icon: Newspaper, count: smartCounts.news || 0, color: 'teal' },
    ]

    const colorMap = {
        yellow: { active: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 font-semibold' },
        indigo: { active: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold' },
        amber: { active: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' },
        red: { active: 'bg-red-500/15 text-red-700 dark:text-red-300 font-semibold' },
        orange: { active: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 font-semibold' },
        blue: { active: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold' },
        gray: { active: 'bg-gray-500/15 text-gray-700 dark:text-gray-300 font-semibold' },
        purple: { active: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold' },
        pink: { active: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 font-semibold' },
        sky: { active: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold' },
        emerald: { active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold' },
        teal: { active: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 font-semibold' },
    }

    const searchTerm = (filterSearch || '').trim().toLowerCase()
    const filteredList = searchTerm
        ? filters.filter(f => f.key !== 'divider' && f.label && f.label.toLowerCase().includes(searchTerm))
        : filters

    const handleFilterClick = (filterKey) => {
        const next = smartFilter === filterKey ? null : filterKey
        setSmartFilter(next)
        onItemSelect?.()
    }

    if (searchTerm && filteredList.length === 0) {
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
                    <Archive className="h-4 w-4 text-emerald-500" />
                    <span>{t('sidebar.sections.smartFilters')}</span>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-0.5 pl-2 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {filteredList.map((filter, idx) => {
                        if (filter.key === 'divider') {
                            return <div key={`divider-${idx}`} className="my-1.5 border-t border-border/50" />
                        }

                        const Icon = filter.icon
                        const isActive = smartFilter === filter.key
                        const colors = colorMap[filter.color] || { active: 'bg-primary/10 text-primary font-semibold' }

                        return (
                            <button
                                key={filter.key}
                                onClick={() => handleFilterClick(filter.key)}
                                title={filter.label}
                                className={cn(
                                    "flex items-center justify-between w-full min-w-0 px-2.5 py-1.5 text-xs rounded-md transition-all text-left overflow-hidden",
                                    isActive
                                        ? cn(colors.active, "shadow-xs")
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5 overflow-hidden group-hover:translate-x-0.5 transition-transform duration-150">
                                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                    <span className="truncate block">{filter.label}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ml-auto",
                                    isActive ? "bg-background/80" : "bg-muted text-muted-foreground"
                                )}>
                                    {filter.count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
