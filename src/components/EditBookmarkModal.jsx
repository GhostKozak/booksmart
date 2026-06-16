import { useState, useEffect } from 'react'
import { SimpleModal } from './ui/SimpleModal'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useTranslation } from 'react-i18next'

export function EditBookmarkModal({ isOpen, onClose, bookmark, onSave }) {
    const { t } = useTranslation()
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (bookmark && isOpen) {
            setTitle(bookmark.title || '')
            setUrl(bookmark.url || '')
            setNote(bookmark.note || '')
        }
    }, [bookmark, isOpen])

    const handleSave = async () => {
        if (!title.trim() && !url.trim()) return
        setSaving(true)
        try {
            await onSave({
                id: bookmark.id,
                title: title.trim() || bookmark.title,
                url: url.trim() || bookmark.url,
                note: note.trim(),
            })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title={t('bookmarks.editModal.title')}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('common.title')}</label>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={t('bookmarks.editModal.titlePlaceholder')}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">URL</label>
                    <Input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('notes.label')}</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={t('notes.placeholder')}
                        rows={3}
                        className="w-full bg-background border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>
                        {t('modals.sortConf.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {t('common.save')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
