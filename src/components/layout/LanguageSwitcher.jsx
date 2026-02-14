import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">{t('settings.language.label')}</label>
            <div className="flex gap-2">
                <button
                    onClick={() => changeLanguage('en')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${i18n.language.startsWith('en')
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                >
                    English
                </button>
                <button
                    onClick={() => changeLanguage('tr')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${i18n.language.startsWith('tr')
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                >
                    Türkçe
                </button>
            </div>
        </div>
    );
};
