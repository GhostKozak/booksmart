import {
    Sun,
    Moon,
    Laptop,
    Globe,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Command,
    RefreshCw,
    HelpCircle,
    Check
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

export function GeneralTab({
    isExtensionConnected,
    isTestingExtension,
    handleTestExtension
}) {
    const { t, i18n } = useTranslation()
    const {
        theme,
        setTheme,
        openExtensionGuide,
        setIsShortcutsOpen
    } = useAppStore()

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng)
        localStorage.setItem('i18nextLng', lng)
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Appearance / Theme */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        {t('settings.theme.title', 'Görünüm ve Tema')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        {t('settings.theme.desc', 'Uygulama arayüzünün renk temasını belirleyin.')}
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'light', label: t('settings.theme.light'), icon: Sun, desc: t('settings.theme.lightDesc', 'Light colors') },
                        { id: 'dark', label: t('settings.theme.dark'), icon: Moon, desc: t('settings.theme.darkDesc', 'Dark colors') },
                        { id: 'system', label: t('settings.theme.system'), icon: Laptop, desc: t('settings.theme.systemDesc', 'Follows system preferences') }
                    ].map((tOption) => {
                        const Icon = tOption.icon
                        const isSelected = theme === tOption.id
                        return (
                            <button
                                key={tOption.id}
                                type="button"
                                onClick={() => setTheme(tOption.id)}
                                className={cn(
                                    'flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer relative',
                                    isSelected
                                        ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs'
                                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="w-5 h-5 mb-2" />
                                <span className="text-xs font-semibold">{tOption.label}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{tOption.desc}</span>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="border-t border-border/50" />

            {/* Language Selection */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-500" />
                        {t('settings.language.label', 'Dil Tercihi')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        {t('settings.language.select', 'Kullanmak istediğiniz dili seçin.')}
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                        { code: 'tr', name: t('settings.languages.tr', 'Türkçe'), flag: '🇹🇷' },
                        { code: 'en', name: t('settings.languages.en', 'English'), flag: '🇬🇧' },
                        { code: 'de', name: t('settings.languages.de', 'Deutsch'), flag: '🇩🇪' },
                        { code: 'es', name: t('settings.languages.es', 'Español'), flag: '🇪🇸' },
                        { code: 'fr', name: t('settings.languages.fr', 'Français'), flag: '🇫🇷' }
                    ].map((lang) => {
                        const isSelected = i18n.language?.startsWith(lang.code)
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => changeLanguage(lang.code)}
                                className={cn(
                                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                                    isSelected
                                        ? 'border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/20'
                                        : 'border-border/60 hover:bg-muted/50 text-foreground'
                                )}
                            >
                                <span className="text-base">{lang.flag}</span>
                                <span className="text-xs flex-1">{lang.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="border-t border-border/50" />

            {/* Browser Companion Extension */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            {t('settings.network.extensionTitle', 'Companion Tarayıcı Eklentisi')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.network.extensionDesc', 'CORS kısıtlaması olmadan sunucusuz ölü bağlantı denetimi sağlar.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openExtensionGuide?.()}
                            className="h-7 text-xs gap-1 cursor-pointer"
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                            {t('settings.network.extensionGuideBtn', 'Kılavuz')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isTestingExtension}
                            onClick={handleTestExtension}
                            className="h-7 text-xs gap-1 cursor-pointer"
                        >
                            <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', isTestingExtension && 'animate-spin')} />
                            {t('settings.network.extensionRetryBtn', 'Bağlantıyı Yenile')}
                        </Button>
                    </div>
                </div>

                <div
                    className={cn(
                        'p-3.5 rounded-xl border flex items-start gap-3 transition-colors',
                        isExtensionConnected
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
                            : 'bg-muted/30 border-border/60 text-muted-foreground'
                    )}
                >
                    {isExtensionConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                        <div className="font-semibold text-foreground">
                            {isExtensionConnected
                                ? t('settings.network.extensionConnected', "Companion Eklentisi Bağlı (CORS'suz)")
                                : t('settings.network.extensionNotDetected', 'Companion Eklentisi Algılanmadı')}
                        </div>
                        <p className="leading-relaxed opacity-90">
                            {isExtensionConnected
                                ? t('settings.network.extensionConnectedDesc', 'Bağlantı kontrolleri eklenti üzerinden doğrudan ve %100 doğru HTTP durum kodlarıyla çalışıyor.')
                                : t('settings.network.extensionNotDetectedDesc', 'Eklentisiz modda tarayıcı CORS kısıtlamaları nedeniyle ölü bağlantılar güvenilir tespit edilemeyebilir.')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-t border-border/50" />

            {/* Keyboard Shortcuts Card */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Command className="w-4 h-4 text-violet-500" />
                            {t('settings.shortcuts.title', 'Klavye Kısayolları')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.shortcuts.desc', 'Hızlı klavye komutlarıyla daha verimli gezinin.')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsShortcutsOpen(true)}
                        className="h-7 text-xs cursor-pointer"
                    >
                        {t('settings.shortcuts.viewAll', 'Tüm Kısayolları Gör')}
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('settings.shortcuts.commandPalette', 'Command Palette & Search')}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">⌘ / Ctrl + K</kbd>
                    </div>
                    <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('settings.shortcuts.quickPreview', 'Quick Preview')}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">{t('settings.shortcuts.spaceKey', 'Space')}</kbd>
                    </div>
                    <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('settings.shortcuts.focusSearch', 'Focus Search')}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">⌘ / Ctrl + F</kbd>
                    </div>
                    <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('settings.shortcuts.closeModals', 'Close Modals')}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">Escape</kbd>
                    </div>
                </div>
            </div>
        </div>
    )
}
