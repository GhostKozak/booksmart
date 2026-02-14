import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { parseBookmarks, parseJson, parseCsv, parseMarkdown } from '../lib/parser'
import { db } from '../db'

export function useFileUpload() {
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = async (e) => {
                const text = e.target.result
                let parsed = []

                if (file.name.endsWith('.json')) {
                    parsed = parseJson(text)
                } else if (file.name.endsWith('.csv')) {
                    parsed = parseCsv(text)
                } else if (file.name.endsWith('.md')) {
                    parsed = parseMarkdown(text)
                } else {
                    parsed = parseBookmarks(text)
                }

                if (parsed.length > 0) {
                    await db.transaction('rw', db.bookmarks, async () => {
                        await db.bookmarks.clear()
                        await db.bookmarks.bulkAdd(parsed)
                    })
                } else {
                    console.error("No bookmarks found or parse error")
                }
            }
            reader.readAsText(file)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/html': ['.html'],
            'application/json': ['.json'],
            'text/csv': ['.csv'],
            'text/markdown': ['.md']
        }
    })

    return { getRootProps, getInputProps, isDragActive }
}
