import { describe, expect, it, vi } from 'vitest'

import { createDefaultDocument } from '../model/document'
import {
  createDocumentRepository,
  DOCUMENT_RECOVERY_KEY,
  DOCUMENT_STORAGE_KEY,
  type LocalStorageArea,
  StoredDocumentError,
} from './documentRepository'

const NOW = '2026-08-25T12:00:00.000Z'

function createStorage(initialItems: Record<string, unknown> = {}) {
  const items = { ...initialItems }
  const storage: LocalStorageArea = {
    get: vi.fn(async (key) => ({ [key]: items[key] })),
    set: vi.fn(async (updates) => {
      Object.assign(items, updates)
    }),
  }

  return { items, storage }
}

function createRepository(storage: LocalStorageArea) {
  return createDocumentRepository(storage, { now: () => NOW, createId: () => 'space-1' })
}

describe('document repository', () => {
  it('creates and persists My Space when storage is empty', async () => {
    const { items, storage } = createStorage()

    const document = await createRepository(storage).load()

    expect(document.spaces[0]?.name).toBe('My Space')
    expect(items[DOCUMENT_STORAGE_KEY]).toEqual(document)
  })

  it('loads a valid current document without rewriting storage', async () => {
    const document = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const { storage } = createStorage({ [DOCUMENT_STORAGE_KEY]: document })

    await expect(createRepository(storage).load()).resolves.toEqual(document)
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('migrates and persists an older document once', async () => {
    const current = createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
    const legacyDocument: Record<string, unknown> = { ...current, schemaVersion: 0 }
    delete legacyDocument.sync
    const { items, storage } = createStorage({
      [DOCUMENT_STORAGE_KEY]: legacyDocument,
    })

    const document = await createRepository(storage).load()

    expect(document.schemaVersion).toBe(1)
    expect(items[DOCUMENT_STORAGE_KEY]).toEqual(document)
    expect(storage.set).toHaveBeenCalledOnce()
  })

  it('rejects corrupt storage without overwriting it', async () => {
    const corruptDocument = { schemaVersion: 1, token: 'private' }
    const { items, storage } = createStorage({ [DOCUMENT_STORAGE_KEY]: corruptDocument })

    await expect(createRepository(storage).load()).rejects.toBeInstanceOf(StoredDocumentError)
    expect(items[DOCUMENT_STORAGE_KEY]).toBe(corruptDocument)
    expect(storage.set).not.toHaveBeenCalled()
  })

  it('recovers invalid storage without retaining untrusted contents', async () => {
    const { items, storage } = createStorage({
      [DOCUMENT_STORAGE_KEY]: { schemaVersion: 1, token: 'must-not-survive' },
    })
    const repository = createDocumentRepository(storage, {
      now: () => NOW,
      createId: () => 'recovered-space',
      recoverInvalid: true,
    })

    const document = await repository.load()

    expect(document.spaces[0]?.id).toBe('recovered-space')
    expect(items[DOCUMENT_STORAGE_KEY]).toEqual(document)
    expect(items[DOCUMENT_RECOVERY_KEY]).toEqual(
      expect.objectContaining({ reason: 'invalid-document' }),
    )
    expect(JSON.stringify(items)).not.toContain('must-not-survive')
  })

  it('validates documents before saving', async () => {
    const { storage } = createStorage()
    const repository = createRepository(storage)

    await expect(
      repository.save({ schemaVersion: 1, token: 'private' } as never),
    ).rejects.toThrow()
    expect(storage.set).not.toHaveBeenCalled()
  })
})
