import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { ShieldCheck, ShieldAlert, ShieldX, Shield, Info } from 'lucide-react';

export function HealthScoreCard({ healthScore }) {
    const { t } = useTranslation();

    if (!healthScore) return null;

    const { grade, brokenRatio, duplicateRatio, checkedLinks } = healthScore;

    const getGradeColor = (g) => {
        if (checkedLinks === 0) return 'text-muted-foreground/40';
        switch (g) {
            case 'A': return 'text-green-500';
            case 'B': return 'text-lime-500';
            case 'C': return 'text-yellow-500';
            case 'D': return 'text-orange-500';
            case 'F': default: return 'text-red-500';
        }
    };

    const GradeIcon = checkedLinks === 0 ? Shield : (grade === 'A' || grade === 'B' ? ShieldCheck : (grade === 'C' || grade === 'D' ? ShieldAlert : ShieldX));

    return (
        <Card className="col-span-1 md:col-span-2 flex flex-col justify-between min-h-[300px] md:min-h-[345px]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 relative">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <CardTitle className="truncate text-lg sm:text-xl">{t('analytics.healthScore.title', 'Collection Health')}</CardTitle>
                    <button
                        className="p-1 -m-1 text-muted-foreground/40 hover:text-primary transition-colors focus:outline-none shrink-0"
                        onClick={(e) => {
                            e.preventDefault();
                            alert(t('analytics.healthScore.accuracyDisclaimer'));
                        }}
                        title={t('analytics.healthScore.accuracyDisclaimer')}
                        type="button"
                    >
                        <Info className="h-4 w-4" />
                    </button>
                </div>
                <GradeIcon className={cn("h-5 w-5 shrink-0 ml-2", getGradeColor(grade))} />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center py-6">
                <div className={cn("text-7xl font-black mb-2 drop-shadow-sm", checkedLinks === 0 ? "text-muted-foreground/30" : getGradeColor(grade))}>
                    {checkedLinks === 0 ? '-' : grade}
                </div>

                {checkedLinks === 0 && (
                    <div className="text-[10px] uppercase tracking-wider font-bold text-yellow-600/80 dark:text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded mb-4 animate-pulse">
                        {t('analytics.healthScore.checkRequired')}
                    </div>
                )}

                <div className="w-full space-y-3 text-sm">
                    <div className="flex justify-between items-center px-4 py-2 bg-muted/40 rounded-md">
                        <span className="text-muted-foreground">{t('analytics.healthScore.brokenLinks', 'Broken Links')}</span>
                        <span className="font-medium font-mono text-foreground">{(brokenRatio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2 bg-muted/40 rounded-md">
                        <span className="text-muted-foreground">{t('analytics.healthScore.duplicates', 'Duplicates')}</span>
                        <span className="font-medium font-mono text-foreground">{(duplicateRatio * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
