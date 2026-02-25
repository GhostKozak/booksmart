import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { MoreVertical } from 'lucide-react';

export function DropdownMenu({ trigger, children, align = 'right', side = 'bottom', className }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {isOpen && (
                <div
                    className={cn(
                        "absolute z-50 min-w-[280px] sm:w-[320px] w-[calc(100vw-32px)] max-w-[400px] rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl p-2 text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 max-h-[70dvh] sm:max-h-[85dvh] overflow-y-auto ring-1 ring-white/10",
                        side === 'top' ? 'bottom-full mb-2 slide-in-from-bottom-2 origin-bottom' : 'top-full mt-2 slide-in-from-top-2 origin-top',
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    <div className="flex flex-col gap-1.5" onClick={() => setIsOpen(false)}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

export function DropdownItem({ children, onClick, className, variant = 'default', icon: Icon, disabled }) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-accent/80 hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 text-foreground/80 hover:shadow-sm",
                variant === 'destructive' && "text-destructive hover:bg-destructive/10 hover:text-destructive",
                className
            )}
        >
            {Icon && <Icon className="mr-2.5 h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />}
            {children}
        </button>
    );
}

export function DropdownSeparator() {
    return <div className="-mx-2 my-1.5 h-px bg-border/40" />;
}

export function DropdownLabel({ children, className }) {
    return <div className={cn("px-3 py-2 text-xs font-semibold text-foreground/70 flex items-center gap-2", className)}>{children}</div>;
}
