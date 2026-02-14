import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

export function SelectionInfo({ count, onClear }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-2 border-r pr-2 sm:pr-4 mx-auto sm:mx-0">
            <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
                {count}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{t('actionbar.selected')}</span>
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
