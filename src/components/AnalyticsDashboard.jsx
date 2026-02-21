import { Link2, Layers, Activity, TrendingUp } from 'lucide-react';
import { useAnalyticsData } from '../hooks/use-analytics-data';
import { StatCard } from './analytics/StatCard';
import { OldBookmarksAlert } from './analytics/OldBookmarksAlert';
import { AccumulationChart } from './analytics/AccumulationChart';
import { TopDomainsList } from './analytics/TopDomainsList';
import { TagCloudVisual } from './analytics/TagCloudVisual';
import { HealthScoreCard } from './analytics/HealthScoreCard';
import { OldBookmarksList } from './analytics/OldBookmarksList';
import { useTranslation } from 'react-i18next';

export function AnalyticsDashboard({ bookmarks, linkHealth, onFilterOld, oldBookmarksCount }) {
    const { t } = useTranslation();
    const stats = useAnalyticsData(bookmarks, linkHealth, oldBookmarksCount);

    if (!stats) return null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-500 overflow-x-hidden">

            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={t('analytics.totalBookmarks')}
                    value={stats.total}
                    subtext={t('analytics.subtext.folders', { count: stats.folders })}
                    icon={Link2}
                />

                <StatCard
                    title={t('analytics.accumulationRate')}
                    value={`+${stats.addedThisMonth}`}
                    subtext={t('analytics.subtext.accumulation')}
                    icon={TrendingUp}
                    valueClassName="text-blue-600 dark:text-blue-400"
                />

                <StatCard
                    title={t('analytics.duplicates')}
                    value={stats.duplicates}
                    subtext={t('analytics.subtext.duplicates')}
                    icon={Layers}
                    valueClassName="text-yellow-600 dark:text-yellow-400"
                />

                <StatCard
                    title={t('analytics.linkHealth')}
                    value={stats.deadLinks}
                    subtext={t('analytics.subtext.health', { checked: stats.checkedLinks })}
                    icon={Activity}
                    valueClassName="text-red-600 dark:text-red-400"
                />

                <OldBookmarksAlert
                    count={stats.oldBookmarksCount}
                    onFilterOld={onFilterOld}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-6 items-start">
                <AccumulationChart data={stats.accumulation} />
                <HealthScoreCard healthScore={stats.healthScore} />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
                <TagCloudVisual tags={stats.tagCloudData} />
                <TopDomainsList
                    domains={stats.topDomains}
                    maxCount={stats.topDomains[0]?.count || 1}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
                <OldBookmarksList bookmarks={stats.oldBookmarksList} />
            </div>
        </div>
    );
}
