/*
 * BookSmart - Copyright (C) 2026 BookSmart Contributors
 * Licensed under the GNU GPLv3 or later.
 */
import { Component } from 'react'
import { withTranslation } from 'react-i18next'

class ErrorBoundaryComponent extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        const { t } = this.props;

        if (this.state.hasError) {
            return (
                <div className="h-[100dvh] flex items-center justify-center bg-background text-foreground p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="m15 9-6 6" />
                                <path d="m9 9 6 6" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {t ? t('errorBoundary.title') : ''}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {t ? t('errorBoundary.desc') : ''}
                            </p>
                        </div>
                        {this.state.error && (
                            <details className="text-left bg-muted/50 rounded-lg p-3 text-xs">
                                <summary className="cursor-pointer font-medium text-muted-foreground">
                                    {t ? t('errorBoundary.details') : ''}
                                </summary>
                                <pre className="mt-2 overflow-auto text-red-500/80 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                {t ? t('errorBoundary.tryAgain') : ''}
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                            >
                                {t ? t('errorBoundary.reload') : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent)
