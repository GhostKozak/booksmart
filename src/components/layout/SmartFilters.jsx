import { Archive, History as HistoryIcon, ShieldAlert, FileQuestion, File, XCircle, Link, Video, MessageCircle, ShoppingCart, Newspaper, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

export function SmartFilters({
    smartFilter,
    setSmartFilter,
    smartCounts,
    deadLinkCount,
    collapsed,
    onToggle
}) {
    const { t } = useTranslation()

    const filters = [
        { key: 'old', label: t('sidebar.smartFilters.old'), icon: HistoryIcon, count: smartCounts.old, color: 'amber' },
        { key: 'http', label: t('sidebar.smartFilters.http'), icon: ShieldAlert, count: smartCounts.http, color: 'red' },
        { key: 'untitled', label: t('sidebar.smartFilters.untitled'), icon: FileQuestion, count: smartCounts.untitled, color: 'orange' },
        { key: 'docs', label: t('sidebar.smartFilters.docs'), icon: File, count: smartCounts.docs, color: 'blue' },
        { key: 'divider' },
        { key: 'dead', label: t('sidebar.smartFilters.deadLinks'), icon: XCircle, count: deadLinkCount, color: 'gray' },
        { key: 'longurl', label: t('sidebar.smartFilters.longUrls'), icon: Link, count: smartCounts.longurl, color: 'purple' },
        { key: 'media', label: t('sidebar.smartFilters.media'), icon: Video, count: smartCounts.media, color: 'pink' },
        { key: 'social', label: t('sidebar.smartFilters.social'), icon: MessageCircle, count: smartCounts.social, color: 'sky' },
        { key: 'shopping', label: t('sidebar.smartFilters.shopping'), icon: ShoppingCart, count: smartCounts.shopping, color: 'emerald' },
        { key: 'news', label: t('sidebar.smartFilters.news'), icon: Newspaper, count: smartCounts.news, color: 'teal' },
    ]

    const colorMap = {
        amber: { active: 'bg-amber-100 text-amber-700 font-medium dark:bg-amber-900/30 dark:text-amber-400' },
        red: { active: 'bg-red-100 text-red-700 font-medium dark:bg-red-900/30 dark:text-red-400' },
        orange: { active: 'bg-orange-100 text-orange-700 font-medium dark:bg-orange-900/30 dark:text-orange-400' },
        blue: { active: 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400' },
        gray: { active: 'bg-gray-200 text-gray-800 font-medium dark:bg-gray-700/50 dark:text-gray-200' },
        purple: { active: 'bg-purple-100 text-purple-700 font-medium dark:bg-purple-900/30 dark:text-purple-400' },
        pink: { active: 'bg-pink-100 text-pink-700 font-medium dark:bg-pink-900/30 dark:text-pink-400' },
        sky: { active: 'bg-sky-100 text-sky-700 font-medium dark:bg-sky-900/30 dark:text-sky-400' },
        emerald: { active: 'bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-400' },
        teal: { active: 'bg-teal-100 text-teal-700 font-medium dark:bg-teal-900/30 dark:text-teal-400' },
    }

    return (
        <>
            <div
                className="flex items-center justify-between mb-1 border-t pt-2 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
                onClick={onToggle}
            >
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    {collapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
                    <Archive className="h-5 w-5" /> {t('sidebar.sections.smartFilters')}
                </h2>
            </div>

            {!collapsed && (
                <div className="mb-2 space-y-1 max-h-[18vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 animate-in fade-in slide-in-from-top-1 duration-200">
                    {filters.map(filter => {
                        if (filter.key === 'divider') {
                            return <div key="divider" className="my-1 border-t border-dashed" />
                        }

                        const Icon = filter.icon
                        const isActive = smartFilter === filter.key
                        const colors = colorMap[filter.color]

                        return (
                            <button
                                key={filter.key}
                                onClick={() => setSmartFilter(smartFilter === filter.key ? null : filter.key)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                                    isActive ? colors.active : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 opacity-70" />
                                    <span>{filter.label}</span>
                                </div>
                                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{filter.count}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </>
    )
}
