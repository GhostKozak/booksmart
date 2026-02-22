import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { AI_MODELS, DEFAULT_MODEL } from '../services/ai-service'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function AISettings() {
    const { t } = useTranslation()
    const [apiKey, setApiKey] = useState('')
    const [ollamaUrl, setOllamaUrl] = useState('')
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const storedKey = localStorage.getItem('bs_api_key')
        const storedOllamaUrl = localStorage.getItem('bs_ollama_url')
        const storedModel = localStorage.getItem('bs_model')
        if (storedKey) setApiKey(storedKey)
        if (storedOllamaUrl) setOllamaUrl(storedOllamaUrl)
        if (storedModel) setSelectedModel(storedModel)
    }, [])

    const handleSave = () => {
        localStorage.setItem('bs_api_key', apiKey)
        localStorage.setItem('bs_ollama_url', ollamaUrl)
        localStorage.setItem('bs_model', selectedModel)

        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (modelInfo) {
            localStorage.setItem('bs_provider', modelInfo.provider)
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        toast.success(t('toast.settingsSaved'))
    }

    const openaiModels = AI_MODELS.filter(m => m.provider === 'openai')
    const geminiModels = AI_MODELS.filter(m => m.provider === 'gemini')
    const openrouterModels = AI_MODELS.filter(m => m.provider === 'openrouter')
    const ollamaModels = AI_MODELS.filter(m => m.provider === 'ollama')

    const selectedProvider = AI_MODELS.find(m => m.id === selectedModel)?.provider

    return (
        <div className="space-y-4">
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
                    placeholder={selectedProvider === 'ollama' ? "http://localhost:11434" : "sk-... or AIza... or sk-or-..."}
                />
                <p className="text-[10px] text-muted-foreground">
                    {selectedProvider === 'openai' && t('settings.ai.reqOpenAI')}
                    {selectedProvider === 'gemini' && t('settings.ai.reqGemini')}
                    {selectedProvider === 'openrouter' && t('settings.ai.reqOpenRouter')}
                    {selectedProvider === 'ollama' && (t('settings.ai.reqOllama') || 'Leave empty for default localhost:11434')}
                </p>
            </div>

            <Button onClick={handleSave} className="w-full" size="sm">
                {saved ? '✓ ' + t('settings.ai.saved') : t('settings.ai.save')}
            </Button>
        </div>
    )
}
