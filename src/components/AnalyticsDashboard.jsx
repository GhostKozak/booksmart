import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, Link2, FolderTree, AlertTriangle, Layers, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { Favicon } from './Favicon';

export function AnalyticsDashboard({ bookmarks, linkHealth, onFilterOld }) {
    const stats = useMemo(() => {
        const total = bookmarks.length;
        if (total === 0) return null;

        // Folders
        const folders = new Set(bookmarks.map(b => b.originalFolder)).size;

        // Duplicates
        const duplicates = bookmarks.filter(b => b.isDuplicate).length;

        // Health
        const deadLinks = Object.values(linkHealth).filter(s => s === 'dead').length;
        const checkedLinks = Object.values(linkHealth).filter(s => s !== 'idle').length;

        // Old Bookmarks (> 5 years)
        const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);
        const oldBookmarksCount = bookmarks.filter(b => {
            if (!b.addDate) return false;
            const date = parseInt(b.addDate) * 1000;
            return date < fiveYearsAgo;
        }).length;

        // Domains
        const domainCounts = {};
        bookmarks.forEach(b => {
            try {
                const hostname = new URL(b.url).hostname;
                domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
            } catch (e) {
                // ignore invalid urls
            }
        });

        const topDomains = Object.entries(domainCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([domain, count]) => ({
                domain,
                count,
                percentage: Math.round((count / total) * 100)
            }));

        return {
            total,
            folders,
            duplicates,
            deadLinks,
            checkedLinks,
            topDomains,
            oldBookmarksCount
        };
    }, [bookmarks, linkHealth]);

    if (!stats) return null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 animate-in fade-in zoom-in-95 duration-500">

            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookmarks</CardTitle>
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Across {stats.folders} folders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {stats.duplicates}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Bookmarks appearing multiple times
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Link Health</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {stats.deadLinks}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Dead links found ({stats.checkedLinks} checked)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Folders</CardTitle>
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.folders}</div>
                        <p className="text-xs text-muted-foreground">
                            Distinct categories
                        </p>
                    </CardContent>
                </Card>

                {stats.oldBookmarksCount > 0 && (
                    <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400">Dusty Shelves</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.oldBookmarksCount}</div>
                            <p className="text-xs text-amber-600/80 dark:text-amber-500/70 mb-2">
                                Bookmarks &gt; 5 years old
                            </p>
                            <button
                                onClick={onFilterOld}
                                className="text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1"
                            >
                                Review and clean up <Link2 className="h-3 w-3" />
                            </button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top Domains Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Top Domains</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.topDomains.map((item, index) => (
                            <div key={item.domain} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground w-4">{index + 1}.</span>
                                        <Favicon url={`https://${item.domain}`} className="w-4 h-4" />
                                        <span className="font-medium">{item.domain}</span>
                                    </div>
                                    <span className="text-muted-foreground">{item.count} ({item.percentage}%)</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                        style={{ width: `${(item.count / stats.topDomains[0].count) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
