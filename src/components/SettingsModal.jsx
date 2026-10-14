import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import {
    SlidersHorizontal,
    Folder,
    Tag,
    Sparkles,
    Database,
    Info,
    X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from './ui/button'
import { AI_MODELS, DEFAULT_MODEL, resolveEffectiveModel } from '../services/ai-service'
import {
    unlockVault,
    lockVault,
    saveSecret,
    loadSecret,
    isVaultUnlocked,
    hasVault,
    clearVault,
    migrateFromLocalStorage,
    getStoredCorsProxy,
    saveStoredCorsProxy,
    getAutoSummarizeEnabled,
    setAutoSummarizeEnabled
} from '../lib/key-vault'
import { subscribeExtensionStatus, pingExtension } from '../lib/extension-client'
import { db } from '../db'
import packageJson from '../../package.json'
import { cn } from '../lib/utils'
import { GeneralTab } from './settings/GeneralTab'
import { AITab } from './settings/AITab'
import { AboutTab } from './settings/AboutTab'

const TaxonomyManager = lazy(() => import('./TaxonomyManager').then(m => ({ default: m.TaxonomyManager })))
const BackupSettings = lazy(() => import('./BackupSettings').then(m => ({ default: m.BackupSettings })))

export function SettingsModal({
    isOpen,
    onClose,
    activeTab: propActiveTab,
    onTabChange,
    folders = [],
    setFolders,
    tags = [],
    setTags,
    discoveredFolders = [],
    discoveredTags = [],
    onSave
}) {
    const { t } = useTranslation()

    // Determine current active tab
    // Default to 'ai' if onSave is passed or no propActiveTab is provided (ensures unit test compatibility)
    const [localTab, setLocalTab] = useState(propActiveTab || (onSave ? 'ai' : 'general'))
    const currentTab = propActiveTab || localTab || 'ai'

    const handleSelectTab = (tab) => {
        setLocalTab(tab)
        onTabChange?.(tab)
    }

    // AI & Vault State
    const [apiKey, setApiKey] = useState('')
    const [ollamaUrl, setOllamaUrl] = useState(() => sessionStorage.getItem('bs_ollama_url') || localStorage.getItem('bs_ollama_url') || '')
    const [selectedModel, setSelectedModel] = useState(() => resolveEffectiveModel(sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model') || DEFAULT_MODEL))
    const [autoSummarize, setAutoSummarize] = useState(() => getAutoSummarizeEnabled())
    const [vaultPassword, setVaultPassword] = useState('')
    const [vaultNewPassword, setVaultNewPassword] = useState('')
    const [unlocked, setUnlocked] = useState(isVaultUnlocked())
    const [vaultExists, setVaultExists] = useState(hasVault())
    const [unlockError, setUnlockError] = useState('')
    const [corsProxy, setCorsProxy] = useState(() => getStoredCorsProxy())
    const [showApiKey, setShowApiKey] = useState(false)

    // Extension status
    const [isExtensionConnected, setIsExtensionConnected] = useState(false)
    const [isTestingExtension, setIsTestingExtension] = useState(false)

    // Live counts for About section
    const bookmarkCount = useLiveQuery(() => (db?.bookmarks ? db.bookmarks.count() : 0)) || 0
    const snapshotCount = useLiveQuery(() => (db?.snapshots ? db.snapshots.count() : 0)) || 0
    const collectionCount = useLiveQuery(() => (db?.collections ? db.collections.count() : 0)) || 0

    // Load initial settings on open
    const [prevOpen, setPrevOpen] = useState(false)
    if (isOpen && !prevOpen) {
        setPrevOpen(true)
        const vaultUnlocked = isVaultUnlocked()
        const vaultPresent = hasVault()
        setUnlocked(vaultUnlocked)
        setVaultExists(vaultPresent)
        if (!vaultPresent) {
            const storedKey = sessionStorage.getItem('bs_api_key') || localStorage.getItem('bs_api_key')
            if (storedKey) setApiKey(storedKey)
        }
        const storedModel = sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model')
        if (storedModel) setSelectedModel(resolveEffectiveModel(storedModel))
        const storedOllama = sessionStorage.getItem('bs_ollama_url') || localStorage.getItem('bs_ollama_url')
        if (storedOllama) setOllamaUrl(storedOllama)
        setVaultPassword('')
        setUnlockError('')
        setCorsProxy(getStoredCorsProxy())
        setAutoSummarize(getAutoSummarizeEnabled())
    } else if (!isOpen && prevOpen) {
        setPrevOpen(false)
    }

    useEffect(() => {
        if (isOpen && isVaultUnlocked()) {
            loadSecret().then((k) => {
                if (k) setApiKey(k)
            })
        }
    }, [isOpen])

    useEffect(() => {
        const unsubscribe = subscribeExtensionStatus((status) => {
            setIsExtensionConnected(Boolean(status.available))
        })
        return () => unsubscribe()
    }, [])

    // Escape key listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.()
            }
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    const handleUnlock = async () => {
        setUnlockError('')
        try {
            await unlockVault(vaultPassword)
            const key = await loadSecret()
            if (key) setApiKey(key)
            setUnlocked(true)
            setVaultPassword('')
            const storedModel = sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model')
            if (storedModel) setSelectedModel(resolveEffectiveModel(storedModel))
            toast.success(t('settings.vault.unlockedBadge', 'Kasa açıldı'))
        } catch {
            setUnlockError(t('settings.vault.wrongPassword'))
        }
    }

    const handleCreateVault = async () => {
        if (!vaultNewPassword) {
            toast.error(t('settings.vault.enterPassword'))
            return
        }
        try {
            const keyToStore = apiKey || ''
            await unlockVault(vaultNewPassword)
            if (keyToStore) await saveSecret(keyToStore)
            await migrateFromLocalStorage()
            setVaultExists(true)
            setUnlocked(true)
            setVaultNewPassword('')
            toast.success(t('settings.vault.created'))
        } catch {
            toast.error(t('settings.vault.createError'))
        }
    }

    const handleLock = () => {
        lockVault()
        setUnlocked(false)
        setApiKey('')
        toast.info(t('settings.vault.lock', 'Kilitlendi'))
    }

    const handleClearVault = () => {
        clearVault()
        setUnlocked(false)
        setVaultExists(false)
        setApiKey('')
        setVaultPassword('')
        setVaultNewPassword('')
        toast.success(t('settings.vault.cleared'))
    }

    const handleSaveAI = () => {
        if (vaultExists && !unlocked) {
            toast.error(t('settings.vault.saveLocked'))
            return
        }
        if (unlocked && apiKey) {
            saveSecret(apiKey)
            migrateFromLocalStorage()
        } else if (!vaultExists) {
            sessionStorage.setItem('bs_api_key', apiKey)
        }
        const effectiveModel = resolveEffectiveModel(selectedModel)
        sessionStorage.setItem('bs_model', effectiveModel)
        sessionStorage.setItem('bs_ollama_url', ollamaUrl)
        const modelInfo = AI_MODELS.find((m) => m.id === effectiveModel)
        if (modelInfo) {
            sessionStorage.setItem('bs_provider', modelInfo.provider)
        }
        saveStoredCorsProxy(corsProxy)
        setAutoSummarizeEnabled(autoSummarize)

        onSave?.()
        if (onSave) {
            onClose?.()
        }
        toast.success(t('toast.settingsSaved'))
    }

    const handleTestExtension = async () => {
        setIsTestingExtension(true)
        try {
            await pingExtension(2000)
            toast.success(t('settings.network.extensionDetectedToast'))
        } catch {
            toast.error(t('settings.network.extensionNotFoundToast'))
        } finally {
            setIsTestingExtension(false)
        }
    }

    // Models categorization
    const openaiModels = useMemo(() => AI_MODELS.filter((m) => m.provider === 'openai'), [])
    const geminiModels = useMemo(() => AI_MODELS.filter((m) => m.provider === 'gemini'), [])
    const openrouterModels = useMemo(() => AI_MODELS.filter((m) => m.provider === 'openrouter'), [])
    const ollamaModels = useMemo(() => AI_MODELS.filter((m) => m.provider === 'ollama'), [])
    const anthropicModels = useMemo(() => AI_MODELS.filter((m) => m.provider === 'anthropic'), [])
    const selectedProvider = AI_MODELS.find((m) => m.id === selectedModel)?.provider || 'openai'

    const tabs = [
        {
            id: 'general',
            label: t('settings.tabs.general', 'Genel'),
            icon: SlidersHorizontal,
            subtitle: t('settings.general.desc', 'Görünüm, dil, tarayıcı eklentisi ve sistem tercihleri')
        },
        {
            id: 'folders',
            label: t('settings.tabs.folders', 'Klasörler'),
            icon: Folder,
            color: 'text-blue-500',
            subtitle: t('settings.folders.desc', 'Yer imi klasör hiyerarşisi ve renk yönetimi')
        },
        {
            id: 'tags',
            label: t('settings.tabs.tags', 'Etiketler'),
            icon: Tag,
            color: 'text-emerald-500',
            subtitle: t('settings.tags.desc', 'Etiket koleksiyonu ve otomatik keşfedilen etiketler')
        },
        {
            id: 'ai',
            label: t('settings.tabs.ai', 'Yapay Zeka'),
            icon: Sparkles,
            color: 'text-purple-500',
            subtitle: t('settings.ai.desc', 'Yapay zeka modelleri, şifreli anahtar kasası ve özetleme')
        },
        {
            id: 'backup',
            label: t('settings.tabs.backup', 'Yedekleme & Veri'),
            icon: Database,
            color: 'text-amber-500',
            subtitle: t('settings.backup.desc', 'Veritabanı yedekleme, içe aktarma ve önbellek yönetimi')
        },
        {
            id: 'about',
            label: t('settings.tabs.about', 'Hakkında'),
            icon: Info,
            color: 'text-sky-500',
            subtitle: t('settings.about.desc', 'BookSmart sürüm bilgisi ve yerel depolama güvencesi')
        }
    ]

    const activeTabMeta = tabs.find((t) => t.id === currentTab) || tabs[0]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop click handler */}
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-4xl h-[700px] max-h-[92vh] bg-card border border-border/70 rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 z-10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 id="settings-modal-title" className="text-lg font-bold tracking-tight text-foreground">
                                {t('settings.title')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {activeTabMeta.subtitle}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={t('common.close', 'Kapat')}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Mobile Tab Strip (< md) */}
                <div className="flex md:hidden border-b border-border/50 bg-muted/10 p-2 gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = currentTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleSelectTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40'
                                )}
                            >
                                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary-foreground' : tab.color)} />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Desktop Sidebar Navigation (>= md) */}
                    <div className="hidden md:flex flex-col w-52 md:w-56 shrink-0 border-r border-border/60 bg-muted/10 p-3 space-y-1 overflow-y-auto">
                        <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 py-1.5">
                            {t('settings.title', 'Ayarlar')}
                        </div>
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = currentTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleSelectTab(tab.id)}
                                    className={cn(
                                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer',
                                        isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs font-semibold'
                                            : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : tab.color || 'text-muted-foreground')} />
                                        <span>{tab.label}</span>
                                    </div>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                            )
                        })}

                        <div className="mt-auto pt-4 border-t border-border/40 px-3">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                                <span>BookSmart</span>
                                <span className="font-mono text-[10px]">v{packageJson.version}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7">
                        {/* GENERAL TAB */}
                        {currentTab === 'general' && (
                            <GeneralTab
                                isExtensionConnected={isExtensionConnected}
                                isTestingExtension={isTestingExtension}
                                handleTestExtension={handleTestExtension}
                            />
                        )}

                        {/* FOLDERS TAB */}
                        {currentTab === 'folders' && (
                            <div className="space-y-4">
                                <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs">{t('common.loading', 'Yükleniyor...')}</div>}>
                                    <TaxonomyManager
                                        folders={folders}
                                        setFolders={setFolders}
                                        tags={tags}
                                        setTags={setTags}
                                        discoveredFolders={discoveredFolders}
                                        discoveredTags={discoveredTags}
                                        defaultTab="folders"
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* TAGS TAB */}
                        {currentTab === 'tags' && (
                            <div className="space-y-4">
                                <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs">{t('common.loading', 'Yükleniyor...')}</div>}>
                                    <TaxonomyManager
                                        folders={folders}
                                        setFolders={setFolders}
                                        tags={tags}
                                        setTags={setTags}
                                        discoveredFolders={discoveredFolders}
                                        discoveredTags={discoveredTags}
                                        defaultTab="tags"
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* AI TAB */}
                        {currentTab === 'ai' && (
                            <AITab
                                unlocked={unlocked}
                                vaultExists={vaultExists}
                                vaultPassword={vaultPassword}
                                setVaultPassword={setVaultPassword}
                                vaultNewPassword={vaultNewPassword}
                                setVaultNewPassword={setVaultNewPassword}
                                unlockError={unlockError}
                                setUnlockError={setUnlockError}
                                handleUnlock={handleUnlock}
                                handleLock={handleLock}
                                handleClearVault={handleClearVault}
                                handleCreateVault={handleCreateVault}
                                selectedModel={selectedModel}
                                setSelectedModel={setSelectedModel}
                                selectedProvider={selectedProvider}
                                apiKey={apiKey}
                                setApiKey={setApiKey}
                                ollamaUrl={ollamaUrl}
                                setOllamaUrl={setOllamaUrl}
                                showApiKey={showApiKey}
                                setShowApiKey={setShowApiKey}
                                autoSummarize={autoSummarize}
                                setAutoSummarize={setAutoSummarize}
                                corsProxy={corsProxy}
                                setCorsProxy={setCorsProxy}
                                handleSaveAI={handleSaveAI}
                                onClose={onClose}
                                openaiModels={openaiModels}
                                geminiModels={geminiModels}
                                anthropicModels={anthropicModels}
                                openrouterModels={openrouterModels}
                                ollamaModels={ollamaModels}
                            />
                        )}

                        {/* BACKUP TAB */}
                        {currentTab === 'backup' && (
                            <div className="space-y-4 max-w-2xl">
                                <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs">{t('common.loading', 'Yükleniyor...')}</div>}>
                                    <BackupSettings />
                                </Suspense>
                            </div>
                        )}

                        {/* ABOUT TAB */}
                        {currentTab === 'about' && (
                            <AboutTab
                                bookmarkCount={bookmarkCount}
                                collectionCount={collectionCount}
                                foldersCount={folders.length}
                                tagsCount={tags.length}
                                snapshotCount={snapshotCount}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
