import { describe, expect, it } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from './document'
import {
  activateSpace,
  createSpace,
  deleteSpace,
  moveSpace,
  OrganizationError,
  updateSpace,
} from './spaceOperations'

const NOW = '2026-08-25T12:00:00.000Z'
const LATER = '2026-08-25T13:00:00.000Z'

function initialDocument() {
  return createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
}

function withSecondSpace() {
  return createSpace(initialDocument(), 'Research', '🔬', {
    now: () => LATER,
    createId: () => 'space-2',
  })
}

describe('space operations', () => {
  it('creates and activates a user space', () => {
    const document = withSecondSpace()

    expect(document.spaces.map(({ name }) => name)).toEqual(['My Space', 'Research'])
    expect(document.settings.activeSpaceId).toBe('space-2')
  })

  it('activates, renames, and reorders spaces', () => {
    const document = withSecondSpace()
    const activated = activateSpace(document, 'space-1', LATER)
    const renamed = updateSpace(activated, 'space-1', { name: 'Work', emoji: '💼' }, LATER)
    const moved = moveSpace(renamed, 'space-1', 1, LATER)

    expect(moved.settings.activeSpaceId).toBe('space-1')
    expect([...moved.spaces].sort((a, b) => a.order - b.order).map(({ name }) => name)).toEqual([
      'Research',
      'Work',
    ])
  })

  it('moves tabs ungrouped to the first remaining space when deleting', () => {
    const document = withSecondSpace()
    const populated = tabSpaceDocumentSchema.parse({
      ...document,
      groups: [
        {
          id: 'group-1',
          spaceId: 'space-2',
          name: 'Sources',
          color: '#8b5cf6',
          order: 0,
          collapsed: false,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      tabs: [
        {
          id: 'tab-1',
          chromeTabId: 10,
          spaceId: 'space-2',
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

    const result = deleteSpace(populated, 'space-2', LATER)

    expect(result.tabs[0]).toEqual(
      expect.objectContaining({ spaceId: 'space-1', groupId: undefined }),
    )
    expect(result.groups).toEqual([])
    expect(result.settings.activeSpaceId).toBe('space-1')
  })

  it('prevents deletion of the final space', () => {
    expect(() => deleteSpace(initialDocument(), 'space-1', LATER)).toThrow(OrganizationError)
  })
})
