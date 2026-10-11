import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AICostModal } from '../AICostModal'

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

describe('AICostModal', () => {
    const mockBookmarks = [
        { id: '1', title: 'React Documentation', url: 'https://react.dev' },
        { id: '2', title: 'Vite Guide', url: 'https://vitejs.dev' },
        { id: '3', title: 'GitHub', url: 'https://github.com' }
    ]

    beforeEach(() => {
        sessionStorage.clear()
        vi.clearAllMocks()
    })

    it('renders modal with default model and estimated metrics', () => {
        render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                operation="magicSort"
                bookmarks={mockBookmarks}
                currentModel="gpt-4o-mini"
            />
        )

        expect(screen.getByText('AI Cost & Token Estimation')).toBeInTheDocument()
        expect(screen.getByText('AI Magic Sort')).toBeInTheDocument()
        expect(screen.getByText(/3 bookmarks/i)).toBeInTheDocument()
        expect(screen.getByText('Estimated Cost')).toBeInTheDocument()
        expect(screen.getByText('Total Tokens')).toBeInTheDocument()
    })

    it('renders titles and details for different operations', () => {
        const { rerender } = render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                operation="fixTitles"
                bookmarks={mockBookmarks}
            />
        )
        expect(screen.getByText('AI Fix Titles')).toBeInTheDocument()

        rerender(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                operation="smartDuplicates"
                bookmarks={mockBookmarks}
            />
        )
        expect(screen.getByText('AI Smart Duplicates')).toBeInTheDocument()
    })

    it('displays local banner when selecting Ollama local model', () => {
        render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                operation="magicSort"
                bookmarks={mockBookmarks}
                currentModel="llama3.2"
            />
        )

        expect(screen.getByText('Runs locally on your device via Ollama. No data is sent to external APIs.')).toBeInTheDocument()
        expect(screen.getByText('$0.00 (Local / Free)')).toBeInTheDocument()
        expect(screen.getByText('0 API fee (Offline)')).toBeInTheDocument()
    })

    it('updates estimations when changing model dropdown', () => {
        render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                operation="magicSort"
                bookmarks={mockBookmarks}
                currentModel="gpt-4o-mini"
            />
        )

        const select = screen.getByLabelText(/AI Model/i)
        fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } })

        expect(select.value).toBe('gemini-2.5-pro')
    })

    it('calls onConfirm with selected model when clicking confirm button', () => {
        const onConfirmMock = vi.fn()
        render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={onConfirmMock}
                operation="magicSort"
                bookmarks={mockBookmarks}
                currentModel="gemini-2.5-flash"
            />
        )

        const confirmBtn = screen.getByRole('button', { name: /Confirm & Run/i })
        fireEvent.click(confirmBtn)

        expect(onConfirmMock).toHaveBeenCalledWith('gemini-2.5-flash')
    })

    it('saves preference to sessionStorage when dontAskAgain is checked', () => {
        const onConfirmMock = vi.fn()
        render(
            <AICostModal
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={onConfirmMock}
                operation="magicSort"
                bookmarks={mockBookmarks}
                currentModel="gpt-4o-mini"
            />
        )

        const checkbox = screen.getByLabelText(/Don't show this estimation again/i)
        expect(checkbox).not.toBeChecked()

        fireEvent.click(checkbox)
        expect(checkbox).toBeChecked()

        const confirmBtn = screen.getByRole('button', { name: /Confirm & Run/i })
        fireEvent.click(confirmBtn)

        expect(sessionStorage.getItem('bs_skip_ai_cost_confirm')).toBe('true')
        expect(onConfirmMock).toHaveBeenCalledWith('gpt-4o-mini')
    })

    it('calls onClose when cancel button is clicked', () => {
        const onCloseMock = vi.fn()
        render(
            <AICostModal
                isOpen={true}
                onClose={onCloseMock}
                onConfirm={vi.fn()}
                operation="magicSort"
                bookmarks={mockBookmarks}
            />
        )

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
        fireEvent.click(cancelBtn)

        expect(onCloseMock).toHaveBeenCalledOnce()
    })
})
