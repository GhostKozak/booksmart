import { AlertCircle, Download, Trash2 } from 'lucide-react'
import { SimpleModal } from '../ui/SimpleModal'
import { Button } from '../ui/button'
import { useTranslation, Trans } from 'react-i18next'

export function ClearAllModal({ isOpen, onClose, onConfirm }) {
    const { t } = useTranslation()

    return (
        <SimpleModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('modals.clearAll.title')}
        >
            <div className="space-y-4">
                <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                        <Trans i18nKey="modals.clearAll.content">
                            This will delete <strong>ALL</strong> Bookmarks, Rules, Custom Folders, Tags, and Settings.
                            <br /><br />
                            This action cannot be undone unless you have a backup.
                        </Trans>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <Button
                                variant="default"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => onConfirm(true)}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {t('modals.clearAll.backupAndClear')}
                            </Button>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={() => onConfirm(false)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('modals.clearAll.clearEverything')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </SimpleModal>
    )
}
