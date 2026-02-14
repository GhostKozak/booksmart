import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Search, Regex, Type } from 'lucide-react';
import { cn } from '../lib/utils';

export function AdvancedSearch({
    isOpen,
    searchMode,
    setSearchMode,
    dateFilter,
    setDateFilter,
    className
}) {
    if (!isOpen) return null;

    return (
        <div className={cn("bg-card border rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-2", className)}>
            <div className="flex flex-col gap-4">

                {/* Search Modes */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="text-sm font-medium text-muted-foreground w-20">Mode:</div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={searchMode === 'simple' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('simple')}
                            className="h-7 text-xs"
                            title="Standard exact substring matching"
                        >
                            <Type className="h-3 w-3 mr-1.5" />
                            Simple
                        </Button>

                        <Button
                            variant={searchMode === 'fuzzy' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('fuzzy')}
                            className="h-7 text-xs"
                            title="Typo-tolerant matching"
                        >
                            <Search className="h-3 w-3 mr-1.5" />
                            Fuzzy
                        </Button>

                        <Button
                            variant={searchMode === 'regex' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchMode('regex')}
                            className="h-7 text-xs font-mono"
                            title="Regular Expression matching"
                        >
                            <Regex className="h-3 w-3 mr-1.5" />
                            Regex
                        </Button>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 border-t">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 w-20">
                        <Calendar className="h-4 w-4" />
                        Added:
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">From</span>
                            <Input
                                type="date"
                                className="h-8 w-auto min-w-[130px] text-xs px-2"
                                value={dateFilter.start || ''}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">To</span>
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
                                Clear Date
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
