import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExportModal } from '../ExportModal'

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options) => {
            if (options && typeof options === 'object' && options.defaultValue) {
                return options.defaultValue
            }
            if (typeof options === 'string') return options
            return key
        }
    }),
    Trans: ({ children }) => children
}))

describe('ExportModal', () => {
    const mockDataToExport = [
        { id: '1', title: 'React Documentation', url: 'https://react.dev', newFolder: 'Dev', tags: ['react'] },
        { id: '2', title: 'Vite Guide', url: 'https://vitejs.dev', newFolder: 'Dev > Tools', tags: ['build'] }
    ]

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        exportFormat: 'html',
        setExportFormat: vi.fn(),
        exportOnlySelected: false,
        selectedCount: 0,
        selectedFolder: 'all',
        setSelectedFolder: vi.fn(),
        availableFolders: ['Dev', 'Reading', 'Work'],
        dataToExport: mockDataToExport,
        exportPayload: {
            content: '<html>...</html>',
            type: 'text/html',
            extension: 'html',
            bytes: 1240,
            estimatedSize: '1.2 KB'
        },
        onExport: vi.fn()
    }

    it('renders format options and preview panel', () => {
        render(<ExportModal {...defaultProps} />)

        // Modal title
        expect(screen.getByText('modals.export.title')).toBeInTheDocument()

        // Preview stats
        expect(screen.getByText('~1.2 KB')).toBeInTheDocument()
        expect(screen.getByText('React Documentation')).toBeInTheDocument()
        expect(screen.getByText('Vite Guide')).toBeInTheDocument()
    })

    it('calls setSelectedFolder when folder is changed', () => {
        render(<ExportModal {...defaultProps} />)

        const select = screen.getByRole('combobox')
        fireEvent.change(select, { target: { value: 'Dev' } })

        expect(defaultProps.setSelectedFolder).toHaveBeenCalledWith('Dev')
    })

    it('calls setExportFormat when format card is clicked', () => {
        render(<ExportModal {...defaultProps} />)

        const jsonButton = screen.getByText('modals.export.formats.json.label').closest('button')
        fireEvent.click(jsonButton)

        expect(defaultProps.setExportFormat).toHaveBeenCalledWith('json')
    })

    it('calls onExport when download button is clicked', () => {
        render(<ExportModal {...defaultProps} />)

        const downloadButtons = screen.getAllByRole('button')
        const downloadBtn = downloadButtons.find(b => b.textContent.includes('modals.export.download'))
        expect(downloadBtn).toBeInTheDocument()
        fireEvent.click(downloadBtn)

        expect(defaultProps.onExport).toHaveBeenCalledOnce()
    })

    it('disables download button and shows empty state when dataToExport is empty', () => {
        render(<ExportModal {...defaultProps} dataToExport={[]} />)

        expect(screen.getByText('No bookmarks to export in this scope.')).toBeInTheDocument()

        const downloadButtons = screen.getAllByRole('button')
        const downloadBtn = downloadButtons.find(b => b.textContent.includes('modals.export.download'))
        expect(downloadBtn).toBeDisabled()
    })
})
