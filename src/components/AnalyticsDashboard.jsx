import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, Link2, FolderTree, AlertTriangle, Layers, Activity, TrendingUp } from 'lucide-react';

import { Favicon } from './Favicon';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

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
        // eslint-disable-next-line
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
            } catch {
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

        // Accumulation Velocity (Last 12 Months)
        const now = new Date();
        const months = {};
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months[key] = {
                name: d.toLocaleDateString('en-US', { month: 'short' }),
                count: 0,
                fullDate: key
            };
        }

        bookmarks.forEach(b => {
            if (!b.addDate) return;
            const date = new Date(parseInt(b.addDate) * 1000);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) {
                months[key].count++;
            }
        });

        const accumulationData = Object.values(months);
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const addedThisMonth = months[currentMonthKey]?.count || 0;


        return {
            total,
            folders,
            duplicates,
            deadLinks,
            checkedLinks,
            topDomains,
            oldBookmarksCount,
            accumulationData,
            addedThisMonth
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
                        <CardTitle className="text-sm font-medium">Accumulation Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            +{stats.addedThisMonth}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Bookmarks added this month
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

                {stats.oldBookmarksCount > 0 && (
                    <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800 lg:col-span-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400">Dusty Shelves</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.oldBookmarksCount}</div>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-500/70 mb-2">
                                        Bookmarks &gt; 5 years old
                                    </p>
                                </div>
                                <button
                                    onClick={onFilterOld}
                                    className="text-sm font-medium text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-md transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/60"
                                >
                                    Review and clean up <Link2 className="h-3 w-3" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Accumulation Velocity Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Collection Habits</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.accumulationData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                    {payload[0].payload.name}
                                                                </span>
                                                                <span className="font-bold text-muted-foreground">
                                                                    {payload[0].value} bookmarks
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {stats.accumulationData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.fullDate === stats.accumulationData[stats.accumulationData.length - 1].fullDate
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--muted-foreground) / 0.3)'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Domains Chart */}
                <Card className="col-span-3">
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
                                            <span className="font-medium truncate max-w-[120px]" title={item.domain}>{item.domain}</span>
                                        </div>
                                        <span className="text-muted-foreground text-xs whitespace-nowrap">{item.count} ({item.percentage}%)</span>
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
        </div>
    );
}
