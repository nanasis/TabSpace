import { describe, expect, it } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from './document'
import { createGroup } from './groupOperations'
import { moveTab, moveTabs, updateTab } from './tabOperations'

const NOW = '2026-08-25T12:00:00.000Z'

function populatedDocument() {
  const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
  const grouped = createGroup(initial, 'space-1', 'Sources', '#8b5cf6', {
    now: () => NOW,
    createId: () => 'group-1',
  })
  return tabSpaceDocumentSchema.parse({
    ...grouped,
    tabs: [
      {
        id: 'tab-1',
        chromeTabId: 10,
        spaceId: 'space-1',
        url: 'https://example.com',
        title: 'Example',
        pinned: false,
        active: false,
        order: 0,
        lastAccessedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  })
}

describe('tab operations', () => {
  it('updates user-owned aliases and avatars', () => {
    const result = updateTab(populatedDocument(), 'tab-1', {
      alias: 'Reference',
      avatarEmoji: '📚',
    })

    expect(result.tabs[0]).toEqual(
      expect.objectContaining({ alias: 'Reference', avatarEmoji: '📚' }),
    )
  })

  it('moves a tab into and out of a group', () => {
    const grouped = moveTab(populatedDocument(), 'tab-1', 'space-1', 'group-1', NOW)
    const ungrouped = moveTab(grouped, 'tab-1', 'space-1', undefined, NOW)

    expect(grouped.tabs[0]?.groupId).toBe('group-1')
    expect(ungrouped.tabs[0]?.groupId).toBeUndefined()
  })

  it('moves multiple tabs in one validated operation', () => {
    const initial = populatedDocument()
    const withSecondTab = tabSpaceDocumentSchema.parse({
      ...initial,
      tabs: [
        ...initial.tabs,
        { ...initial.tabs[0], id: 'tab-2', chromeTabId: 11, order: 1 },
      ],
    })

    const result = moveTabs(withSecondTab, ['tab-1', 'tab-2'], 'space-1', 'group-1', NOW)

    expect(result.tabs.map(({ groupId, order }) => ({ groupId, order }))).toEqual([
      { groupId: 'group-1', order: 0 },
      { groupId: 'group-1', order: 1 },
    ])
  })

  it('rejects a group outside the destination space', () => {
    expect(() => moveTab(populatedDocument(), 'tab-1', 'missing', 'group-1', NOW)).toThrow()
  })
})
