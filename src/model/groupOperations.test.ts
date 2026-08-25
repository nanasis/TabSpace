import { describe, expect, it } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from './document'
import {
  createDefaultGroupForTab,
  createGroup,
  deleteGroup,
  moveGroup,
  updateGroup,
} from './groupOperations'

const NOW = '2026-08-25T12:00:00.000Z'
const LATER = '2026-08-25T13:00:00.000Z'

function documentWithGroups() {
  const initial = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
  const first = createGroup(initial, 'space-1', 'One', '#8b5cf6', {
    now: () => NOW,
    createId: () => 'group-1',
  })
  return createGroup(first, 'space-1', 'Two', '#3b82f6', {
    now: () => NOW,
    createId: () => 'group-2',
  })
}

describe('group operations', () => {
  it('creates, edits, collapses, and reorders groups', () => {
    const initial = documentWithGroups()
    const edited = updateGroup(initial, 'group-1', { name: 'Updated', collapsed: true }, LATER)
    const moved = moveGroup(edited, 'group-1', 1, LATER)

    expect(moved.groups.find(({ id }) => id === 'group-1')).toEqual(
      expect.objectContaining({ name: 'Updated', collapsed: true, order: 1 }),
    )
    expect(moved.groups.find(({ id }) => id === 'group-2')?.order).toBe(0)
  })

  it('creates a uniquely named default group and moves a dropped tab into it', () => {
    const initial = documentWithGroups()
    const populated = tabSpaceDocumentSchema.parse({
      ...initial,
      groups: initial.groups.map((group, index) =>
        index === 0 ? { ...group, name: 'New Group' } : group,
      ),
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

    const result = createDefaultGroupForTab(populated, 'space-1', 'tab-1', {
      now: () => LATER,
      createId: () => 'group-3',
    })

    expect(result.groups.find(({ id }) => id === 'group-3')?.name).toBe('New Group 2')
    expect(result.tabs[0]?.groupId).toBe('group-3')
  })

  it('moves tabs to Ungrouped when deleting a group', () => {
    const initial = documentWithGroups()
    const populated = tabSpaceDocumentSchema.parse({
      ...initial,
      tabs: [
        {
          id: 'tab-1',
          chromeTabId: 10,
          spaceId: 'space-1',
          groupId: 'group-1',
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

    const result = deleteGroup(populated, 'group-1', LATER)

    expect(result.tabs[0]?.groupId).toBeUndefined()
    expect(result.groups.map(({ id, order }) => ({ id, order }))).toEqual([
      { id: 'group-2', order: 0 },
    ])
  })
})
