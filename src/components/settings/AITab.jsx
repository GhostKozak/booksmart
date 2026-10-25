import { useState, useEffect, useCallback } from 'react'
import {
    Sparkles,
    Lock,
    Unlock,
    KeyRound,
    Trash2,
    Eye,
    EyeOff,
    ShieldCheck,
    Cpu,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Info
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { checkOllamaHealth, fetchOllamaModels } from '../../services/ai/providers/ollama-provider'
import { getBrowserAICapability } from '../../services/ai/providers/browser-ai-provider'

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
    openaiModels = [],
    geminiModels = [],
    anthropicModels = [],
    openrouterModels = [],
    ollamaModels = [],
    browserModels = []
}) {
    const { t } = useTranslation()

    // Local AI states
    const [ollamaStatus, setOllamaStatus] = useState({ checking: false, success: null, message: '' })
    const [dynamicOllamaModels, setDynamicOllamaModels] = useState([])
    const [browserAICapability, setBrowserAICapability] = useState({ checked: false, supported: false, status: '' })

    // Check browser AI capability on mount or when browser provider selected
    useEffect(() => {
        let isMounted = true
        getBrowserAICapability().then((res) => {
            if (isMounted) {
                setBrowserAICapability({
                    checked: true,
                    supported: !!res.supported,
                    status: res.status || 'unavailable',
                    message: res.message || ''
                })
            }
        })
        return () => { isMounted = false }
    }, [])

    const handleTestOllama = useCallback(async () => {
        setOllamaStatus({ checking: true, success: null, message: 'Ollama sunucusuna bağlanılıyor...' })
        try {
            const health = await checkOllamaHealth(ollamaUrl)
            if (!health.ok) {
                setOllamaStatus({
                    checking: false,
                    success: false,
                    message: health.error || 'Ollama sunucusuna ulaşılamadı. `ollama serve` komutunun çalıştığından emin olun.'
                })
                return
            }

            const models = await fetchOllamaModels(ollamaUrl)
            if (models.length > 0) {
                setDynamicOllamaModels(models)
                setOllamaStatus({
                    checking: false,
                    success: true,
                    message: `Bağlantı başarılı! ${models.length} adet yerel model bulundu (v${health.version || 'aktif'}).`
                })
            } else {
                setOllamaStatus({
                    checking: false,
                    success: true,
                    message: `Bağlandı (v${health.version || 'aktif'}), ancak henüz model indirilmemiş. Örneğin 'ollama run llama3.2' çalıştırabilirsiniz.`
                })
            }
        } catch (err) {
            setOllamaStatus({
                checking: false,
                success: false,
                message: err.message || 'Bağlantı hatası'
            })
        }
    }, [ollamaUrl])

    // Merged Ollama models (pre-configured + dynamically fetched)
    const availableOllamaModels = dynamicOllamaModels.length > 0 ? dynamicOllamaModels : ollamaModels

    const isLocalProvider = selectedProvider === 'ollama' || selectedProvider === 'browser'

    return (
        <div className="space-y-5 max-w-2xl">
            <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    {t('settings.ai.title', 'Yapay Zeka & Gizlilik')}
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Yerel & Bulut Destekli
                    </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('modals.settings.desc', 'Yapay zeka modellerini yapılandırın. İster gizlilik odaklı yerel modelleri (Ollama / Chrome Gemini Nano), ister bulut modellerini kullanın.')}
                </p>
            </div>

            {/* Privacy Badge if Local AI is active */}
            {isLocalProvider && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            %100 Gizli & Yerel Mod (API Anahtarı Gerekmez)
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {selectedProvider === 'browser'
                                ? 'Tarayıcı içi model (Chrome Gemini Nano) tamamen cihazınızda yerel çalışır. Hiçbir veri veya yer imi internete iletilmez, tamamen ücretsizdir.'
                                : 'Ollama modeli bilgisayarınızdaki yerel sunucunuzda çalışır. Verileriniz üçüncü taraf bulut sağlayıcılarına gönderilmez.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Vault Status Bar (if unlocked and not strictly using local) */}
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
            {vaultExists && !unlocked && !isLocalProvider && (
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
                <Label htmlFor="model">{t('settings.ai.model', 'Yapay Zeka Modeli')}</Label>
                <div className="relative">
                    <select
                        id="model"
                        className="w-full h-10 px-3 py-2 bg-background border border-border/80 rounded-xl text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                    >
                        <optgroup label="🔒 Tarayıcı İçi Yerel YZ (Çevrimdışı & Ücretsiz)">
                            {browserModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.ollama', '🔒 Yerel YZ (Ollama - Çevrimdışı)')}>
                            {availableOllamaModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Google Gemini">
                            {geminiModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="OpenAI">
                            {openaiModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label={t('settings.ai.providers.anthropic', 'Anthropic (Claude)')}>
                            {anthropicModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="OpenRouter (Claude, Llama, DeepSeek)">
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

            {/* Provider Configuration Section */}
            {selectedProvider === 'browser' ? (
                /* Chrome Built-in Gemini Nano Section */
                <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/20">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Cpu className="w-4 h-4 text-primary" />
                        <span>Chrome Yerel YZ (Prompt API / Gemini Nano)</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        {browserAICapability.supported ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tarayıcınızda Kullanıma Hazır
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                                <Info className="w-3.5 h-3.5" />
                                Tarayıcıda Doğrudan Etkin Değil
                            </span>
                        )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Bu özellik Google Chrome'un yerel Gemini Nano modelini kullanır. API anahtarı gerekmez.
                        Henüz etkinleşmediyse Chrome adres satırına <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">chrome://flags/#prompt-api-for-gemini-nano</code> yazarak &quot;Enabled&quot; durumuna getirebilirsiniz.
                    </p>
                </div>
            ) : selectedProvider === 'ollama' ? (
                /* Ollama Local URL and Model Discovery */
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="ollamaUrl">{t('settings.ai.ollamaUrl', 'Ollama Sunucu Adresi (Localhost)')}</Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleTestOllama}
                            disabled={ollamaStatus.checking}
                            className="h-7 text-xs gap-1.5 text-primary hover:text-primary cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${ollamaStatus.checking ? 'animate-spin' : ''}`} />
                            Bağlantıyı Test Et & Modelleri Getir
                        </Button>
                    </div>

                    <Input
                        id="ollamaUrl"
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="rounded-xl font-mono text-xs"
                    />

                    {ollamaStatus.message && (
                        <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                            ollamaStatus.success ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}>
                            {ollamaStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                            <span>{ollamaStatus.message}</span>
                        </div>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                        {t('settings.ai.reqOllama', 'Varsayılan olarak http://localhost:11434 kullanılır. Bilgisayarınızda Ollama açık olmalıdır.')}
                    </p>
                </div>
            ) : (
                /* Cloud Providers API Key Input */
                <div className="space-y-2">
                    <Label htmlFor="apiKey">{t('settings.ai.apiKey', 'API Anahtarı')}</Label>
                    <div className="relative">
                        <Input
                            id="apiKey"
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-... or AIza... or sk-or-..."
                            className="pr-10 rounded-xl"
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={showApiKey ? 'Gizle' : 'Göster'}
                        >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        {selectedProvider === 'openai' && (t('settings.ai.reqOpenAI') || 'Requires OpenAI API Key')}
                        {selectedProvider === 'gemini' && (t('settings.ai.reqGemini') || 'Requires Google Gemini API Key')}
                        {selectedProvider === 'openrouter' && (t('settings.ai.reqOpenRouter') || 'Requires OpenRouter API Key')}
                        {selectedProvider === 'anthropic' && (t('settings.ai.reqAnthropic') || 'Requires Anthropic API Key')}
                    </p>
                </div>
            )}

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

            {/* Create Vault Section (if no vault exists yet and cloud model is used) */}
            {!vaultExists && !isLocalProvider && (
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
                    {t('settings.network.corsProxyDesc', 'Harici web sitelerinin içeriğini özetlerken CORS engelini aşmak için proxy adresi.')}
                </p>
            </div>

            {/* Save & Cancel Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" onClick={onClose} className="cursor-pointer">
                    {t('modals.settings.cancel', 'İptal')}
                </Button>
                <Button onClick={handleSaveAI} className="cursor-pointer">
                    {t('modals.settings.saveContinue', 'Kaydet ve Kapat')}
                </Button>
            </div>
        </div>
    )
}
