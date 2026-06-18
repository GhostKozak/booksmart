import { Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export function Favicon({ url, className = "w-4 h-4" }) {
    const [fallbackIndex, setFallbackIndex] = useState(0);

    // Helper to extract domain safely
    const getDomain = (url) => {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    };

    const domain = getDomain(url);

    // Reset fallback index when url changes
    useEffect(() => {
        setFallbackIndex(0);
    }, [url]);

    if (!domain || fallbackIndex >= 2) {
        return <Globe className={cn("text-muted-foreground", className)} />;
    }

    const getSrc = () => {
        if (fallbackIndex === 0) {
            return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
        }
        if (fallbackIndex === 1) {
            return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
        }
        return null;
    };

    const src = getSrc();

    if (!src) {
        return <Globe className={cn("text-muted-foreground", className)} />;
    }

    return (
        <img
            src={src}
            alt=""
            className={cn("rounded-sm object-contain", className)}
            onError={() => setFallbackIndex((prev) => prev + 1)}
        />
    );
}
