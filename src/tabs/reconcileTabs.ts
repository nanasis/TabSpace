import { tabSpaceDocumentSchema, type TabRecord, type TabSpaceDocument } from '../model/document'

export interface BrowserTabSnapshot {
  id: number
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
    record.url !== tab.url ||
    record.title !== tab.title ||
    record.faviconUrl !== tab.faviconUrl ||
    record.pinned !== tab.pinned ||
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

      const index = nextRecords.findIndex(({ id }) => id === existing.id)
      if (index >= 0) {
        nextRecords[index] = {
          ...existing,
          url: tab.url,
          title: tab.title,
          ...(tab.faviconUrl ? { faviconUrl: tab.faviconUrl } : { faviconUrl: undefined }),
          pinned: tab.pinned,
          lastAccessedAt: tab.active ? nextAccessedAt : existing.lastAccessedAt,
          updatedAt: timestamp,
        }
        changed = true
      }
      continue
    }

    nextRecords.push({
      id: createId(),
      chromeTabId: tab.id,
      spaceId: document.settings.activeSpaceId,
      url: tab.url,
      title: tab.title,
      ...(tab.faviconUrl ? { faviconUrl: tab.faviconUrl } : {}),
      pinned: tab.pinned,
      order: nextOrder,
      lastAccessedAt: nextAccessedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
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
