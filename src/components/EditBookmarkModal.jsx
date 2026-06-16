import { useState, useEffect } from 'react'
import { SimpleModal } from './ui/SimpleModal'
import { Input } from './ui/input'
import { SimpleCombobox } from './ui/SimpleCombobox'
import { Button } from './ui/button'
import { X, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

export function EditBookmarkModal({ isOpen, onClose, bookmark, onSave, availableFolders = [], availableTags = [] }) {
    const { t } = useTranslation()
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [note, setNote] = useState('')
    const [folder, setFolder] = useState('')
    const [tags, setTags] = useState([])
    const [tagInput, setTagInput] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (bookmark && isOpen) {
            setTitle(bookmark.title || '')
            setUrl(bookmark.url || '')
            setNote(bookmark.note || '')
            setFolder(bookmark.newFolder || bookmark.originalFolder || '')
            setTags(bookmark.tags || [])
            setTagInput('')
        }
    }, [bookmark, isOpen])

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

    const availableTagNames = availableTags.map(t => t.name)

    const handleSave = async () => {
        if (!title.trim() && !url.trim()) return
        setSaving(true)
        try {
            await onSave({
                id: bookmark.id,
                title: title.trim() || bookmark.title,
                url: url.trim() || bookmark.url,
                note: note.trim(),
                folder: folder || bookmark.originalFolder || '',
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
                    <label className="text-sm font-medium">URL</label>
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
                        options={availableFolders.map(f => f.name)}
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
