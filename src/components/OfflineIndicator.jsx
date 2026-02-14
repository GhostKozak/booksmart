import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OfflineIndicator() {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/90 text-white text-sm font-medium shadow-lg backdrop-blur-sm">
                <WifiOff size={16} className="shrink-0" />
                <span>{t('offline')}</span>
            </div>
        </div>
    );
}
