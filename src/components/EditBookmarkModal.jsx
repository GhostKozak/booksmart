import { useState } from 'react'
import { SimpleModal } from './ui/SimpleModal'
import { Input } from './ui/input'
import { SimpleCombobox } from './ui/SimpleCombobox'
import { Button } from './ui/button'
import { X, Tag, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, isHttpUrl } from '../lib/utils'
import { fetchMetadataForUrl } from '../lib/metadata-fetcher'
import { toast } from 'sonner'

function normalizeTags(rawTags) {
    if (Array.isArray(rawTags)) return rawTags;
    if (typeof rawTags === 'string') {
        return rawTags.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
}

export function EditBookmarkModal({ isOpen, onClose, bookmark, onSave, availableFolders = [], availableTags = [] }) {
    const { t } = useTranslation()
    const [title, setTitle] = useState(bookmark?.title || '')
    const [url, setUrl] = useState(bookmark?.url || '')
    const [note, setNote] = useState(bookmark?.note || '')
    const [folder, setFolder] = useState(bookmark?.newFolder || bookmark?.originalFolder || '')
    const [tags, setTags] = useState(() => normalizeTags(bookmark?.tags))
    const [tagInput, setTagInput] = useState('')
    const [saving, setSaving] = useState(false)
    const [isFetchingMeta, setIsFetchingMeta] = useState(false)

    const [prevSync, setPrevSync] = useState({ id: bookmark?.id, isOpen });

    if (prevSync.id !== bookmark?.id || prevSync.isOpen !== isOpen) {
        setPrevSync({ id: bookmark?.id, isOpen });
        if (bookmark && isOpen) {
            setTitle(bookmark.title || '');
            setUrl(bookmark.url || '');
            setNote(bookmark.note || '');
            setFolder(bookmark.newFolder || bookmark.originalFolder || '');
            setTags(normalizeTags(bookmark.tags));
            setTagInput('');
        }
    }

    const handleAutoFetchMetadata = async () => {
        const cleanUrl = (url || '').trim();
        if (!cleanUrl || !isHttpUrl(cleanUrl)) {
            toast.error(t('bookmarks.editModal.invalidUrl', 'Lütfen geçerli bir web bağlantısı (https://...) girin.'));
            return;
        }
        setIsFetchingMeta(true);
        try {
            const meta = await fetchMetadataForUrl(cleanUrl, { forceRefresh: true });
            if (meta) {
                if (meta.title) setTitle(meta.title);
                if (meta.description && !note) setNote(meta.description);
                toast.success(t('bookmarks.editModal.metadataFetched', 'Sayfa bilgileri çekildi!'));
            } else {
                toast.info(t('bookmarks.editModal.noMetadata', 'Sayfa bilgisi bulunamadı.'));
            }
        } catch (err) {
            console.error('Failed to auto-fetch metadata:', err);
            toast.error(t('common.error', 'Bilgiler alınamadı'));
        } finally {
            setIsFetchingMeta(false);
        }
    };


    const handleAddTag = (tagName) => {
        const name = tagName.trim()
        if (name && !tags.includes(name)) {
            setTags(prev => [...prev, name])
        }
        setTagInput('')
    }

    const handleRemoveTag = (tagName) => {
        setTags(prev => prev.filter(t => t !== tagName))
    }

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            handleAddTag(tagInput)
        }
    }

    const availableTagNames = (availableTags || [])
        .map(t => (typeof t === 'string' ? t : t?.name))
        .filter(Boolean)
    const availableFolderNames = (availableFolders || [])
        .map(f => (typeof f === 'string' ? f : f?.name))
        .filter(Boolean)

    const handleSave = async () => {
        if (!title.trim() && !url.trim()) return
        setSaving(true)
        try {
            await onSave({
                id: bookmark.id,
                title: title.trim() || bookmark.title,
                url: url.trim() || bookmark.url,
                note: note.trim(),
                folder: (folder || '').trim(),
                tags,
            })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    return (
        <SimpleModal isOpen={isOpen} onClose={onClose} title={t('bookmarks.editModal.title')} className="max-w-xl">
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
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">URL</label>
                        <button
                            type="button"
                            onClick={handleAutoFetchMetadata}
                            disabled={isFetchingMeta || !url.trim()}
                            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title={t('bookmarks.editModal.fetchFromUrl', 'Sayfadan başlık ve açıklamayı otomatik çek')}
                        >
                            <Sparkles className={cn("w-3.5 h-3.5", isFetchingMeta && "animate-spin text-amber-500")} />
                            <span>{isFetchingMeta ? t('common.loading', 'Yükleniyor...') : t('bookmarks.editModal.fetchMetadata', 'Bilgileri URL\'den Çek')}</span>
                        </button>
                    </div>
                    <Input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>


                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('sidebar.sections.folders')}</label>
                    <SimpleCombobox
                        value={folder}
                        onChange={setFolder}
                        options={availableFolderNames}
                        placeholder={t('bookmarks.editModal.folderPlaceholder')}
                        allowCreate={true}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {t('sidebar.sections.tags')}
                    </label>
                    <div className="flex items-center gap-2">
                        <Input
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder={t('bookmarks.editModal.tagsPlaceholder')}
                            className="flex-1"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddTag(tagInput)}
                            disabled={!tagInput.trim()}
                        >
                            {t('common.add')}
                        </Button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {tags.map(tag => (
                                <span
                                    key={tag}
                                    className={cn(
                                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                                        "bg-primary/10 text-primary border border-primary/20"
                                    )}
                                >
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-destructive transition-colors"
                                        aria-label={t('common.remove')}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    {availableTagNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {availableTagNames
                                .filter(t => !tags.includes(t))
                                .slice(0, 20)
                                .map(tag => (
                                    <button
                                        key={tag}
                                        className="text-[10px] bg-muted hover:bg-secondary px-1.5 py-0.5 rounded-full transition-colors text-muted-foreground"
                                        onClick={() => handleAddTag(tag)}
                                    >
                                        +{tag}
                                    </button>
                                ))}
                        </div>
                    )}
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
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {t('common.save')}
                    </Button>
                </div>
            </div>
        </SimpleModal>
    )
}
