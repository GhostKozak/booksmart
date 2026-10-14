import { memo } from 'react';
import { getReminderStatus } from '../../lib/reminder-service';
import { BellRing, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export const ReminderBadge = memo(({ reminderAt, onClick, className }) => {
    const { t } = useTranslation();
    if (!reminderAt) return null;

    const status = getReminderStatus(Number(reminderAt), t);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            title={`${status.fullDate} (${status.text})`}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer shrink-0",
                status.isOverdue
                    ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 animate-pulse hover:bg-red-500/25"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25",
                className
            )}
        >
            {status.isOverdue ? (
                <BellRing className="w-2.5 h-2.5 shrink-0 text-red-500" />
            ) : (
                <Clock className="w-2.5 h-2.5 shrink-0 text-amber-500" />
            )}
            <span className="truncate max-w-[120px]">{status.text}</span>
        </button>
    );
});

ReminderBadge.displayName = 'ReminderBadge';
