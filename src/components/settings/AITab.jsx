import {
    Sparkles,
    Lock,
    Unlock,
    KeyRound,
    Trash2,
    Eye,
    EyeOff
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function AITab({
    unlocked,
    vaultExists,
    vaultPassword,
    setVaultPassword,
    vaultNewPassword,
    setVaultNewPassword,
    unlockError,
    setUnlockError,
    handleUnlock,
    handleLock,
    handleClearVault,
    handleCreateVault,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    apiKey,
    setApiKey,
    ollamaUrl,
    setOllamaUrl,
    showApiKey,
    setShowApiKey,
    autoSummarize,
    setAutoSummarize,
    corsProxy,
    setCorsProxy,
    handleSaveAI,
    onClose,
    openaiModels,
    geminiModels,
    anthropicModels,
    openrouterModels,
    ollamaModels
}) {
    const { t } = useTranslation()

    return (
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
    )
}
