import { describe, expect, it } from 'vitest'

import {
  createDefaultDocument,
  migrateDocument,
  TABSPACE_SCHEMA_VERSION,
  tabSpaceDocumentSchema,
  UnsupportedDocumentVersionError,
} from './document'

const NOW = '2026-08-25T12:00:00.000Z'

function createDocument() {
  return createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
}

describe('TabSpace document', () => {
  it('creates the safe first-install state', () => {
    const document = createDocument()

    expect(document).toMatchObject({
      schemaVersion: TABSPACE_SCHEMA_VERSION,
      spaces: [{ id: 'space-1', name: 'My Space', emoji: '✨', order: 0 }],
      groups: [],
      tabs: [],
      settings: { activeSpaceId: 'space-1' },
      sync: {},
    })
  })

  it('rejects broken entity references', () => {
    const document = createDocument()

    expect(() =>
      tabSpaceDocumentSchema.parse({
        ...document,
        settings: { activeSpaceId: 'missing-space' },
      }),
    ).toThrow(/Active space must reference an existing space/)
  })

  it('rejects duplicate entity IDs', () => {
    const document = createDocument()

    expect(() =>
      tabSpaceDocumentSchema.parse({
        ...document,
        spaces: [...document.spaces, { ...document.spaces[0] }],
      }),
    ).toThrow(/Space IDs must be unique/)
  })

  it('rejects undeclared fields such as credentials', () => {
    const document = createDocument()

    expect(() =>
      tabSpaceDocumentSchema.parse({
        ...document,
        sync: { token: 'must-not-be-persisted' },
      }),
    ).toThrow()
  })

  it('migrates the prerelease version and adds safe sync metadata', () => {
    const document = createDocument()
    const legacyDocument: Record<string, unknown> = { ...document, schemaVersion: 0 }
    delete legacyDocument.sync

    const result = migrateDocument(legacyDocument)

    expect(result.migrated).toBe(true)
    expect(result.document.schemaVersion).toBe(TABSPACE_SCHEMA_VERSION)
    expect(result.document.sync).toEqual({})
  })

  it('rejects unknown future schema versions', () => {
    expect(() => migrateDocument({ schemaVersion: 99 })).toThrow(UnsupportedDocumentVersionError)
  })
})
