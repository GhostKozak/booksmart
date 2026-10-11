import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExtensionGuideModal } from '../ExtensionGuideModal'
import * as extensionClient from '../../../lib/extension-client'

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

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
    }
}))

describe('ExtensionGuideModal', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders modal in disconnected state with instructions', () => {
        render(
            <ExtensionGuideModal
                isOpen={true}
                onClose={vi.fn()}
                isConnected={false}
                onStatusChange={vi.fn()}
            />
        )

        expect(screen.getByText('BookSmart Companion Extension')).toBeInTheDocument()
        expect(screen.getByText('Extension Not Detected')).toBeInTheDocument()
        expect(screen.getByText(/Why use the extension\?/i)).toBeInTheDocument()
        expect(screen.getByText(/chrome:\/\/extensions/i)).toBeInTheDocument()
    })

    it('renders connected state when isConnected is true', () => {
        render(
            <ExtensionGuideModal
                isOpen={true}
                onClose={vi.fn()}
                isConnected={true}
                onStatusChange={vi.fn()}
            />
        )

        expect(screen.getByText('Extension Connected (CORS-Free)')).toBeInTheDocument()
        expect(screen.getByText('Active in background')).toBeInTheDocument()
    })

    it('tests connection when clicking Check button', async () => {
        const pingSpy = vi.spyOn(extensionClient, 'pingExtension').mockResolvedValue({
            available: true,
            version: '1.0.0'
        })
        const onStatusChange = vi.fn()

        render(
            <ExtensionGuideModal
                isOpen={true}
                onClose={vi.fn()}
                isConnected={false}
                onStatusChange={onStatusChange}
            />
        )

        const checkBtn = screen.getByRole('button', { name: /Check/i })
        fireEvent.click(checkBtn)

        await waitFor(() => {
            expect(pingSpy).toHaveBeenCalled()
            expect(onStatusChange).toHaveBeenCalledWith(true)
        })

        pingSpy.mockRestore()
    })

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn()
        render(
            <ExtensionGuideModal
                isOpen={true}
                onClose={onClose}
                isConnected={false}
            />
        )

        const closeButtons = screen.getAllByRole('button', { name: /Close/i })
        fireEvent.click(closeButtons[closeButtons.length - 1])

        expect(onClose).toHaveBeenCalledOnce()
    })
})
