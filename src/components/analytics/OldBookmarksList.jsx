import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function OldBookmarksList({ bookmarks }) {
    const { t } = useTranslation();

    if (!bookmarks || bookmarks.length === 0) return null;

    return (
        <Card className="col-span-1 md:col-span-6 flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {t('analytics.oldItems.title', 'Oldest Treasures')}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2">
                <div className="space-y-3">
                    {bookmarks.map((bookmark) => {
                        const date = bookmark.addDate ? new Date(parseInt(bookmark.addDate) * 1000) : null;

                        return (
                            <div key={bookmark.id} className="group flex items-start justify-between gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-muted-foreground/10">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                        {bookmark.title || 'Untitled'}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded leading-none shrink-0">
                                            {date ? format(date, 'MMM d, yyyy') : 'Unknown date'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate opacity-70 block min-w-0 break-all">
                                            {bookmark.url}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    href={bookmark.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pt-1 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
