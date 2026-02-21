import { useMemo } from 'react';
import { startOfWeek, subWeeks, subMonths, subYears, format } from 'date-fns';

export function useAnalyticsData(bookmarks, linkHealth, oldBookmarksCount) {
    const now = useMemo(() => new Date(), []);

    const stats = useMemo(() => {
        const total = bookmarks.length;
        if (total === 0) return null;

        // Folders (using a simple set as it's quick)
        const folders = new Set(bookmarks.map(b => b.originalFolder)).size;

        // Duplicates
        const duplicates = bookmarks.filter(b => b.isDuplicate).length;

        // Health
        const deadLinks = Object.values(linkHealth).filter(s => s === 'dead').length;
        const checkedLinks = Object.values(linkHealth).filter(s => s !== 'idle').length;

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

        // Accumulation Velocity
        const accumulation = { week: [], month: [], year: [] };

        const weeks = {};
        for (let i = 11; i >= 0; i--) {
            const d = subWeeks(now, i);
            const start = startOfWeek(d, { weekStartsOn: 1 });
            const key = format(start, 'yyyy-MM-dd');
            weeks[key] = { name: format(start, 'MMM d'), count: 0, fullDate: key };
        }

        const months = {};
        for (let i = 11; i >= 0; i--) {
            const d = subMonths(now, i);
            const key = format(d, 'yyyy-MM');
            months[key] = { name: format(d, 'MMM'), count: 0, fullDate: key };
        }

        const years = {};
        for (let i = 4; i >= 0; i--) {
            const d = subYears(now, i);
            const key = format(d, 'yyyy');
            years[key] = { name: format(d, 'yyyy'), count: 0, fullDate: key };
        }

        bookmarks.forEach(b => {
            if (!b.addDate) return;
            const date = new Date(parseInt(b.addDate) * 1000);

            // Week
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekKey = format(weekStart, 'yyyy-MM-dd');
            if (weeks[weekKey]) weeks[weekKey].count++;

            // Month
            const monthKey = format(date, 'yyyy-MM');
            if (months[monthKey]) months[monthKey].count++;

            // Year
            const yearKey = format(date, 'yyyy');
            if (years[yearKey]) years[yearKey].count++;
        });

        accumulation.week = Object.values(weeks);
        accumulation.month = Object.values(months);
        accumulation.year = Object.values(years);

        const currentMonthKey = format(now, 'yyyy-MM');
        const addedThisMonth = months[currentMonthKey]?.count || 0;

        // Tag Cloud
        const tagCounts = {};
        bookmarks.forEach(b => {
            if (b.tags && Array.isArray(b.tags)) {
                b.tags.forEach(t => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            }
        });
        const tagCloudData = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 30)
            .map(([tag, count]) => ({ tag, count }));

        // Health Score
        const brokenRatio = checkedLinks > 0 ? deadLinks / checkedLinks : 0;
        const duplicateRatio = total > 0 ? duplicates / total : 0;
        const defectScore = (brokenRatio * 0.7) + (duplicateRatio * 0.3);

        let grade = 'A';
        if (defectScore > 0.15) grade = 'F';
        else if (defectScore > 0.10) grade = 'D';
        else if (defectScore > 0.05) grade = 'C';
        else if (defectScore > 0.02) grade = 'B';

        const healthScore = { grade, brokenRatio, duplicateRatio, checkedLinks };

        // Old Bookmarks List
        const oldBookmarksList = [...bookmarks]
            .filter(b => b.addDate)
            .sort((a, b) => parseInt(a.addDate) - parseInt(b.addDate))
            .slice(0, 10);

        return {
            total,
            folders,
            duplicates,
            deadLinks,
            checkedLinks,
            topDomains,
            oldBookmarksCount,
            accumulation,
            addedThisMonth,
            tagCloudData,
            healthScore,
            oldBookmarksList
        };
    }, [bookmarks, linkHealth, oldBookmarksCount, now]);

    return stats;
}
