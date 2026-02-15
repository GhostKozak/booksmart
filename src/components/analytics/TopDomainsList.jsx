import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Favicon } from '../Favicon';
import { useTranslation } from 'react-i18next';

export function TopDomainsList({ domains, maxCount }) {
    const { t } = useTranslation();
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>{t('analytics.topDomains')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {domains.map((item, index) => (
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
                                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
