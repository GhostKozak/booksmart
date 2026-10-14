import { useState, useRef, useMemo } from 'react';
import { SimpleModal } from '../ui/SimpleModal';
import { Button } from '../ui/button';
import { Favicon } from '../Favicon';
import { generateQrPath, drawQrToCanvas } from '../../lib/qrcode';
import { QrCode, Copy, Check, Download, ExternalLink, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function QrCodeModal({ isOpen, bookmark, onClose }) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef(null);

    const url = bookmark?.url || '';
    const title = bookmark?.title || t('common.untitled', 'İsimsiz Yer İmi');

    const qrData = useMemo(() => {
        if (!url) return null;
        try {
            return generateQrPath(url, { margin: 2, errorCorrection: 'M' });
        } catch (err) {
            console.error('Failed to generate QR path:', err);
            return null;
        }
    }, [url]);

    if (!isOpen || !bookmark) return null;

    const handleCopy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success(t('qr.copiedLink', 'Bağlantı panoya kopyalandı!'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('common.error', 'Kopyalanamadı'));
        }
    };

    const handleDownloadPng = () => {
        if (!url || !canvasRef.current) return;
        try {
            drawQrToCanvas(canvasRef.current, url, { size: 600, margin: 2 });
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            const safeTitle = (bookmark.title || 'qrcode')
                .replace(/[^a-z0-9_-]/gi, '_')
                .slice(0, 30);
            link.download = `booksmart_qr_${safeTitle}.png`;
            link.href = dataUrl;
            link.click();
            toast.success(t('qr.downloadedSuccess', 'QR kod görseli indirildi!'));
        } catch (err) {
            console.error('Failed to download QR code:', err);
            toast.error(t('common.error', 'İndirilemedi'));
        }
    };

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('qr.modalTitle', 'Telefona Aktar (QR Kod)')}
        >
            <div className="flex flex-col items-center text-center space-y-4">
                {/* Hidden canvas for PNG export */}
                <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

                {/* Bookmark Summary */}
                <div className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border text-left">
                    <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border">
                        <Favicon url={url} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate" title={title}>
                            {title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate" title={url}>
                            {url}
                        </p>
                    </div>
                </div>

                {/* QR Code Container */}
                <div className="relative p-4 bg-white rounded-2xl shadow-md border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center">
                    {qrData ? (
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                            <svg
                                viewBox={`0 0 ${qrData.viewBoxSize} ${qrData.viewBoxSize}`}
                                className="w-full h-full text-black shape-rendering-crisp"
                                style={{ shapeRendering: 'crispEdges' }}
                                role="img"
                                aria-label={`QR code for ${title}`}
                            >
                                <path d={qrData.path} fill="#000000" />
                            </svg>
                            {/* Center Favicon Badge */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-white shadow-md border border-neutral-200 flex items-center justify-center p-1.5">
                                    <Favicon url={url} className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-56 h-56 flex items-center justify-center text-muted-foreground text-sm">
                            <QrCode className="w-10 h-10 opacity-30 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Camera Scan Tip */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Smartphone className="w-4 h-4 text-primary shrink-0" />
                    <span>{t('qr.scanTip', 'Telefonunuzun kamerasını açarak QR kodu tarayın.')}</span>
                </div>

                {/* Action Buttons */}
                <div className="w-full grid grid-cols-2 gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        className="w-full text-xs sm:text-sm"
                    >
                        {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-500" /> : <Copy className="w-4 h-4 mr-1.5" />}
                        {copied ? t('common.copied', 'Kopyalandı') : t('common.copyLink', 'Bağlantıyı Kopyala')}
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleDownloadPng}
                        className="w-full text-xs sm:text-sm"
                    >
                        <Download className="w-4 h-4 mr-1.5" />
                        {t('qr.downloadPng', 'PNG Olarak İndir')}
                    </Button>
                </div>

                {/* External link fallback */}
                <div className="w-full flex justify-between items-center pt-2 border-t text-xs">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('preview.openExternal', 'Yeni Sekmede Aç')}</span>
                    </a>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        {t('common.close', 'Kapat')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    );
}
