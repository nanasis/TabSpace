import { useCallback, useEffect, useRef, useState } from 'react'

import { migrateDocument, type TabSpaceDocument } from '../model/document'
import {
  DOCUMENT_STORAGE_KEY,
  type DocumentRepository,
} from '../storage/documentRepository'

export interface DocumentState {
  document?: TabSpaceDocument
  error?: string
  loading: boolean
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
}

export function useTabSpaceDocument(repository: DocumentRepository): DocumentState {
  const [document, setDocument] = useState<TabSpaceDocument>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const documentRef = useRef<TabSpaceDocument | undefined>(undefined)
  const writeQueue = useRef(Promise.resolve())
  const pendingLocalWrites = useRef(new Set<string>())

  useEffect(() => {
    let active = true

    void repository
      .load()
      .then((loadedDocument) => {
        if (active) {
          documentRef.current = loadedDocument
          setDocument(loadedDocument)
          setError(undefined)
        }
      })
      .catch(() => {
        if (active) {
          setError('TabSpace could not load local data. Reload the extension to try again.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
      return () => {
        active = false
      }
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      const nextValue = changes[DOCUMENT_STORAGE_KEY]?.newValue
      if (areaName !== 'local' || nextValue === undefined) {
        return
      }

      try {
        const nextDocument = migrateDocument(nextValue).document
        if (pendingLocalWrites.current.delete(nextDocument.updatedAt)) {
          return
        }
        documentRef.current = nextDocument
        setDocument(nextDocument)
        setError(undefined)
      } catch {
        setError('TabSpace detected invalid local data and left it unchanged.')
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [repository])

  const updateDocument = useCallback(
    async (transform: (currentDocument: TabSpaceDocument) => TabSpaceDocument) => {
      writeQueue.current = writeQueue.current.then(async () => {
        const currentDocument = documentRef.current
        if (!currentDocument) {
          return
        }

        const nextDocument = transform(currentDocument)
        documentRef.current = nextDocument
        setDocument(nextDocument)
        try {
          pendingLocalWrites.current.add(nextDocument.updatedAt)
          await repository.save(nextDocument)
          setTimeout(() => pendingLocalWrites.current.delete(nextDocument.updatedAt), 1_000)
          setError(undefined)
        } catch {
          pendingLocalWrites.current.delete(nextDocument.updatedAt)
          documentRef.current = currentDocument
          setDocument(currentDocument)
          setError('TabSpace could not save that change. Please try again.')
        }
      })

      await writeQueue.current
    },
    [repository],
  )

  return { document, error, loading, updateDocument }
}
