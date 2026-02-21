import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
import { useTranslation } from 'react-i18next';

export function AccumulationChart({ data }) {
    const { t } = useTranslation();
    const [timeframe, setTimeframe] = useState('month');

    const chartData = data[timeframe] || [];

    return (
        <Card className="col-span-1 md:col-span-4 flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
                <CardTitle>{t('analytics.chart.title')}</CardTitle>
                <div className="flex space-x-1 bg-muted p-1 rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {['week', 'month', 'year'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${timeframe === tf ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted-foreground/10'}`}
                        >
                            {t(`analytics.timeframe.${tf}`)}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pl-4 sm:pl-6 pr-4 pb-4 flex-1">
                <div className="h-[240px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                width={25}
                                hide={false}
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
                                                            {payload[0].value} {t('analytics.chart.tooltip')}
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
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            index === chartData.length - 1
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
    );
}
