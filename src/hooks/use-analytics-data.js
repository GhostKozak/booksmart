import { useMemo } from 'react';

export function useAnalyticsData(bookmarks, linkHealth) {
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

    return stats;
}
