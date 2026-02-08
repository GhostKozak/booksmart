import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { AI_MODELS, DEFAULT_MODEL } from "../services/ai-service"

export function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState("")
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

    useEffect(() => {
        if (isOpen) {
            const storedKey = localStorage.getItem("bs_api_key")
            const storedModel = localStorage.getItem("bs_model")
            if (storedKey) setApiKey(storedKey)
            if (storedModel) setSelectedModel(storedModel)
        }
    }, [isOpen])

    const handleSave = () => {
        localStorage.setItem("bs_api_key", apiKey)
        localStorage.setItem("bs_model", selectedModel)

        // Find provider from model for backwards compatibility if needed, but App.jsx uses model now
        const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
        if (modelInfo) {
            localStorage.setItem("bs_provider", modelInfo.provider)
        }

        onSave()
        onClose()
    }

    // Helper to group models by provider
    const openaiModels = AI_MODELS.filter(m => m.provider === 'openai')
    const geminiModels = AI_MODELS.filter(m => m.provider === 'gemini')
    const openrouterModels = AI_MODELS.filter(m => m.provider === 'openrouter')

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>AI Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI model to enable "Magic Sort". API keys are stored locally.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="model">AI Model</Label>
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
                            {/* Custom arrow for better UI */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key</Label>
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
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save & Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
