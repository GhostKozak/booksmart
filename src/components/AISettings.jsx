import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { AI_MODELS, DEFAULT_MODEL } from '../services/ai-service'
import { useTranslation } from 'react-i18next'

export function AISettings() {
    const { t } = useTranslation()
    const [apiKey, setApiKey] = useState('')
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const storedKey = localStorage.getItem('bs_api_key')
        const storedModel = localStorage.getItem('bs_model')
        if (storedKey) setApiKey(storedKey)
        if (storedModel) setSelectedModel(storedModel)
    }, [])

    const handleSave = () => {
        localStorage.setItem('bs_api_key', apiKey)
        localStorage.setItem('bs_model', selectedModel)

        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (modelInfo) {
            localStorage.setItem('bs_provider', modelInfo.provider)
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const openaiModels = AI_MODELS.filter(m => m.provider === 'openai')
    const geminiModels = AI_MODELS.filter(m => m.provider === 'gemini')
    const openrouterModels = AI_MODELS.filter(m => m.provider === 'openrouter')

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.ai.model', 'AI Model')}</label>
                <div className="relative">
                    <select
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

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('settings.ai.apiKey', 'API Key')}</label>
                <Input
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

            <Button onClick={handleSave} className="w-full" size="sm">
                {saved ? '✓ ' + t('settings.ai.saved', 'Saved!') : t('settings.ai.save', 'Save AI Settings')}
            </Button>
        </div>
    )
}
