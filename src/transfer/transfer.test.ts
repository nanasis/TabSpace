import { describe, expect, it } from 'vitest'

import { createDefaultDocument } from '../model/document'
import { applyImport } from './applyImport'
import { createBookmarksHtml, createMarkdown, createOneTabText } from './exports'
import { parseImport } from './importers'
import { backupSchema, createBackup } from './tabSpaceBackup'

const NOW = '2026-08-25T12:00:00.000Z'

function ids() {
  let index = 0
  return () => `import-${++index}`
}

describe('provider imports', () => {
  it('parses Toby organization exports and skips unsafe URLs', () => {
    const preview = parseImport('toby', {
      groups: [{ name: 'Work', lists: [{ title: 'Docs', cards: [
        { title: 'TypeScript', url: 'https://typescriptlang.org/' },
        { title: 'Unsafe', url: 'javascript:alert(1)' },
      ] }] }],
    })

    expect(preview.spaces[0]?.groups[0]?.tabs).toHaveLength(1)
    expect(preview.skippedRecords).toBe(1)
  })

  it('parses the documented Tabme backup profile', () => {
    const preview = parseImport('tabme', {
      spaces: [{ name: 'Research', folders: [{ name: 'Sources', bookmarks: [
        { title: 'Example', url: 'https://example.com' },
      ] }] }],
    })

    expect(preview.spaces[0]?.groups[0]).toEqual(
      expect.objectContaining({ name: 'Sources', tabs: [expect.objectContaining({ title: 'Example' })] }),
    )
  })

  it('reports provider mismatches', () => {
    expect(() => parseImport('toby', { spaces: [] })).toThrow(/not a Toby/)
    expect(() => parseImport('tabme', { lists: [] })).toThrow(/not a Tabme/)
  })

  it('applies merge and replace atomically', () => {
    const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const preview = parseImport('toby', {
      lists: [{ title: 'Imported', cards: [{ title: 'Example', url: 'https://example.com' }] }],
    })
    const merged = applyImport(initial, preview, 'merge', { now: () => NOW, createId: ids() })
    const replaced = applyImport(initial, preview, 'replace', { now: () => NOW, createId: ids() })

    expect(merged.spaces).toHaveLength(2)
    expect(replaced.spaces).toHaveLength(1)
    expect(replaced.groups[0]?.name).toBe('Imported')
    expect(replaced.tabs[0]?.url).toBe('https://example.com/')
  })
})

describe('backup and compatible exports', () => {
  it('round trips a canonical backup without runtime IDs or sync secrets', () => {
    const document = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const backup = createBackup(document, NOW)
    const parsed = parseImport('tabspace', backup)

    expect(backupSchema.parse(backup)).toEqual(backup)
    expect(parsed.spaces[0]?.name).toBe('My Space')
    expect(JSON.stringify(backup)).not.toContain('chromeTabId')
    expect(JSON.stringify(backup)).not.toContain('sync')
  })

  it('exports Netscape HTML, OneTab text, and Markdown', () => {
    const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const document = applyImport(initial, parseImport('toby', {
      lists: [{ title: 'Docs', cards: [{ title: 'Example', url: 'https://example.com' }] }],
    }), 'replace', { now: () => NOW, createId: ids() })

    expect(createBookmarksHtml(document).contents).toContain('NETSCAPE-Bookmark-file-1')
    expect(createOneTabText(document).contents).toContain('https://example.com/ | Example')
    expect(createMarkdown(document).contents).toContain('[Example](https://example.com/)')
  })
})
