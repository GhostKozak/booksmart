import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '../ui/button';

export function OldBookmarksAlert({ count, onFilterOld }) {
    if (count === 0) return null;

    return (
        <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800 lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400">Dusty Shelves</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{count}</div>
                        <p className="text-xs text-amber-600/80 dark:text-amber-500/70 mb-2">
                            Bookmarks &gt; 5 years old
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={onFilterOld}
                        className="text-sm font-medium text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-md transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/60"
                    >
                        Review and clean up <Link2 className="h-3 w-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
