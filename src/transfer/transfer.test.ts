import { describe, expect, it } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from '../model/document'
import { updateTab } from '../model/tabOperations'
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

  it('parses Tabme folder items and nested groupItems', () => {
    const preview = parseImport('tabme', {
      isTabme: true,
      spaces: [{ title: 'Research', folders: [{ title: 'Sources', items: [
        { title: 'Example', url: 'https://example.com' },
        { title: 'Nested', groupItems: [{ title: 'MDN', url: 'https://developer.mozilla.org/' }] },
      ] }] }],
    })

    expect(preview.spaces[0]?.groups[0]).toEqual(
      expect.objectContaining({
        name: 'Sources',
        tabs: [
          expect.objectContaining({
            title: 'Example',
            faviconUrl: 'https://example.com/favicon.ico',
          }),
          expect.objectContaining({
            title: 'MDN',
            faviconUrl: 'https://developer.mozilla.org/favicon.ico',
          }),
        ],
      }),
    )
  })

  it('preserves open tabs and connects matching imported URLs during Replace', () => {
    const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const withOpenTabs = tabSpaceDocumentSchema.parse({
      ...initial,
      tabs: [
        {
          id: 'open-match', chromeTabId: 10, windowId: 1, spaceId: 'space-1', url: 'https://example.com/',
          title: 'Live Example', pinned: true, active: true, order: 0, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
        {
          id: 'open-unmatched', chromeTabId: 11, windowId: 1, spaceId: 'space-1', url: 'https://open.example/',
          title: 'Still open', pinned: false, active: false, order: 1, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
      ],
    })
    const preview = parseImport('tabme', {
      spaces: [{ title: 'Imported', folders: [{ title: 'Sources', items: [
        { title: 'Saved Example', url: 'https://example.com' },
      ] }] }],
    })

    const replaced = applyImport(withOpenTabs, preview, 'replace', {
      now: () => NOW,
      createId: ids(),
    })

    expect(replaced.tabs).toHaveLength(2)
    expect(replaced.tabs.find(({ chromeTabId }) => chromeTabId === 10)).toEqual(
      expect.objectContaining({
        groupId: replaced.groups[0]?.id,
        title: 'Live Example',
        pinned: true,
        windowId: 1,
      }),
    )
    expect(replaced.tabs.find(({ chromeTabId }) => chromeTabId === 11)).toEqual(
      expect.objectContaining({ groupId: undefined, spaceId: replaced.spaces[0]?.id }),
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
    expect(replaced.tabs[0]).toEqual(
      expect.objectContaining({ url: 'https://example.com/', collected: true }),
    )
  })
})

describe('backup and compatible exports', () => {
  it('round trips a canonical backup without runtime IDs or sync secrets', () => {
    const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const imported = applyImport(initial, parseImport('toby', {
      lists: [{ title: 'Docs', cards: [{ title: 'Example', url: 'https://example.com' }] }],
    }), 'replace', { now: () => NOW, createId: ids() })
    const edited = updateTab(imported, imported.tabs[0]?.id ?? '', {
      alias: 'Reference',
      avatarImage: 'data:image/png;base64,AA==',
    }, NOW)
    const document = tabSpaceDocumentSchema.parse({
      ...edited,
      tabs: [
        ...edited.tabs,
        {
          ...edited.tabs[0], id: 'sidebar-only', chromeTabId: 99, groupId: undefined,
          url: 'https://not-collected.example', collected: false,
        },
      ],
    })
    const backup = createBackup(document, NOW)
    const parsed = parseImport('tabspace', backup)

    expect(backupSchema.parse(backup)).toEqual(backup)
    expect(parsed.spaces[0]?.name).toBe('Toby Import')
    expect(parsed.spaces[0]?.groups[0]?.tabs[0]).toEqual(
      expect.objectContaining({
        alias: 'Reference',
        avatarImage: 'data:image/png;base64,AA==',
      }),
    )
    expect(JSON.stringify(backup)).not.toContain('not-collected.example')
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
