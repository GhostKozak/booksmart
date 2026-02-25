/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Filter, Sparkles, BookOpen, ChevronRight, ChevronLeft, ArrowRight, FolderTree, Tag, Wand2, LayoutGrid } from 'lucide-react'
import { Button } from './ui/button'
import { Logo } from './ui/Logo'
import { cn } from '../lib/utils'

const TOTAL_STEPS = 4

export function OnboardingWizard({ onUploadClick, onLoadDemo, getInputProps }) {
    const { t } = useTranslation()
    const [currentStep, setCurrentStep] = useState(0)
    const [direction, setDirection] = useState(1) // 1=forward, -1=backward

    const goNext = useCallback(() => {
        if (currentStep < TOTAL_STEPS - 1) {
            setDirection(1)
            setCurrentStep(s => s + 1)
        }
    }, [currentStep])

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1)
            setCurrentStep(s => s - 1)
        }
    }, [currentStep])

    const steps = [
        // Step 1: Welcome
        <WelcomeStep key="welcome" t={t} />,
        // Step 2: Import
        <ImportStep key="import" t={t} />,
        // Step 3: Organize
        <OrganizeStep key="organize" t={t} />,
        // Step 4: Get Started
        <GetStartedStep key="start" t={t} onUploadClick={onUploadClick} onLoadDemo={onLoadDemo} getInputProps={getInputProps} />,
    ]

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
            {/* Background gradient blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-xl">
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/5 overflow-hidden">
                    {/* Step content */}
                    <div
                        className={cn(
                            "p-6 sm:p-10 min-h-[380px] flex flex-col items-center justify-center text-center transition-all duration-300 ease-out",
                            direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"
                        )}
                        key={currentStep}
                    >
                        {steps[currentStep]}
                    </div>

                    {/* Footer: progress dots + navigation */}
                    <div className="px-6 sm:px-10 pb-6 sm:pb-8 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            disabled={currentStep === 0}
                            className={cn("gap-1 text-muted-foreground", currentStep === 0 && "invisible")}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('onboarding.back')}
                        </Button>

                        {/* Dots */}
                        <div className="flex gap-2">
                            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setDirection(i > currentStep ? 1 : -1)
                                        setCurrentStep(i)
                                    }}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-all duration-300",
                                        i === currentStep
                                            ? "bg-primary w-6"
                                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                    )}
                                    aria-label={`Step ${i + 1}`}
                                />
                            ))}
                        </div>

                        {currentStep < TOTAL_STEPS - 1 ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={goNext}
                                className="gap-1 text-muted-foreground"
                            >
                                {t('onboarding.next')}
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="w-[72px]" /> // spacer to balance layout
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Step Components ──

function WelcomeStep({ t }) {
    return (
        <>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-2xl mb-6 ring-1 ring-primary/10">
                <Logo className="h-16 w-16 sm:h-20 sm:w-20" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                {t('onboarding.welcome.title')}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed">
                {t('onboarding.welcome.desc')}
            </p>
        </>
    )
}

function ImportStep({ t }) {
    const formats = [
        { ext: 'HTML', desc: t('onboarding.import.html') },
        { ext: 'JSON', desc: t('onboarding.import.json') },
        { ext: 'CSV', desc: t('onboarding.import.csv') },
        { ext: 'MD', desc: t('onboarding.import.md') },
    ]

    return (
        <>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5 rounded-2xl mb-6 ring-1 ring-blue-500/10">
                <Upload className="h-12 w-12 sm:h-14 sm:w-14 text-blue-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                {t('onboarding.import.title')}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mb-5">
                {t('onboarding.import.desc')}
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {formats.map(f => (
                    <div key={f.ext} className="bg-secondary/50 rounded-lg p-2.5 text-center">
                        <span className="text-xs font-bold text-primary">{f.ext}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                ))}
            </div>
        </>
    )
}

function OrganizeStep({ t }) {
    const features = [
        { icon: FolderTree, label: t('onboarding.organize.folders'), color: 'text-amber-500' },
        { icon: Tag, label: t('onboarding.organize.tags'), color: 'text-green-500' },
        { icon: Filter, label: t('onboarding.organize.filters'), color: 'text-blue-500' },
        { icon: Wand2, label: t('onboarding.organize.ai'), color: 'text-purple-500' },
        { icon: LayoutGrid, label: t('onboarding.organize.collections'), color: 'text-rose-500' },
        { icon: BookOpen, label: t('onboarding.organize.rules'), color: 'text-cyan-500' },
    ]

    return (
        <>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 p-5 rounded-2xl mb-6 ring-1 ring-purple-500/10">
                <Sparkles className="h-12 w-12 sm:h-14 sm:w-14 text-purple-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                {t('onboarding.organize.title')}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mb-5">
                {t('onboarding.organize.desc')}
            </p>
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm">
                {features.map(({ icon: Icon, label, color }) => (
                    <div key={label} className="bg-secondary/50 rounded-lg p-3 flex flex-col items-center gap-1.5 hover:bg-secondary/80 transition-colors">
                        <Icon className={cn("h-5 w-5", color)} />
                        <span className="text-[11px] font-medium leading-tight">{label}</span>
                    </div>
                ))}
            </div>
        </>
    )
}

function GetStartedStep({ t, onUploadClick, onLoadDemo, getInputProps }) {
    return (
        <>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-5 rounded-2xl mb-6 ring-1 ring-green-500/10">
                <ArrowRight className="h-12 w-12 sm:h-14 sm:w-14 text-green-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                {t('onboarding.getStarted.title')}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
                {t('onboarding.getStarted.desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <label className="flex-1 cursor-pointer">
                    <input {...getInputProps()} />
                    <Button
                        variant="default"
                        className="w-full gap-2 h-11 font-semibold"
                        onClick={onUploadClick}
                    >
                        <Upload className="h-4 w-4" />
                        {t('onboarding.getStarted.upload')}
                    </Button>
                </label>
                <Button
                    variant="outline"
                    className="flex-1 gap-2 h-11 font-semibold border-dashed"
                    onClick={onLoadDemo}
                >
                    <Sparkles className="h-4 w-4" />
                    {t('onboarding.getStarted.demo')}
                </Button>
            </div>
        </>
    )
}
