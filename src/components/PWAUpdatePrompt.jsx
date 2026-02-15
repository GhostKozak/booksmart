import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PWAUpdatePrompt() {
    const { t } = useTranslation();
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, registration) {
            // Check for updates every hour
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('SW registration error:', error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-slide-up">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-2xl border border-border/20 backdrop-blur-sm max-w-sm">
                <RefreshCw size={18} className="shrink-0 animate-spin-slow" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t('pwa.updateAvailable')}</p>
                    <p className="text-xs opacity-80 mt-0.5">{t('pwa.updateDesc')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        {t('pwa.updateButton')}
                    </button>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                        aria-label={t('pwa.close')}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
