import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import {
    SlidersHorizontal,
    Folder,
    Tag,
    Sparkles,
    Database,
    Info,
    X,
    Sun,
    Moon,
    Laptop,
    Globe,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Lock,
    Unlock,
    KeyRound,
    Command,
    RefreshCw,
    HelpCircle,
    Trash2,
    Eye,
    EyeOff,
    Check
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useAppStore } from '../store/useAppStore'
import { AI_MODELS, DEFAULT_MODEL } from '../services/ai-service'

const TaxonomyManager = lazy(() => import('./TaxonomyManager').then(m => ({ default: m.TaxonomyManager })))
const BackupSettings = lazy(() => import('./BackupSettings').then(m => ({ default: m.BackupSettings })))
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
    const { t, i18n } = useTranslation()
    const {
        theme,
        setTheme,
        openExtensionGuide,
        setIsShortcutsOpen
    } = useAppStore()

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
    const [selectedModel, setSelectedModel] = useState(() => sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model') || DEFAULT_MODEL)
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
        if (storedModel) setSelectedModel(storedModel)
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
            if (storedModel) setSelectedModel(storedModel)
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
        sessionStorage.setItem('bs_model', selectedModel)
        sessionStorage.setItem('bs_ollama_url', ollamaUrl)
        const modelInfo = AI_MODELS.find((m) => m.id === selectedModel)
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

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng)
        localStorage.setItem('i18nextLng', lng)
        toast.success(t('toast.settingsSaved'))
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
                            <div className="space-y-6 max-w-2xl">
                                {/* Appearance / Theme */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Sun className="w-4 h-4 text-amber-500" />
                                            {t('settings.theme.title', 'Görünüm ve Tema')}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t('settings.theme.desc', 'Uygulama arayüzünün renk temasını belirleyin.')}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'light', label: t('settings.theme.light'), icon: Sun, desc: 'Açık renkler' },
                                            { id: 'dark', label: t('settings.theme.dark'), icon: Moon, desc: 'Koyu renkler' },
                                            { id: 'system', label: t('settings.theme.system'), icon: Laptop, desc: 'Sistemle senkron' }
                                        ].map((tOption) => {
                                            const Icon = tOption.icon
                                            const isSelected = theme === tOption.id
                                            return (
                                                <button
                                                    key={tOption.id}
                                                    type="button"
                                                    onClick={() => setTheme(tOption.id)}
                                                    className={cn(
                                                        'flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer relative',
                                                        isSelected
                                                            ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs'
                                                            : 'border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5 mb-2" />
                                                    <span className="text-xs font-semibold">{tOption.label}</span>
                                                    <span className="text-[10px] text-muted-foreground mt-0.5">{tOption.desc}</span>
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                            <Check className="w-2.5 h-2.5" />
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-border/50" />

                                {/* Language Selection */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-sky-500" />
                                            {t('settings.language.label', 'Dil Tercihi')}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t('settings.language.select', 'Kullanmak istediğiniz dili seçin.')}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {[
                                            { code: 'tr', name: t('settings.languages.tr', 'Türkçe'), flag: '🇹🇷' },
                                            { code: 'en', name: t('settings.languages.en', 'English'), flag: '🇬🇧' },
                                            { code: 'de', name: t('settings.languages.de', 'Deutsch'), flag: '🇩🇪' },
                                            { code: 'es', name: t('settings.languages.es', 'Español'), flag: '🇪🇸' },
                                            { code: 'fr', name: t('settings.languages.fr', 'Français'), flag: '🇫🇷' }
                                        ].map((lang) => {
                                            const isSelected = i18n.language?.startsWith(lang.code)
                                            return (
                                                <button
                                                    key={lang.code}
                                                    type="button"
                                                    onClick={() => changeLanguage(lang.code)}
                                                    className={cn(
                                                        'flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                                                        isSelected
                                                            ? 'border-primary bg-primary/5 text-primary font-semibold ring-1 ring-primary/20'
                                                            : 'border-border/60 hover:bg-muted/50 text-foreground'
                                                    )}
                                                >
                                                    <span className="text-base">{lang.flag}</span>
                                                    <span className="text-xs flex-1">{lang.name}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-border/50" />

                                {/* Browser Companion Extension */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-primary" />
                                                {t('settings.network.extensionTitle', 'Companion Tarayıcı Eklentisi')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                CORS kısıtlaması olmadan sunucusuz ölü bağlantı denetimi sağlar.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openExtensionGuide?.()}
                                                className="h-7 text-xs gap-1 cursor-pointer"
                                            >
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                                {t('settings.network.extensionGuideBtn', 'Kılavuz')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isTestingExtension}
                                                onClick={handleTestExtension}
                                                className="h-7 text-xs gap-1 cursor-pointer"
                                            >
                                                <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', isTestingExtension && 'animate-spin')} />
                                                {t('settings.network.extensionRetryBtn', 'Bağlantıyı Yenile')}
                                            </Button>
                                        </div>
                                    </div>

                                    <div
                                        className={cn(
                                            'p-3.5 rounded-xl border flex items-start gap-3 transition-colors',
                                            isExtensionConnected
                                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-muted/30 border-border/60 text-muted-foreground'
                                        )}
                                    >
                                        {isExtensionConnected ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        )}
                                        <div className="space-y-1 text-xs">
                                            <div className="font-semibold text-foreground">
                                                {isExtensionConnected
                                                    ? t('settings.network.extensionConnected', 'Companion Eklentisi Bağlı (CORS\'suz)')
                                                    : t('settings.network.extensionNotDetected', 'Companion Eklentisi Algılanmadı')}
                                            </div>
                                            <p className="leading-relaxed opacity-90">
                                                {isExtensionConnected
                                                    ? t('settings.network.extensionConnectedDesc', 'Bağlantı kontrolleri eklenti üzerinden doğrudan ve %100 doğru HTTP durum kodlarıyla çalışıyor.')
                                                    : t('settings.network.extensionNotDetectedDesc', 'Eklentisiz modda tarayıcı CORS kısıtlamaları nedeniyle ölü bağlantılar güvenilir tespit edilemeyebilir.')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border/50" />

                                {/* Keyboard Shortcuts Card */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold flex items-center gap-2">
                                                <Command className="w-4 h-4 text-violet-500" />
                                                Klavye Kısayolları
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Hızlı klavye komutlarıyla daha verimli gezinin.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsShortcutsOpen(true)}
                                            className="h-7 text-xs cursor-pointer"
                                        >
                                            Tüm Kısayolları Gör
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                                            <span className="text-muted-foreground">Komut Paleti & Arama</span>
                                            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">⌘ / Ctrl + K</kbd>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                                            <span className="text-muted-foreground">Hızlı Önizleme</span>
                                            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">Boşluk (Space)</kbd>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                                            <span className="text-muted-foreground">Arama Kutusuna Odaklan</span>
                                            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">⌘ / Ctrl + F</kbd>
                                        </div>
                                        <div className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between">
                                            <span className="text-muted-foreground">Pencereleri Kapat</span>
                                            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">Escape</kbd>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                            <div className="space-y-5 max-w-2xl">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">
                                        {t('settings.ai.title')}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t('modals.settings.desc')}
                                    </p>
                                </div>

                                {/* Vault Status Bar (if unlocked) */}
                                {unlocked && (
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <Unlock className="w-4 h-4" />
                                            <span>{t('settings.vault.unlockedBadge')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={handleLock} className="h-7 text-xs gap-1 cursor-pointer">
                                                <Lock className="w-3.5 h-3.5" />
                                                {t('settings.vault.lock')}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={handleClearVault} className="h-7 text-xs text-destructive hover:text-destructive gap-1 cursor-pointer">
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {t('settings.vault.clear')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Vault Locked Prompt (if vault exists & locked) */}
                                {vaultExists && !unlocked && (
                                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            {t('settings.vault.title')}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('settings.vault.lockedDesc')}
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                id="vaultPassword"
                                                type="password"
                                                value={vaultPassword}
                                                onChange={(e) => {
                                                    setVaultPassword(e.target.value)
                                                    setUnlockError('')
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                                placeholder={t('settings.vault.passwordPlaceholder')}
                                                className="h-9 text-xs"
                                            />
                                            <Button onClick={handleUnlock} size="sm" className="h-9 text-xs px-4 cursor-pointer">
                                                {t('settings.vault.unlock')}
                                            </Button>
                                        </div>
                                        {unlockError && <p className="text-xs text-destructive">{unlockError}</p>}
                                    </div>
                                )}

                                {/* Model Selector */}
                                <div className="space-y-2">
                                    <Label htmlFor="model">{t('settings.ai.model')}</Label>
                                    <div className="relative">
                                        <select
                                            id="model"
                                            className="w-full h-10 px-3 py-2 bg-background border border-border/80 rounded-xl text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                        >
                                            <optgroup label={t('settings.ai.providers.ollama', 'Yerel YZ (Ollama)')}>
                                                {ollamaModels.map((model) => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="OpenAI">
                                                {openaiModels.map((model) => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Google Gemini">
                                                {geminiModels.map((model) => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label={t('settings.ai.providers.anthropic', 'Anthropic (Claude)')}>
                                                {anthropicModels.map((model) => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="OpenRouter (Claude, Llama, etc.)">
                                                {openrouterModels.map((model) => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* API Key / Ollama URL */}
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">
                                        {selectedProvider === 'ollama' ? (t('settings.ai.ollamaUrl') || 'Ollama Base URL') : t('settings.ai.apiKey')}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="apiKey"
                                            type={selectedProvider === 'ollama' ? 'text' : showApiKey ? 'text' : 'password'}
                                            value={selectedProvider === 'ollama' ? ollamaUrl : apiKey}
                                            onChange={(e) => (selectedProvider === 'ollama' ? setOllamaUrl(e.target.value) : setApiKey(e.target.value))}
                                            placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'sk-... or AIza... or sk-or-...'}
                                            className="pr-10 rounded-xl"
                                        />
                                        {selectedProvider !== 'ollama' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                                aria-label={showApiKey ? 'Gizle' : 'Göster'}
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {selectedProvider === 'openai' && (t('settings.ai.reqOpenAI') || 'Requires OpenAI API Key')}
                                        {selectedProvider === 'gemini' && (t('settings.ai.reqGemini') || 'Requires Google Gemini API Key')}
                                        {selectedProvider === 'openrouter' && (t('settings.ai.reqOpenRouter') || 'Requires OpenRouter API Key')}
                                        {selectedProvider === 'anthropic' && (t('settings.ai.reqAnthropic') || 'Requires Anthropic API Key')}
                                        {selectedProvider === 'ollama' && (t('settings.ai.reqOllama') || 'Leave empty for default localhost:11434')}
                                    </p>
                                </div>

                                {/* Auto-Summarize Toggle */}
                                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5">
                                    <input
                                        type="checkbox"
                                        id="autoSummarize"
                                        checked={autoSummarize}
                                        onChange={(e) => setAutoSummarize(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                    <label htmlFor="autoSummarize" className="space-y-0.5 cursor-pointer select-none">
                                        <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                            {t('settings.ai.autoSummarize', 'Yer İmi Detayında Otomatik Özetleme')}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-normal">
                                            {t('settings.ai.autoSummarizeDesc', 'Yer imi önizlemesini veya detayını açtığınızda tek cümlelik "Bu sayfa ne anlatıyor?" özeti otomatik oluşturulur.')}
                                        </p>
                                    </label>
                                </div>

                                {/* Create Vault Section (if no vault exists yet) */}
                                {!vaultExists && (
                                    <div className="space-y-2 border border-border/70 rounded-xl p-3.5 bg-muted/20">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                            <KeyRound className="w-4 h-4 text-primary" />
                                            {t('settings.vault.setupTitle', 'API Anahtarı Kasası Oluştur (İsteğe Bağlı)')}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            {t('settings.vault.setupDesc', 'API anahtarınızı AES-GCM ile şifreleyin. Anahtarınız asla düz metin olarak saklanmaz.')}
                                        </p>
                                        <div className="flex gap-2 pt-1">
                                            <Input
                                                type="password"
                                                value={vaultNewPassword}
                                                onChange={(e) => setVaultNewPassword(e.target.value)}
                                                placeholder={t('settings.vault.newPasswordPlaceholder', 'Kasa şifresi belirleyin')}
                                                className="h-9 text-xs rounded-lg"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCreateVault}
                                                className="h-9 text-xs px-3 shrink-0 cursor-pointer"
                                            >
                                                {t('settings.vault.createButton', 'Oluştur ve Şifrele')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* CORS Proxy Input */}
                                <div className="space-y-1.5 border-t border-border/50 pt-3">
                                    <Label htmlFor="corsProxy" className="text-xs text-muted-foreground">
                                        {t('settings.network.corsProxy', 'CORS Proxy Adresi')}
                                    </Label>
                                    <Input
                                        id="corsProxy"
                                        type="text"
                                        value={corsProxy}
                                        onChange={(e) => setCorsProxy(e.target.value)}
                                        placeholder="https://api.allorigins.win/get?url="
                                        className="h-9 text-xs rounded-xl"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {t('settings.network.corsProxyDesc')}
                                    </p>
                                </div>

                                {/* Save & Cancel Actions */}
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                    <Button variant="outline" onClick={onClose} className="cursor-pointer">
                                        {t('modals.settings.cancel')}
                                    </Button>
                                    <Button onClick={handleSaveAI} className="cursor-pointer">
                                        {t('modals.settings.saveContinue')}
                                    </Button>
                                </div>
                            </div>
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
                            <div className="space-y-6 max-w-2xl">
                                {/* Hero Card */}
                                <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-lg shadow-sm">
                                                B
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-foreground">BookSmart</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('settings.about.desc', 'Gizlilik odaklı, yerel ve modern yer imi yöneticisi')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                            v{packageJson.version}
                                        </span>
                                    </div>
                                </div>

                                {/* Privacy Guarantee */}
                                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>{t('settings.about.privacyTitle', '100% Yerel & Gizlilik Odaklı')}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {t('settings.about.privacyDesc', 'Tüm yer imleriniz, klasörleriniz, etiketleriniz ve şifrelenmiş API anahtarlarınız yalnızca bu tarayıcının IndexedDB deposunda saklanır. Verileriniz asla harici sunuculara veya buluta aktarılmaz.')}
                                    </p>
                                </div>

                                {/* Live Stats */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t('settings.about.stats', 'Yerel Veritabanı İstatistikleri')}
                                    </Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                                            <div className="text-lg font-bold text-foreground">{bookmarkCount}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('settings.about.totalBookmarks', 'Yer İmi')}</div>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                                            <div className="text-lg font-bold text-foreground">{collectionCount}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('settings.about.totalCollections', 'Koleksiyon')}</div>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                                            <div className="text-lg font-bold text-foreground">{folders.length}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('settings.about.totalFolders', 'Klasör')}</div>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                                            <div className="text-lg font-bold text-foreground">{tags.length}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('settings.about.totalTags', 'Etiket')}</div>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-center">
                                            <div className="text-lg font-bold text-foreground">{snapshotCount}</div>
                                            <div className="text-[11px] text-muted-foreground">{t('settings.about.totalSnapshots', 'Çevrimdışı Arşiv')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* External Links */}
                                <div className="border-t border-border/50 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <a
                                        href="https://github.com/GhostKozak/booksmart"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>{t('settings.about.github', 'GitHub Deposu')}</span>
                                    </a>
                                    <span>{t('settings.about.license', 'Açık Kaynak MIT Lisansı')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
