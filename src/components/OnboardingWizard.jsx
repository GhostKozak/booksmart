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
        <div className="relative flex flex-col justify-center items-center p-2 sm:p-4 h-full overflow-hidden">
            {/* Background gradient blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="-top-1/4 -left-1/4 absolute bg-primary/5 blur-3xl rounded-full w-1/2 h-1/2 animate-pulse" />
                <div className="-right-1/4 -bottom-1/4 absolute bg-primary/5 blur-3xl rounded-full w-1/2 h-1/2 animate-pulse [animation-delay:1s]" />
            </div>

            {/* Card */}
            <div className="z-10 relative w-full max-w-xl">
                <div className="bg-card/80 shadow-2xl shadow-black/5 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
                    {/* Step content */}
                    <div
                        className={cn(
                            "flex flex-col justify-center items-center p-4 sm:p-8 min-h-96 text-center transition-all duration-300 ease-out",
                            direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"
                        )}
                        key={currentStep}
                    >
                        {steps[currentStep]}
                    </div>

                    {/* Footer: progress dots + navigation */}
                    <div className="flex justify-between items-center px-6 sm:px-10 pb-6 sm:pb-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            disabled={currentStep === 0}
                            className={cn("gap-1 text-muted-foreground", currentStep === 0 && "invisible")}
                        >
                            <ChevronLeft className="w-4 h-4" />
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
                                        "rounded-full w-2 h-2 transition-all duration-300",
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
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <div className="w-20" /> // spacer to balance layout
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
            <div className="bg-linear-to-br from-primary/10 to-primary/5 mb-6 p-5 rounded-2xl ring-1 ring-primary/10">
                <Logo className="w-16 sm:w-20 h-16 sm:h-20" />
            </div>
            <h2 className="mb-3 font-bold text-2xl sm:text-3xl tracking-tight">
                {t('onboarding.welcome.title')}
            </h2>
            <p className="max-w-md text-muted-foreground text-sm sm:text-base leading-relaxed">
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
            <div className="bg-linear-to-br from-blue-500/10 to-cyan-500/5 mb-6 p-5 rounded-2xl ring-1 ring-blue-500/10">
                <Upload className="w-12 sm:w-14 h-12 sm:h-14 text-blue-500" />
            </div>
            <h2 className="mb-3 font-bold text-xl sm:text-2xl tracking-tight">
                {t('onboarding.import.title')}
            </h2>
            <p className="mb-5 max-w-md text-muted-foreground text-sm">
                {t('onboarding.import.desc')}
            </p>
            <div className="gap-2 grid grid-cols-2 w-full max-w-xs">
                {formats.map(f => (
                    <div key={f.ext} className="bg-secondary/50 p-2.5 rounded-lg text-center">
                        <span className="font-bold text-primary text-xs">{f.ext}</span>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{f.desc}</p>
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
            <div className="bg-linear-to-br from-purple-500/10 to-pink-500/5 mb-6 p-5 rounded-2xl ring-1 ring-purple-500/10">
                <Sparkles className="w-12 sm:w-14 h-12 sm:h-14 text-purple-500" />
            </div>
            <h2 className="mb-3 font-bold text-xl sm:text-2xl tracking-tight">
                {t('onboarding.organize.title')}
            </h2>
            <p className="mb-5 max-w-md text-muted-foreground text-sm">
                {t('onboarding.organize.desc')}
            </p>
            <div className="gap-2.5 grid grid-cols-3 w-full max-w-sm">
                {features.map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 bg-secondary/50 hover:bg-secondary/80 p-3 rounded-lg transition-colors">
                        <Icon className={cn("w-5 h-5", color)} />
                        <span className="font-medium text-[11px] leading-tight">{label}</span>
                    </div>
                ))}
            </div>
        </>
    )
}

function GetStartedStep({ t, onUploadClick, onLoadDemo, getInputProps }) {
    return (
        <>
            <div className="bg-linear-to-br from-green-500/10 to-emerald-500/5 mb-6 p-5 rounded-2xl ring-1 ring-green-500/10">
                <ArrowRight className="w-12 sm:w-14 h-12 sm:h-14 text-green-500" />
            </div>
            <h2 className="mb-3 font-bold text-xl sm:text-2xl tracking-tight">
                {t('onboarding.getStarted.title')}
            </h2>
            <p className="mb-6 max-w-md text-muted-foreground text-sm">
                {t('onboarding.getStarted.desc')}
            </p>
            <div className="flex sm:flex-row flex-col gap-3 w-full max-w-sm">
                <label className="flex-1 cursor-pointer">
                    <input {...getInputProps()} />
                    <Button
                        variant="default"
                        className="gap-2 w-full h-11 font-semibold"
                        onClick={onUploadClick}
                    >
                        <Upload className="w-4 h-4" />
                        {t('onboarding.getStarted.upload')}
                    </Button>
                </label>
                <Button
                    variant="outline"
                    className="flex-1 gap-2 border-dashed h-11 font-semibold"
                    onClick={onLoadDemo}
                >
                    <Sparkles className="w-4 h-4" />
                    {t('onboarding.getStarted.demo')}
                </Button>
            </div>
        </>
    )
}
