import {
  createDefaultDocument,
  migrateDocument,
  tabSpaceDocumentSchema,
  type DocumentFactoryOptions,
  type TabSpaceDocument,
} from '../model/document'

export const DOCUMENT_STORAGE_KEY = 'tabspace.document'
export const DOCUMENT_RECOVERY_KEY = 'tabspace.recovery'

export interface LocalStorageArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
}

export interface DocumentRepository {
  load(): Promise<TabSpaceDocument>
  save(document: TabSpaceDocument): Promise<void>
}

export interface DocumentRepositoryOptions extends DocumentFactoryOptions {
  storageKey?: string
  recoverInvalid?: boolean
}

export class StoredDocumentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StoredDocumentError'
  }
}

export function createDocumentRepository(
  storage: LocalStorageArea,
  options: DocumentRepositoryOptions = {},
): DocumentRepository {
  const storageKey = options.storageKey ?? DOCUMENT_STORAGE_KEY

  return {
    async load() {
      const storedItems = await storage.get(storageKey)
      const storedDocument = storedItems[storageKey]

      if (storedDocument === undefined) {
        const document = createDefaultDocument(options)
        await storage.set({ [storageKey]: document })
        return document
      }

      try {
        const result = migrateDocument(storedDocument)
        if (result.migrated) {
          await storage.set({ [storageKey]: result.document })
        }
        return result.document
      } catch (error) {
        if (!options.recoverInvalid) {
          throw new StoredDocumentError('The stored TabSpace document is invalid', { cause: error })
        }

        const recoveredDocument = createDefaultDocument(options)
        await storage.set({
          [storageKey]: recoveredDocument,
          [DOCUMENT_RECOVERY_KEY]: {
            recoveredAt: new Date().toISOString(),
            reason: 'invalid-document',
          },
        })
        return recoveredDocument
      }
    },

    async save(document) {
      const validatedDocument = tabSpaceDocumentSchema.parse(document)
      await storage.set({ [storageKey]: validatedDocument })
    },
  }
}

export function createChromeDocumentRepository(options: DocumentRepositoryOptions = {}) {
  return createDocumentRepository(
    {
      get: (key) => chrome.storage.local.get(key),
      set: (items) => chrome.storage.local.set(items),
    },
    { recoverInvalid: true, ...options },
  )
}
