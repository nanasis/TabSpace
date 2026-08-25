export const TAB_DRAG_MIME = 'application/x-tabspace-tab'

export interface TabDragPayload {
  tabId: string
  source: 'sidebar' | 'card'
}

export function writeTabDragPayload(dataTransfer: DataTransfer, payload: TabDragPayload) {
  dataTransfer.effectAllowed = 'move'
  dataTransfer.setData(TAB_DRAG_MIME, JSON.stringify(payload))
  dataTransfer.setData('text/plain', payload.tabId)
}

export function readTabDragPayload(dataTransfer: DataTransfer): TabDragPayload | undefined {
  try {
    const value: unknown = JSON.parse(dataTransfer.getData(TAB_DRAG_MIME))
    if (
      typeof value === 'object' &&
      value !== null &&
      'tabId' in value &&
      typeof value.tabId === 'string' &&
      'source' in value &&
      (value.source === 'sidebar' || value.source === 'card')
    ) {
      return { tabId: value.tabId, source: value.source }
    }
  } catch {
    // Ignore unrelated or malformed drag data.
  }
  return undefined
}
