import { tabSpaceDocumentSchema, type TabSpaceDocument } from './document'
import { OrganizationError } from './spaceOperations'

export function updateTab(
  document: TabSpaceDocument,
  tabId: string,
  updates: { alias?: string; avatarEmoji?: string; pinned?: boolean },
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

export function moveTab(
  document: TabSpaceDocument,
  tabId: string,
  destinationSpaceId: string,
  destinationGroupId?: string,
  updatedAt = new Date().toISOString(),
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

  const destinationOrder = document.tabs.filter(
    (tab) => tab.spaceId === destinationSpaceId && tab.groupId === destinationGroupId,
  ).length
  return tabSpaceDocumentSchema.parse({
    ...document,
    tabs: document.tabs.map((tab) =>
      tab.id === tabId
        ? {
            ...tab,
            spaceId: destinationSpaceId,
            groupId: destinationGroupId,
            order: destinationOrder,
            updatedAt,
          }
        : tab,
    ),
    updatedAt,
  })
}
