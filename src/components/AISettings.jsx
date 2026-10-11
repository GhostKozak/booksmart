import { useState, useEffect } from 'react'
import { ShieldCheck, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { AI_MODELS, DEFAULT_MODEL } from '../services/ai-service'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ExtensionGuideModal } from './modals/ExtensionGuideModal'
import { subscribeExtensionStatus } from '../lib/extension-client'
import {
    unlockVault, lockVault, saveSecret, loadSecret,
    isVaultUnlocked, hasVault, clearVault, migrateFromLocalStorage,
    getStoredCorsProxy, saveStoredCorsProxy
} from '../lib/key-vault'

export function AISettings() {
    const { t } = useTranslation()
    const [apiKey, setApiKey] = useState('')
    const [ollamaUrl, setOllamaUrl] = useState(() => sessionStorage.getItem('bs_ollama_url') || localStorage.getItem('bs_ollama_url') || '')
    const [selectedModel, setSelectedModel] = useState(() => sessionStorage.getItem('bs_model') || localStorage.getItem('bs_model') || DEFAULT_MODEL)
    const [saved, setSaved] = useState(false)
    const [vaultPassword, setVaultPassword] = useState('')
    const [vaultNewPassword, setVaultNewPassword] = useState('')
    const [unlocked, setUnlocked] = useState(isVaultUnlocked())
    const [vaultExists, setVaultExists] = useState(hasVault())
    const [unlockError, setUnlockError] = useState('')
    const [corsProxy, setCorsProxy] = useState(() => getStoredCorsProxy())
    const [isExtensionConnected, setIsExtensionConnected] = useState(false)
    const [isGuideOpen, setIsGuideOpen] = useState(false)

    useEffect(() => {
        const unsubscribe = subscribeExtensionStatus((status) => {
            setIsExtensionConnected(Boolean(status.available))
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (isVaultUnlocked()) {
            loadSecret().then(k => {
                if (k) setApiKey(k)
            })
        }
    }, [])

    const existingKey = !vaultExists && (sessionStorage.getItem('bs_api_key') || localStorage.getItem('bs_api_key'))

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
            const keyToStore = apiKey || existingKey || ''
            await unlockVault(vaultNewPassword)
            if (keyToStore) await saveSecret(keyToStore)
            if (!apiKey && keyToStore) setApiKey(keyToStore)
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
    }

    const handleSave = async () => {
        if (unlocked) {
            const keyToStore = apiKey
            if (keyToStore) await saveSecret(keyToStore)
        } else if (vaultExists) {
            toast.error(t('settings.vault.saveLocked'))
            return
        }
        sessionStorage.setItem('bs_ollama_url', ollamaUrl)
        sessionStorage.setItem('bs_model', selectedModel)
        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (modelInfo) sessionStorage.setItem('bs_provider', modelInfo.provider)
        if (!vaultExists) {
            sessionStorage.setItem('bs_api_key', apiKey)
        }
        saveStoredCorsProxy(corsProxy)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        toast.success(t('toast.settingsSaved'))
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

    const openaiModels = AI_MODELS.filter(m => m.provider === 'openai')
    const geminiModels = AI_MODELS.filter(m => m.provider === 'gemini')
    const openrouterModels = AI_MODELS.filter(m => m.provider === 'openrouter')
    const ollamaModels = AI_MODELS.filter(m => m.provider === 'ollama')
    const anthropicModels = AI_MODELS.filter(m => m.provider === 'anthropic')
    const selectedProvider = AI_MODELS.find(m => m.id === selectedModel)?.provider

    if (vaultExists && !unlocked) {
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('settings.vault.title')}</label>
                    <p className="text-xs text-muted-foreground">{t('settings.vault.lockedDesc')}</p>
                    <Input
                        type="password"
                        value={vaultPassword}
                        onChange={e => { setVaultPassword(e.target.value); setUnlockError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                        placeholder={t('settings.vault.passwordPlaceholder')}
                    />
                    {unlockError && <p className="text-xs text-destructive">{unlockError}</p>}
                </div>
                <Button onClick={handleUnlock} className="w-full" size="sm">
                    {t('settings.vault.unlock')}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {unlocked && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('settings.vault.unlockedBadge')}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleLock}>
                            {t('settings.vault.lock')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClearVault}>
                            {t('settings.vault.clear')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.ai.model')}</label>
                <div className="relative">
                    <select
                        className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                    >
                        <optgroup label={t('settings.ai.providers.ollama')}>
                            {ollamaModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.openai')}>
                            {openaiModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.google')}>
                            {geminiModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.anthropic')}>
                            {anthropicModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.openrouter')}>
                            {openrouterModels.map(model => (
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

            <div className="space-y-2">
                <label className="text-sm font-medium">
                    {selectedProvider === 'ollama' ? t('settings.ai.ollamaUrl') || 'Ollama Base URL' : t('settings.ai.apiKey')}
                </label>
                <Input
                    type={selectedProvider === 'ollama' ? 'text' : 'password'}
                    value={selectedProvider === 'ollama' ? ollamaUrl : apiKey}
                    onChange={(e) => selectedProvider === 'ollama' ? setOllamaUrl(e.target.value) : setApiKey(e.target.value)}
                    placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'sk-... or AIza... or sk-or-...'}
                />
                <p className="text-[10px] text-muted-foreground">
                    {selectedProvider === 'openai' && t('settings.ai.reqOpenAI')}
                    {selectedProvider === 'gemini' && t('settings.ai.reqGemini')}
                    {selectedProvider === 'openrouter' && t('settings.ai.reqOpenRouter')}
                    {selectedProvider === 'anthropic' && t('settings.ai.reqAnthropic')}
                    {selectedProvider === 'ollama' && (t('settings.ai.reqOllama') || 'Leave empty for default localhost:11434')}
                </p>
            </div>

            <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {t('settings.network.extensionTitle', 'Serverless Health Check (Companion Extension)')}
                    </label>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsGuideOpen(true)}
                        className="h-6 px-2 text-xs text-primary hover:text-primary gap-1"
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                        {t('settings.network.extensionGuideBtn', 'Guide')}
                    </Button>
                </div>

                <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    isExtensionConnected
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-muted/40 border-border/60 text-muted-foreground'
                }`}>
                    {isExtensionConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                        <div className="font-semibold text-foreground">
                            {isExtensionConnected
                                ? t('settings.network.extensionConnected', 'Companion Extension Active (CORS-Free)')
                                : t('settings.network.extensionNotDetected', 'Companion Extension Not Detected')}
                        </div>
                        <p className="leading-relaxed">
                            {isExtensionConnected
                                ? t('settings.network.extensionConnectedDesc', 'Link health checks run directly via the extension background script without CORS restrictions and without any external server.')
                                : t('settings.network.extensionNotDetectedDesc', 'Without the extension, browser CORS restrictions make dead link checks unreliable. Load the extension or enter a CORS proxy below.')}
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('settings.network.corsProxy')}</label>
                    <Input
                        type="text"
                        value={corsProxy}
                        onChange={(e) => setCorsProxy(e.target.value)}
                        placeholder="e.g. https://api.allorigins.win/get?url="
                    />
                    <p className="text-[10px] text-muted-foreground">
                        {t('settings.network.corsProxyDesc')}
                    </p>
                </div>
            </div>

            {!vaultExists && (
                <div className="space-y-2 border rounded-md p-3">
                    <label className="text-sm font-medium">{t('settings.vault.setupTitle')}</label>
                    <p className="text-xs text-muted-foreground">{t('settings.vault.setupDesc')}</p>
                    <Input
                        type="password"
                        value={vaultNewPassword}
                        onChange={e => setVaultNewPassword(e.target.value)}
                        placeholder={t('settings.vault.newPasswordPlaceholder')}
                    />
                    {existingKey && (
                        <p className="text-xs text-muted-foreground">
                            {t('settings.vault.willEncrypt')}
                        </p>
                    )}
                    <Button variant="outline" size="sm" onClick={handleCreateVault} className="w-full">
                        {t('settings.vault.createButton')}
                    </Button>
                </div>
            )}

            <Button onClick={handleSave} className="w-full" size="sm">
                {saved ? '✓ ' + t('settings.ai.saved') : t('settings.ai.save')}
            </Button>

            <ExtensionGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                isConnected={isExtensionConnected}
                onStatusChange={setIsExtensionConnected}
            />
        </div>
    )
}
