import { tabSpaceDocumentSchema, type TabSpaceDocument } from './document'
import { OrganizationError } from './spaceOperations'

export function updateTab(
  document: TabSpaceDocument,
  tabId: string,
  updates: {
    alias?: string
    avatarEmoji?: string
    avatarImage?: string
    pinned?: boolean
  },
  updatedAt = new Date().toISOString(),
) {
  return tabSpaceDocumentSchema.parse({
    ...document,
    tabs: document.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, ...updates, updatedAt } : tab,
    ),
    updatedAt,
  })
}

function validateDestination(
  document: TabSpaceDocument,
  destinationSpaceId: string,
  destinationGroupId?: string,
) {
  if (!document.spaces.some(({ id }) => id === destinationSpaceId)) {
    throw new OrganizationError('Tab destination space does not exist')
  }
  if (destinationGroupId) {
    const group = document.groups.find(({ id }) => id === destinationGroupId)
    if (!group || group.spaceId !== destinationSpaceId) {
      throw new OrganizationError('Tab destination group must be in the destination space')
    }
  }
}

export function moveTabs(
  document: TabSpaceDocument,
  tabIds: Iterable<string>,
  destinationSpaceId: string,
  destinationGroupId?: string,
  updatedAt = new Date().toISOString(),
) {
  validateDestination(document, destinationSpaceId, destinationGroupId)
  const movedTabIds = new Set(tabIds)
  if (!movedTabIds.size) return document

  let destinationOrder = document.tabs.filter(
    (tab) =>
      !movedTabIds.has(tab.id) &&
      tab.spaceId === destinationSpaceId &&
      tab.groupId === destinationGroupId,
  ).length
  const tabs = document.tabs.map((tab) => {
    if (!movedTabIds.has(tab.id)) return tab
    const movedTab = {
      ...tab,
      collected: true,
      spaceId: destinationSpaceId,
      groupId: destinationGroupId,
      order: destinationOrder,
      updatedAt,
    }
    destinationOrder += 1
    return movedTab
  })

  return tabSpaceDocumentSchema.parse({ ...document, tabs, updatedAt })
}

export function deleteTabCard(
  document: TabSpaceDocument,
  tabId: string,
  updatedAt = new Date().toISOString(),
) {
  const tab = document.tabs.find(({ id }) => id === tabId)
  if (!tab) return document

  const tabs = tab.chromeTabId === undefined
    ? document.tabs.filter(({ id }) => id !== tabId)
    : document.tabs.map((candidate) =>
        candidate.id === tabId
          ? {
              ...candidate,
              collected: false,
              groupId: undefined,
              updatedAt,
            }
          : candidate,
      )

  return tabSpaceDocumentSchema.parse({ ...document, tabs, updatedAt })
}

export function moveTab(
  document: TabSpaceDocument,
  tabId: string,
  destinationSpaceId: string,
  destinationGroupId?: string,
  updatedAt = new Date().toISOString(),
) {
  return moveTabs(
    document,
    [tabId],
    destinationSpaceId,
    destinationGroupId,
    updatedAt,
  )
}
