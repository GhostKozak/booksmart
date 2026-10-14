import { describe, it, expect, vi } from 'vitest';
import { createQrMatrix, generateQrPath, drawQrToCanvas } from '../qrcode';

describe('qrcode.js pure JavaScript QR generator', () => {
    it('creates a valid 2D boolean matrix for standard URLs', () => {
        const url = 'https://github.com/booksmart';
        const { matrix, size } = createQrMatrix(url, 'M');

        expect(size).toBeGreaterThan(20);
        expect(matrix.length).toBe(size);
        expect(matrix[0].length).toBe(size);
        // Finders at top-left should be dark modules
        expect(matrix[0][0]).toBe(true);
        expect(matrix[0][1]).toBe(true);
    });

    it('generates crisp SVG path string with appropriate viewBox size', () => {
        const url = 'https://example.com/test-article';
        const { path, viewBoxSize, size } = generateQrPath(url, { margin: 2, errorCorrection: 'M' });

        expect(viewBoxSize).toBe(size + 4);
        expect(typeof path).toBe('string');
        expect(path.startsWith('M')).toBe(true);
        expect(path).toContain('h1v1h-1z');
    });

    it('handles various error correction levels (L, M, Q, H)', () => {
        const text = 'https://news.ycombinator.com';
        ['L', 'M', 'Q', 'H'].forEach((ec) => {
            const { matrix } = createQrMatrix(text, ec);
            expect(Array.isArray(matrix)).toBe(true);
            expect(matrix.length).toBeGreaterThan(0);
        });
    });

    it('draws QR code onto a canvas context', () => {
        const fillRect = vi.fn();
        const fakeCtx = {
            fillStyle: '',
            fillRect
        };
        const fakeCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => fakeCtx)
        };

        drawQrToCanvas(fakeCanvas, 'https://kotaku.com', { size: 300, margin: 2 });

        expect(fakeCanvas.getContext).toHaveBeenCalledWith('2d');
        expect(fakeCanvas.width).toBeGreaterThan(0);
        expect(fakeCanvas.height).toBeGreaterThan(0);
        expect(fillRect).toHaveBeenCalled();
    });

    it('handles null canvas gracefully', () => {
        expect(() => drawQrToCanvas(null, 'https://kotaku.com')).not.toThrow();
    });
});
