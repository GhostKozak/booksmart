import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { MoreVertical } from 'lucide-react';

export function DropdownMenu({ trigger, children, align = 'right', className }) {
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
                        "absolute z-50 mt-2 min-w-[200px] w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2",
                        align === 'right' ? 'right-0' : 'left-0'
                    )}
                >
                    <div className="flex flex-col gap-1" onClick={() => setIsOpen(false)}>
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
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
                variant === 'destructive' && "text-destructive hover:bg-destructive/10 hover:text-destructive",
                className
            )}
        >
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {children}
        </button>
    );
}

export function DropdownSeparator() {
    return <div className="-mx-1 my-1 h-px bg-muted" />;
}

export function DropdownLabel({ children }) {
    return <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{children}</div>;
}
