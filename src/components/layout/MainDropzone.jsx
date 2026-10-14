import { CloudDownload } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export function MainDropzone({
    getRootProps,
    getInputProps,
    isDragActive,
    isExtensionConnected = false,
    importFromBrowser,
    isSyncing = false,
    openExtensionGuide
}) {
    const { t } = useTranslation();

    return (
        <main id="main-content" tabIndex={-1} className="relative flex-1 bg-secondary/10 p-3 sm:p-6 focus:outline-none overflow-x-hidden overflow-y-auto">
            <div className="flex flex-col justify-center items-center p-4 sm:p-8 h-full max-w-4xl mx-auto">
                <div
                    {...getRootProps()}
                    className={cn(
                        "flex flex-col justify-center items-center p-8 sm:p-14 border-2 border-dashed rounded-3xl w-full text-center transition-all cursor-pointer backdrop-blur-xs bg-card/40 shadow-xs",
                        isDragActive
                            ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/10"
                            : "border-border/80 hover:border-primary/50 hover:bg-card/70"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="bg-primary/10 mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl ring-4 ring-primary/5 animate-float">
                        <Logo className="w-12 sm:w-16 h-12 sm:h-16" />
                    </div>
                    <h3 className="mb-2 font-bold text-xl sm:text-2xl tracking-tight text-foreground">{t('main.dropzone.title')}</h3>
                    <p className="max-w-md text-muted-foreground text-xs sm:text-sm leading-relaxed mb-6">
                        {t('main.dropzone.desc')}
                    </p>
                    <Button variant="outline" className="cursor-pointer rounded-xl font-medium px-5 h-9 border-primary/30 hover:border-primary hover:bg-primary/5">
                        {t('main.dropzone.browse')}
                    </Button>
                </div>

                {isExtensionConnected && importFromBrowser ? (
                    <div className="mt-6 flex flex-col items-center">
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{t('main.dropzone.extensionConnected', 'Companion Extension Connected')}</span>
                        </div>
                        <Button
                            type="button"
                            variant="default"
                            disabled={isSyncing}
                            onClick={(e) => {
                                e.stopPropagation();
                                importFromBrowser();
                            }}
                            className="gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                            <CloudDownload className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                            <span>{t('main.dropzone.importFromBrowserDirect', 'Import Browser Bookmarks (1-Click)')}</span>
                        </Button>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-col items-center max-w-md text-center p-4 rounded-2xl bg-card/60 border border-border/60 shadow-xs">
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                            {t('main.dropzone.pullWithoutFileTitle', 'Direct Browser Import')}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                            {t('main.dropzone.pullWithoutFileDesc', 'Import bookmarks straight from your browser without exporting an HTML file first.')}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                openExtensionGuide?.();
                            }}
                            className="gap-2 text-xs h-9 px-4 rounded-xl font-medium hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                            <CloudDownload className="h-3.5 w-3.5 text-primary" />
                            <span>{t('main.dropzone.setupExtensionBtn', 'Install Extension & Pull Bookmarks')}</span>
                        </Button>
                    </div>
                )}
            </div>
        </main>
    );
}
