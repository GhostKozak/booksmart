import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useTranslation } from 'react-i18next';

export function TagCloudVisual({ tags }) {
    const { t } = useTranslation();

    const hasTags = tags && tags.length > 0;
    const maxCount = hasTags ? Math.max(...tags.map(t => t.count)) : 0;
    const minCount = hasTags ? Math.min(...tags.map(t => t.count)) : 0;

    return (
        <Card className="col-span-1 md:col-span-3 flex flex-col min-h-[300px]">
            <CardHeader className="pb-2">
                <CardTitle>{t('analytics.tagCloud.title', 'Tag Cloud')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-wrap content-center items-center justify-center gap-2 pt-2 pb-4">
                {hasTags ? (
                    tags.map((tagObj) => {
                        const ratio = maxCount > minCount ? (tagObj.count - minCount) / (maxCount - minCount) : 0.5;
                        const size = 0.75 + (ratio * 1.0);
                        const opacity = 0.6 + (ratio * 0.4);

                        return (
                            <span
                                key={tagObj.tag}
                                className="inline-block px-2 py-1 bg-muted/60 text-foreground rounded-lg whitespace-nowrap transition-all hover:bg-primary hover:text-primary-foreground cursor-default hover:scale-110 shadow-sm"
                                style={{
                                    fontSize: `${size}rem`,
                                    opacity: opacity
                                }}
                                title={`${tagObj.tag}: ${tagObj.count} ${t('common.bookmarks', 'bookmarks')}`}
                            >
                                {tagObj.tag}
                            </span>
                        );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground opacity-60 italic text-center px-4">
                        {t('analytics.tagCloud.noTags')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
