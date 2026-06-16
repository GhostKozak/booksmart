import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { AI_MODELS, DEFAULT_MODEL } from "../services/ai-service"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
    unlockVault, lockVault, saveSecret, loadSecret,
    isVaultUnlocked, hasVault, migrateFromLocalStorage
} from "../lib/key-vault"

export function SettingsModal({ isOpen, onClose, onSave }) {
    const { t } = useTranslation()
    const [apiKey, setApiKey] = useState("")
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
    const [vaultPassword, setVaultPassword] = useState("")
    const [unlocked, setUnlocked] = useState(false)
    const [vaultExists, setVaultExists] = useState(false)
    const [unlockError, setUnlockError] = useState("")

    useEffect(() => {
        if (isOpen) {
            const vaultUnlocked = isVaultUnlocked()
            const vaultPresent = hasVault()
            setUnlocked(vaultUnlocked)
            setVaultExists(vaultPresent)

            if (vaultUnlocked) {
                loadSecret().then(k => {
                    if (k) setApiKey(k)
                })
            }

            if (!vaultPresent) {
                const storedKey = sessionStorage.getItem("bs_api_key") || localStorage.getItem("bs_api_key")
                if (storedKey) setApiKey(storedKey)
            }
            const storedModel = sessionStorage.getItem("bs_model") || localStorage.getItem("bs_model")
            if (storedModel) setSelectedModel(storedModel)
            setVaultPassword("")
            setUnlockError("")
        }
    }, [isOpen])

    const handleUnlock = async () => {
        setUnlockError("")
        try {
            await unlockVault(vaultPassword)
            const key = await loadSecret()
            if (key) setApiKey(key)
            setUnlocked(true)
            setVaultPassword("")
        } catch {
            setUnlockError(t('settings.vault.wrongPassword'))
        }
    }

    const handleSave = () => {
        if (vaultExists && !unlocked) {
            toast.error(t('settings.vault.saveLocked'))
            return
        }
        if (unlocked && apiKey) {
            saveSecret(apiKey)
            migrateFromLocalStorage()
        } else if (!vaultExists) {
            sessionStorage.setItem("bs_api_key", apiKey)
        }
        sessionStorage.setItem("bs_model", selectedModel)
        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (modelInfo) sessionStorage.setItem("bs_provider", modelInfo.provider)
        onSave()
        onClose()
        toast.success(t('toast.settingsSaved'))
    }

    const openaiModels = AI_MODELS.filter(m => m.provider === 'openai')
    const geminiModels = AI_MODELS.filter(m => m.provider === 'gemini')
    const openrouterModels = AI_MODELS.filter(m => m.provider === 'openrouter')

    if (vaultExists && !unlocked) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('settings.vault.title')}</DialogTitle>
                        <DialogDescription>{t('settings.vault.lockedDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="vaultPassword">{t('settings.vault.passwordPlaceholder')}</Label>
                            <Input
                                id="vaultPassword"
                                type="password"
                                value={vaultPassword}
                                onChange={e => { setVaultPassword(e.target.value); setUnlockError('') }}
                                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                                placeholder={t('settings.vault.passwordPlaceholder')}
                            />
                            {unlockError && <p className="text-xs text-destructive">{unlockError}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>{t('modals.settings.cancel')}</Button>
                        <Button onClick={handleUnlock}>{t('settings.vault.unlock')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('settings.ai.title')}</DialogTitle>
                    <DialogDescription>{t('modals.settings.desc')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="model">{t('settings.ai.model')}</Label>
                        <div className="relative">
                            <select
                                id="model"
                                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                            >
                                <optgroup label="OpenAI">
                                    {openaiModels.map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Google Gemini">
                                    {geminiModels.map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="OpenRouter (Claude, Llama, etc.)">
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

                    <div className="grid gap-2">
                        <Label htmlFor="apiKey">{t('settings.ai.apiKey')}</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-... or AIza... or sk-or-..."
                        />
                        <p className="text-[10px] text-muted-foreground">
                            {AI_MODELS.find(m => m.id === selectedModel)?.provider === 'openai' && 'Requires OpenAI API Key'}
                            {AI_MODELS.find(m => m.id === selectedModel)?.provider === 'gemini' && 'Requires Google Gemini API Key'}
                            {AI_MODELS.find(m => m.id === selectedModel)?.provider === 'openrouter' && 'Requires OpenRouter API Key'}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('modals.settings.cancel')}</Button>
                    <Button onClick={handleSave}>{t('modals.settings.saveContinue')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
