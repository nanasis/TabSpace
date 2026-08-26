import { tabSpaceDocumentSchema, type TabRecord, type TabSpaceDocument } from '../model/document'

export interface BrowserTabSnapshot {
  id: number
  windowId: number
  url: string
  title: string
  faviconUrl?: string
  pinned: boolean
  active: boolean
  lastAccessed?: number
}

export interface ReconcileTabsOptions {
  dashboardUrl: string
  now?: () => string
  createId?: () => string
}

export interface ReconcileTabsResult {
  document: TabSpaceDocument
  changed: boolean
}

function isDashboardUrl(candidateUrl: string, dashboardUrl: string) {
  try {
    const candidate = new URL(candidateUrl)
    const dashboard = new URL(dashboardUrl)
    return (
      candidate.protocol === dashboard.protocol &&
      candidate.host === dashboard.host &&
      candidate.pathname === dashboard.pathname
    )
  } catch {
    return false
  }
}

function accessedAt(tab: BrowserTabSnapshot, fallback: string) {
  return tab.lastAccessed !== undefined && Number.isFinite(tab.lastAccessed)
    ? new Date(tab.lastAccessed).toISOString()
    : fallback
}

function tabChanged(record: TabRecord, tab: BrowserTabSnapshot, nextAccessedAt: string) {
  return (
    record.windowId !== tab.windowId ||
    record.url !== tab.url ||
    record.title !== tab.title ||
    record.faviconUrl !== tab.faviconUrl ||
    record.pinned !== tab.pinned ||
    record.active !== tab.active ||
    (tab.active && record.lastAccessedAt !== nextAccessedAt)
  )
}

export function replaceChromeTabId(
  document: TabSpaceDocument,
  removedTabId: number,
  addedTabId: number,
  updatedAt = new Date().toISOString(),
): ReconcileTabsResult {
  const recordIndex = document.tabs.findIndex(({ chromeTabId }) => chromeTabId === removedTabId)
  if (recordIndex < 0) {
    return { document, changed: false }
  }

  const tabs = [...document.tabs]
  tabs[recordIndex] = {
    ...tabs[recordIndex],
    chromeTabId: addedTabId,
    updatedAt,
  }

  return {
    document: tabSpaceDocumentSchema.parse({ ...document, tabs, updatedAt }),
    changed: true,
  }
}

export function reconcileTabs(
  document: TabSpaceDocument,
  browserTabs: BrowserTabSnapshot[],
  options: ReconcileTabsOptions,
): ReconcileTabsResult {
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const createId = options.createId ?? (() => crypto.randomUUID())
  const manageableTabs = browserTabs.filter(
    (tab) => Number.isInteger(tab.id) && tab.id >= 0 && !isDashboardUrl(tab.url, options.dashboardUrl),
  )
  const liveTabIds = new Set(manageableTabs.map(({ id }) => id))
  const recordsByChromeId = new Map(
    document.tabs
      .filter((record): record is TabRecord & { chromeTabId: number } => record.chromeTabId !== undefined)
      .map((record) => [record.chromeTabId, record]),
  )
  const retainedRecords = document.tabs.filter(
    (record) => record.chromeTabId === undefined || liveTabIds.has(record.chromeTabId),
  )
  let changed = retainedRecords.length !== document.tabs.length
  const nextRecords = [...retainedRecords]
  const nextRecordIndexes = new Map(nextRecords.map((record, index) => [record.id, index]))
  let nextOrder =
    Math.max(
      -1,
      ...nextRecords
        .filter(({ spaceId }) => spaceId === document.settings.activeSpaceId)
        .map(({ order }) => order),
    ) + 1

  for (const tab of manageableTabs) {
    const existing = recordsByChromeId.get(tab.id)
    const nextAccessedAt = accessedAt(tab, timestamp)

    if (existing) {
      if (!tabChanged(existing, tab, nextAccessedAt)) {
        continue
      }

      const index = nextRecordIndexes.get(existing.id) ?? -1
      if (index >= 0) {
        nextRecords[index] = {
          ...existing,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          ...(tab.faviconUrl ? { faviconUrl: tab.faviconUrl } : { faviconUrl: undefined }),
          pinned: tab.pinned,
          active: tab.active,
          lastAccessedAt: tab.active ? nextAccessedAt : existing.lastAccessedAt,
          updatedAt: timestamp,
        }
        changed = true
      }
      continue
    }

    const newRecord: TabRecord = {
      id: createId(),
      chromeTabId: tab.id,
      windowId: tab.windowId,
      spaceId: document.settings.activeSpaceId,
      url: tab.url,
      title: tab.title,
      ...(tab.faviconUrl ? { faviconUrl: tab.faviconUrl } : {}),
      pinned: tab.pinned,
      active: tab.active,
      order: nextOrder,
      lastAccessedAt: nextAccessedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    nextRecordIndexes.set(newRecord.id, nextRecords.length)
    nextRecords.push(newRecord)
    nextOrder += 1
    changed = true
  }

  if (!changed) {
    return { document, changed: false }
  }

  return {
    document: tabSpaceDocumentSchema.parse({
      ...document,
      tabs: nextRecords,
      updatedAt: timestamp,
    }),
    changed: true,
  }
}
