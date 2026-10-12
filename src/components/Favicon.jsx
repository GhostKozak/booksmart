import { Globe } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Favicon({ url, customIcon, className = "w-4 h-4" }) {
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

    const [prevProps, setPrevProps] = useState({ url, customIcon });

    if (url !== prevProps.url || customIcon !== prevProps.customIcon) {
        setPrevProps({ url, customIcon });
        setFallbackIndex(0);
    }

    const hasCustom = !!customIcon;
    const maxFallbacks = hasCustom ? 3 : 2;

    if (!domain || fallbackIndex >= maxFallbacks) {
        return <Globe className={cn("text-muted-foreground", className)} />;
    }

    const getSrc = () => {
        if (hasCustom) {
            if (fallbackIndex === 0) return customIcon;
            if (fallbackIndex === 1) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
            if (fallbackIndex === 2) return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
        } else {
            if (fallbackIndex === 0) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
            if (fallbackIndex === 1) return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
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
