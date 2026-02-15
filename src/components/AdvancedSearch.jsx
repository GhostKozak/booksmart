import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Search, Regex, Type } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export function AdvancedSearch({
    isOpen,
    searchMode,
    setSearchMode,
    dateFilter,
    setDateFilter,
    className
}) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className={cn("bg-card border rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-2", className)}>
            <div className="flex flex-col gap-4">

                {/* Search Modes */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="text-sm font-medium text-muted-foreground w-20">{t('header.advanced.mode')}</div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={searchMode === 'simple' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('simple')}
                            className="h-7 text-xs"
                            title={t('header.advanced.modes.simpleTitle')}
                        >
                            <Type className="h-3 w-3 mr-1.5" />
                            {t('header.advanced.modes.simple')}
                        </Button>

                        <Button
                            variant={searchMode === 'fuzzy' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('fuzzy')}
                            className="h-7 text-xs"
                            title={t('header.advanced.modes.fuzzyTitle')}
                        >
                            <Search className="h-3 w-3 mr-1.5" />
                            {t('header.advanced.modes.fuzzy')}
                        </Button>

                        <Button
                            variant={searchMode === 'regex' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('regex')}
                            className="h-7 text-xs font-mono"
                            title={t('header.advanced.modes.regexTitle')}
                        >
                            <Regex className="h-3 w-3 mr-1.5" />
                            {t('header.advanced.modes.regex')}
                        </Button>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 border-t">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 w-20">
                        <Calendar className="h-4 w-4" />
                        {t('header.advanced.date.added')}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t('header.advanced.date.from')}</span>
                            <Input
                                type="date"
                                className="h-8 w-auto min-w-[130px] text-xs px-2"
                                value={dateFilter.start || ''}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t('header.advanced.date.to')}</span>
                            <Input
                                type="date"
                                className="h-8 w-auto min-w-[130px] text-xs px-2"
                                value={dateFilter.end || ''}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>

                        {(dateFilter.start || dateFilter.end) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto sm:ml-0"
                                onClick={() => setDateFilter({ start: null, end: null })}
                            >
                                {t('header.advanced.date.clear')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
