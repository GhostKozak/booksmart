import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onChange, onCheckedChange, ...props }, ref) => {
    const handleClick = () => {
        const handler = onCheckedChange || onChange;
        handler?.(!checked);
    };

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            ref={ref}
            onClick={handleClick}
            className={cn(
                "peer h-5 w-5 shrink-0 rounded-md border-2 border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors duration-200",
                checked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-input hover:bg-muted",
                className
            )}
            {...props}
        >
            {checked && (
                <Check className="h-4 w-4 stroke-[3px] text-current" />
            )}
        </button>
    );
})
Checkbox.displayName = "Checkbox"

export { Checkbox }

