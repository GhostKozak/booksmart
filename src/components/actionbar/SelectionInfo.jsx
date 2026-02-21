import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export function SelectionInfo({ count, onClear, isMobileBreakpoint = false }) {
    const { t } = useTranslation();
    return (
        <div className={cn(
            "flex items-center gap-2 border-r pr-2 mx-auto sm:mx-0",
            isMobileBreakpoint ? "min-[1200px]:pr-4" : "sm:pr-4"
        )}>
            <div className={cn(
                "bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold rounded-full h-5 flex items-center justify-center shrink-0 px-1",
                isMobileBreakpoint
                    ? "min-w-[1.25rem] min-[1200px]:min-w-[1.5rem] min-[1200px]:h-6 min-[1200px]:px-1.5"
                    : "min-w-[1.25rem] sm:min-w-[1.5rem] sm:h-6 sm:px-1.5"
            )}>
                {count}
            </div>
            <span className={cn(
                "text-sm font-medium hidden",
                isMobileBreakpoint ? "min-[1200px]:inline" : "sm:inline"
            )}>{t('actionbar.selected')}</span>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full -ml-1 hover:bg-muted shrink-0"
                onClick={onClear}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}
