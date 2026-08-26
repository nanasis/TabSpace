import { describe, expect, it } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from '../model/document'
import {
  reconcileTabs,
  replaceChromeTabId,
  type BrowserTabSnapshot,
} from './reconcileTabs'

const NOW = '2026-08-25T12:00:00.000Z'
const LATER = '2026-08-25T13:00:00.000Z'

function createDocument() {
  return createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
}

function browserTab(overrides: Partial<BrowserTabSnapshot> = {}): BrowserTabSnapshot {
  return {
    id: 10,
    windowId: 2,
    url: 'https://example.com/',
    title: 'Example',
    pinned: false,
    active: false,
    ...overrides,
  }
}

const options = {
  dashboardUrl: 'chrome-extension://tabspace/index.html',
  now: () => LATER,
  createId: () => 'tab-1',
}

describe('reconcileTabs', () => {
  it('adds discovered tabs to the active space ungrouped', () => {
    const result = reconcileTabs(createDocument(), [browserTab()], options)

    expect(result.changed).toBe(true)
    expect(result.document.tabs).toEqual([
      expect.objectContaining({
        id: 'tab-1',
        chromeTabId: 10,
        windowId: 2,
        spaceId: 'space-1',
        url: 'https://example.com/',
        collected: false,
        order: 0,
      }),
    ])
  })

  it('ignores the TabSpace dashboard', () => {
    const document = createDocument()
    const result = reconcileTabs(
      document,
      [browserTab({ url: 'chrome-extension://tabspace/index.html#open' })],
      options,
    )

    expect(result).toEqual({ document, changed: false })
  })

  it('updates browser-owned metadata while preserving organization', () => {
    const initial = reconcileTabs(createDocument(), [browserTab()], options).document
    const organized = tabSpaceDocumentSchema.parse({
      ...initial,
      tabs: [{ ...initial.tabs[0], alias: 'Reference', avatarEmoji: '📚' }],
    })

    const result = reconcileTabs(
      organized,
      [browserTab({ title: 'Updated title', pinned: true, faviconUrl: 'https://example.com/icon.png' })],
      { ...options, now: () => '2026-08-25T14:00:00.000Z' },
    )

    expect(result.document.tabs[0]).toEqual(
      expect.objectContaining({ alias: 'Reference', avatarEmoji: '📚', title: 'Updated title', pinned: true }),
    )
  })

  it('removes uncollected sidebar-only records when their browser tab closes', () => {
    const opened = reconcileTabs(createDocument(), [browserTab()], options).document

    const closed = reconcileTabs(opened, [], options)

    expect(closed.document.tabs).toEqual([])
  })

  it('keeps closed tabs as bookmarks without changing their group', () => {
    const initial = reconcileTabs(createDocument(), [browserTab()], options).document
    const organized = tabSpaceDocumentSchema.parse({
      ...initial,
      groups: [{
        id: 'group-1', spaceId: 'space-1', name: 'Sources', color: '#8b5cf6',
        order: 0, collapsed: false, createdAt: NOW, updatedAt: NOW,
      }],
      tabs: [{ ...initial.tabs[0], groupId: 'group-1', collected: true }],
    })

    const result = reconcileTabs(organized, [], options)

    expect(result.document.groups).toEqual(organized.groups)
    expect(result.document.tabs).toHaveLength(1)
    expect(result.document.tabs[0]).toEqual(
      expect.objectContaining({
        id: 'tab-1',
        groupId: 'group-1',
        chromeTabId: undefined,
        active: false,
        pinned: false,
      }),
    )
  })

  it('reattaches a reopened URL to its existing grouped bookmark', () => {
    const opened = reconcileTabs(createDocument(), [browserTab()], options).document
    const organized = tabSpaceDocumentSchema.parse({
      ...opened,
      groups: [{
        id: 'group-1', spaceId: 'space-1', name: 'Sources', color: '#8b5cf6',
        order: 0, collapsed: false, createdAt: NOW, updatedAt: NOW,
      }],
      tabs: [{ ...opened.tabs[0], groupId: 'group-1', collected: true }],
    })
    const closed = reconcileTabs(organized, [], options).document

    const reopened = reconcileTabs(
      closed,
      [browserTab({ id: 42, windowId: 5 })],
      { ...options, createId: () => 'must-not-create' },
    ).document

    expect(reopened.tabs).toHaveLength(1)
    expect(reopened.tabs[0]).toEqual(
      expect.objectContaining({ id: 'tab-1', groupId: 'group-1', chromeTabId: 42, windowId: 5 }),
    )
  })

  it('returns the original document when browser state did not change', () => {
    const initial = reconcileTabs(createDocument(), [browserTab()], options).document

    const result = reconcileTabs(initial, [browserTab()], { ...options, now: () => LATER })

    expect(result.changed).toBe(false)
    expect(result.document).toBe(initial)
  })

  it('preserves organization when Chrome replaces a tab ID', () => {
    const initial = reconcileTabs(createDocument(), [browserTab()], options).document

    const result = replaceChromeTabId(initial, 10, 42, LATER)

    expect(result.changed).toBe(true)
    expect(result.document.tabs[0]).toEqual(
      expect.objectContaining({ id: 'tab-1', chromeTabId: 42, spaceId: 'space-1' }),
    )
  })

  it('tracks activation time when Chrome supplies it', () => {
    const initial = reconcileTabs(createDocument(), [browserTab()], options).document
    const accessed = Date.parse('2026-08-25T15:00:00.000Z')

    const result = reconcileTabs(initial, [browserTab({ active: true, lastAccessed: accessed })], options)

    expect(result.document.tabs[0]?.lastAccessedAt).toBe('2026-08-25T15:00:00.000Z')
  })
})
