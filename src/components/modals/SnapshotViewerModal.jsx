import React, { useState, useEffect } from 'react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import {
    Download,
    ExternalLink,
    Trash2,
    HardDrive,
    History,
    Calendar,
    Globe
} from 'lucide-react';
import {
    getSnapshot,
    deleteSnapshot,
    downloadSnapshotFile,
    formatByteSize,
    getWaybackMachineUrl
} from '../../lib/snapshot-service';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function SnapshotViewerModal({ isOpen, onClose, bookmark, onSnapshotDeleted }) {
    const { t } = useTranslation();
    const [loadedUrl, setLoadedUrl] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!isOpen || !bookmark?.url) return;

        getSnapshot(bookmark.url, bookmark.id)
            .then((data) => {
                if (isMounted) {
                    setSnapshot(data);
                    setLoadedUrl(bookmark.url);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load snapshot:', err);
                if (isMounted) {
                    setLoadedUrl(bookmark.url);
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, bookmark?.url, bookmark?.id]);

    if (!isOpen || !bookmark) return null;

    const isCurrentLoading = isLoading || (isOpen && bookmark?.url !== loadedUrl);

    const handleDelete = async () => {
        if (!snapshot) return;
        await deleteSnapshot(snapshot.url, bookmark.id);
        toast.success(t('snapshots.deletedSuccess', 'Çevrimdışı arşiv silindi'));
        onSnapshotDeleted?.(bookmark.id);
        onClose();
    };

    const handleDownload = () => {
        if (!snapshot) return;
        downloadSnapshotFile(snapshot);
        toast.success(t('snapshots.downloadedSuccess', 'Çevrimdışı HTML dosyası indirildi!'));
    };

    const waybackUrl = getWaybackMachineUrl(bookmark.url);

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('snapshots.viewerTitle', 'Çevrimdışı Sayfa Arşivi (Offline Snapshot)')}
            className="max-w-4xl"
        >
            <div className="space-y-4">
                {/* Header Summary & Stats */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border">
                    <div className="flex items-center gap-3">
                        <span className="text-xl w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <HardDrive className="w-5 h-5" />
                        </span>
                        <div>
                            <h3 className="font-semibold text-sm leading-tight line-clamp-1">{bookmark.title || bookmark.url}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                                {snapshot && (
                                    <>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(snapshot.savedAt).toLocaleDateString()}
                                        </span>
                                        <span>•</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatByteSize(snapshot.byteSize)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {snapshot && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>{t('snapshots.downloadHtml', 'HTML İndir')}</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(waybackUrl, '_blank')}
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            title="Internet Archive Wayback Machine"
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>Wayback Machine</span>
                        </Button>

                        {snapshot && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                                title={t('common.delete', 'Sil')}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="border rounded-2xl overflow-hidden bg-background h-[500px] flex flex-col">
                    {isCurrentLoading ? (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            {t('common.loading', 'Yükleniyor...')}
                        </div>
                    ) : snapshot ? (
                        <iframe
                            title="Offline Snapshot"
                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{max-width:760px;margin:32px auto;padding:0 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.65;color:#1f2937;background:#fff;}@media(prefers-color-scheme:dark){body{background:#111;color:#e5e7eb;}}img{max-width:100%;height:auto;border-radius:8px;}</style></head><body><h1>${snapshot.title || ''}</h1>${snapshot.html}</body></html>`}
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground gap-3">
                            <Globe className="w-10 h-10 opacity-30" />
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">{t('snapshots.notFoundTitle', 'Henüz yerel çevrimdışı kopya yok')}</p>
                                <p className="text-xs max-w-sm opacity-75">
                                    {t('snapshots.notFoundDesc', 'Bu sayfanın tam HTML kopyasını Reader Mode üzerinden "Çevrimdışı Arşivle" butonuna basarak IndexedDB\'ye kaydedebilirsiniz.')}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(waybackUrl, '_blank')}
                                className="gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                            >
                                <History className="w-3.5 h-3.5" />
                                <span>{t('snapshots.checkWayback', 'Wayback Machine\'de Ara')}</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {t('snapshots.offlineReady', 'İnternet bağlantısı olmasa bile tamamen yerel IndexedDB\'den okunabilir.')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        {t('common.close', 'Kapat')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
