import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAnalyticsData } from '../../hooks/use-analytics-data';

// Mock hook
vi.mock('../../hooks/use-analytics-data', () => ({
    useAnalyticsData: vi.fn()
}));

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => {
            if (options && options.count !== undefined) return `${key}:${options.count}`;
            if (options && options.checked !== undefined) return `${key}:${options.checked}`;
            return key;
        }
    })
}));

// Mock child components
vi.mock('../analytics/StatCard', () => ({
    StatCard: ({ title, value, subtext }) => (
        <div data-testid="stat-card">
            <h4>{title}</h4>
            <span>{value}</span>
            <p>{subtext}</p>
        </div>
    )
}));

vi.mock('../analytics/OldBookmarksAlert', () => ({
    OldBookmarksAlert: ({ count, onFilterOld }) => (
        <div data-testid="old-alert">
            Count: {count}
            <button onClick={onFilterOld}>Filter Old</button>
        </div>
    )
}));

vi.mock('../analytics/AccumulationChart', () => ({ AccumulationChart: () => <div data-testid="accumulation-chart" /> }));
vi.mock('../analytics/HealthScoreCard', () => ({ HealthScoreCard: () => <div data-testid="health-card" /> }));
vi.mock('../analytics/TagCloudVisual', () => ({ TagCloudVisual: () => <div data-testid="tag-cloud" /> }));
vi.mock('../analytics/TopDomainsList', () => ({ TopDomainsList: () => <div data-testid="top-domains" /> }));
vi.mock('../analytics/OldBookmarksList', () => ({ OldBookmarksList: () => <div data-testid="old-list" /> }));

describe('AnalyticsDashboard', () => {
    const mockStats = {
        total: 100,
        folders: 5,
        addedThisMonth: 10,
        duplicates: 2,
        deadLinks: 3,
        checkedLinks: 50,
        oldBookmarksCount: 20,
        accumulation: { week: [], month: [], year: [] },
        healthScore: { grade: 'A' },
        tagCloudData: [],
        topDomains: [{ domain: 'google.com', count: 10 }],
        oldBookmarksList: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders null if no stats available', () => {
        useAnalyticsData.mockReturnValue(null);
        const { container } = render(<AnalyticsDashboard bookmarks={[]} linkHealth={{}} onFilterOld={vi.fn()} oldBookmarksCount={0} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders all stat cards with correct data', () => {
        useAnalyticsData.mockReturnValue(mockStats);
        render(<AnalyticsDashboard bookmarks={[]} linkHealth={{}} onFilterOld={vi.fn()} oldBookmarksCount={20} />);

        expect(screen.getByText('100')).toBeInTheDocument(); // Total bookmarks
        expect(screen.getByText('analytics.subtext.folders:5')).toBeInTheDocument();
        expect(screen.getByText('+10')).toBeInTheDocument(); // Accumulation
        expect(screen.getByText('3')).toBeInTheDocument(); // Dead links
        expect(screen.getByText('analytics.subtext.health:50')).toBeInTheDocument();
    });

    it('renders charts and lists', () => {
        useAnalyticsData.mockReturnValue(mockStats);
        render(<AnalyticsDashboard bookmarks={[]} linkHealth={{}} onFilterOld={vi.fn()} oldBookmarksCount={20} />);

        expect(screen.getByTestId('accumulation-chart')).toBeInTheDocument();
        expect(screen.getByTestId('health-card')).toBeInTheDocument();
        expect(screen.getByTestId('tag-cloud')).toBeInTheDocument();
        expect(screen.getByTestId('top-domains')).toBeInTheDocument();
        expect(screen.getByTestId('old-list')).toBeInTheDocument();
    });

    it('triggers onFilterOld when alert button is clicked', () => {
        const onFilterOld = vi.fn();
        useAnalyticsData.mockReturnValue(mockStats);
        render(<AnalyticsDashboard bookmarks={[]} linkHealth={{}} onFilterOld={onFilterOld} oldBookmarksCount={20} />);

        fireEvent.click(screen.getByText('Filter Old'));
        expect(onFilterOld).toHaveBeenCalled();
    });
});
