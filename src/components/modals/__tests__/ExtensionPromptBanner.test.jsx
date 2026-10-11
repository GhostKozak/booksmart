import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExtensionPromptBanner } from '../ExtensionPromptBanner'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultValue) => {
            if (typeof defaultValue === 'string') return defaultValue
            if (defaultValue && typeof defaultValue === 'object' && defaultValue.defaultValue) {
                return defaultValue.defaultValue
            }
            return key
        }
    })
}))

describe('ExtensionPromptBanner', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        localStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('does not render if extension is already connected', () => {
        render(<ExtensionPromptBanner isExtensionConnected={true} onOpenGuide={vi.fn()} />)
        act(() => {
            vi.advanceTimersByTime(2000)
        })
        expect(screen.queryByText(/Supercharge with Companion Extension/i)).not.toBeInTheDocument()
    })

    it('does not render if previously dismissed in localStorage', () => {
        localStorage.setItem('bs_ext_prompt_dismissed', 'true')
        render(<ExtensionPromptBanner isExtensionConnected={false} onOpenGuide={vi.fn()} />)
        act(() => {
            vi.advanceTimersByTime(2000)
        })
        expect(screen.queryByText(/Supercharge with Companion Extension/i)).not.toBeInTheDocument()
    })

    it('appears after delay when disconnected and not dismissed', () => {
        render(<ExtensionPromptBanner isExtensionConnected={false} onOpenGuide={vi.fn()} />)
        expect(screen.queryByText(/Supercharge with Companion Extension/i)).not.toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(700)
        })

        expect(screen.getByText(/Supercharge with Companion Extension/i)).toBeInTheDocument()
        expect(screen.getByText(/Setup Extension/i)).toBeInTheDocument()
        expect(screen.getByText(/Later/i)).toBeInTheDocument()
    })

    it('dismisses banner and sets localStorage when Later is clicked', () => {
        render(<ExtensionPromptBanner isExtensionConnected={false} onOpenGuide={vi.fn()} />)
        act(() => {
            vi.advanceTimersByTime(700)
        })

        const laterBtn = screen.getByText(/Later/i)
        fireEvent.click(laterBtn)

        expect(screen.queryByText(/Supercharge with Companion Extension/i)).not.toBeInTheDocument()
        expect(localStorage.getItem('bs_ext_prompt_dismissed')).toBe('true')
    })

    it('calls onOpenGuide and sets localStorage when Setup Extension is clicked', () => {
        const onOpenGuide = vi.fn()
        render(<ExtensionPromptBanner isExtensionConnected={false} onOpenGuide={onOpenGuide} />)
        act(() => {
            vi.advanceTimersByTime(700)
        })

        const setupBtn = screen.getByText(/Setup Extension/i)
        fireEvent.click(setupBtn)

        expect(onOpenGuide).toHaveBeenCalledTimes(1)
        expect(localStorage.getItem('bs_ext_prompt_dismissed')).toBe('true')
        expect(screen.queryByText(/Supercharge with Companion Extension/i)).not.toBeInTheDocument()
    })
})
