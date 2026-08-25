import { describe, expect, it } from 'vitest'

import type { TabRecord } from '../model/document'
import { searchTabs } from './searchTabs'

const tab: TabRecord = {
  id: 'tab-1',
  spaceId: 'space-1',
  url: 'https://docs.example.com/guide',
  title: 'TypeScript Guide',
  alias: 'Reference',
  pinned: false,
  active: false,
  order: 0,
  lastAccessedAt: '2026-08-25T12:00:00.000Z',
  createdAt: '2026-08-25T12:00:00.000Z',
  updatedAt: '2026-08-25T12:00:00.000Z',
}

describe('searchTabs', () => {
  it.each(['typescript', 'REFERENCE', 'docs.example.com', '/guide'])(
    'matches title, alias, domain, or URL using %s',
    (query) => {
      expect(searchTabs([tab], query)).toEqual([tab])
    },
  )

  it('returns no tabs when the query does not match', () => {
    expect(searchTabs([tab], 'calendar')).toEqual([])
  })
})
