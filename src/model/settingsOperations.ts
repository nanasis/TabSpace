import { tabSpaceDocumentSchema, type Settings, type TabSpaceDocument } from './document'

export function updateSettings(
  document: TabSpaceDocument,
  updates: Partial<Settings>,
  updatedAt = new Date().toISOString(),
) {
  return tabSpaceDocumentSchema.parse({
    ...document,
    settings: { ...document.settings, ...updates },
    updatedAt,
  })
}
