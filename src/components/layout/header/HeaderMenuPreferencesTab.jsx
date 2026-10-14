import { Monitor, Sun, Moon, Settings, Download, LogOut, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';

export function HeaderMenuPreferencesTab({
    theme = 'system',
    setTheme,
    openSettings,
    hasFileLoaded = false,
    openExportModal,
    closeFile,
    clearAll,
    onActionClick
}) {
    const { t, i18n } = useTranslation();

    const languages = [
        { code: 'tr', label: 'TR', flag: '🇹🇷' },
        { code: 'en', label: 'EN', flag: '🇬🇧' },
        { code: 'de', label: 'DE', flag: '🇩🇪' },
        { code: 'es', label: 'ES', flag: '🇪🇸' },
        { code: 'fr', label: 'FR', flag: '🇫🇷' }
    ];

    return (
        <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            {/* Theme Switcher */}
            <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                    {t('header.themeLabel', 'Tema')}
                </div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-accent/30 border border-border/50 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                            theme === 'system' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        )}
                    >
                        <Monitor className="h-3.5 w-3.5" />
                        <span>{t('header.system', 'Sistem')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                            theme === 'light' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        )}
                    >
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        <span>{t('header.lightMode', 'Açık')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                            theme === 'dark' ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        )}
                    >
                        <Moon className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{t('header.darkMode', 'Koyu')}</span>
                    </button>
                </div>
            </div>

            {/* Language Selector */}
            <div className="pt-1 border-t border-border/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                    {t('settings.language.label', 'Dil')}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {languages.map(lang => {
                        const isSelected = i18n.language?.startsWith(lang.code);
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs transition-all cursor-pointer gap-1",
                                    isSelected
                                        ? "bg-accent border-primary/40 ring-1 ring-primary/20 shadow-xs font-bold text-foreground"
                                        : "bg-background/60 hover:bg-accent/50 border-border/40 text-muted-foreground hover:text-foreground"
                                )}
                                title={lang.code.toUpperCase()}
                            >
                                <span className="text-lg leading-none">{lang.flag}</span>
                                <span className="text-[10px]">{lang.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* App Settings Button */}
            <div className="pt-1 border-t border-border/40">
                <button
                    type="button"
                    onClick={() => onActionClick(() => openSettings('folders'))}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/70 hover:bg-accent text-foreground transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold">{t('header.settings', 'Genel Ayarlar & Kurallar')}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">→</span>
                </button>
            </div>

            {/* Data & Session Management */}
            {hasFileLoaded && (
                <div className="pt-1 border-t border-border/40 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                        {t('header.dataManagement', 'Veri & Oturum')}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick(openExportModal)}
                        className="w-full h-9 text-xs font-medium justify-center border-border/70 hover:bg-accent cursor-pointer"
                    >
                        <Download className="h-3.5 w-3.5 mr-2 text-sky-500" />
                        <span>{t('header.export', 'Yer İmlerini Dışa Aktar (HTML/JSON/CSV)')}</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActionClick(closeFile)}
                            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground justify-center bg-muted/30 border border-border/40 cursor-pointer"
                        >
                            <LogOut className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <span className="truncate">{t('header.closeFile', 'Klasörü Kapat')}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActionClick(clearAll)}
                            className="h-8 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-destructive hover:text-destructive-foreground justify-center bg-destructive/5 border border-destructive/20 cursor-pointer"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            <span className="truncate">{t('common.clearAll', 'Tümünü Sıfırla')}</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
