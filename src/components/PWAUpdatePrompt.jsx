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
        <div className="right-4 bottom-4 z-9999 fixed animate-slide-up">
            <div className="flex items-center gap-3 bg-primary shadow-2xl backdrop-blur-sm px-4 py-3 border border-border/20 rounded-xl max-w-sm text-primary-foreground">
                <RefreshCw size={18} className="animate-spin-slow shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t('pwa.updateAvailable')}</p>
                    <p className="opacity-80 mt-0.5 text-xs">{t('pwa.updateDesc')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                    >
                        {t('pwa.updateButton')}
                    </button>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                        aria-label={t('pwa.close')}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
