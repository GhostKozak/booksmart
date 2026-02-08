import { Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Favicon({ url, className = "w-4 h-4" }) {
    const [error, setError] = useState(false);

    // Helper to extract domain safely
    const getDomain = (url) => {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return null;
        }
    };

    const domain = getDomain(url);

    if (!domain || error) {
        return <Globe className={cn("text-muted-foreground", className)} />;
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
            alt=""
            className={cn("rounded-sm object-contain", className)}
            onError={() => setError(true)}
        />
    );
}
