import { tabSpaceDocumentSchema, type TabSpaceDocument } from './document'
import type { OperationOptions } from './spaceOperations'

function now(options: OperationOptions) {
  return (options.now ?? (() => new Date().toISOString()))()
}

export function createGroup(
  document: TabSpaceDocument,
  spaceId: string,
  name: string,
  color: string,
  options: OperationOptions = {},
) {
  const updatedAt = now(options)
  const id = (options.createId ?? (() => crypto.randomUUID()))()
  const order = document.groups.filter((group) => group.spaceId === spaceId).length
  return tabSpaceDocumentSchema.parse({
    ...document,
    groups: [
      ...document.groups,
      { id, spaceId, name, color, order, collapsed: false, createdAt: updatedAt, updatedAt },
    ],
    updatedAt,
  })
}

export function updateGroup(
  document: TabSpaceDocument,
  groupId: string,
  updates: { name?: string; color?: string; collapsed?: boolean },
  updatedAt = new Date().toISOString(),
) {
  return tabSpaceDocumentSchema.parse({
    ...document,
    groups: document.groups.map((group) =>
      group.id === groupId ? { ...group, ...updates, updatedAt } : group,
    ),
    updatedAt,
  })
}

export function moveGroup(
  document: TabSpaceDocument,
  groupId: string,
  direction: -1 | 1,
  updatedAt = new Date().toISOString(),
) {
  const group = document.groups.find(({ id }) => id === groupId)
  if (!group) return document
  const spaceGroups = document.groups
    .filter(({ spaceId }) => spaceId === group.spaceId)
    .sort((left, right) => left.order - right.order)
  const currentIndex = spaceGroups.findIndex(({ id }) => id === groupId)
  const destination = currentIndex + direction
  if (destination < 0 || destination >= spaceGroups.length) return document
  const current = spaceGroups[currentIndex]
  const adjacent = spaceGroups[destination]
  if (!current || !adjacent) return document

  return tabSpaceDocumentSchema.parse({
    ...document,
    groups: document.groups.map((candidate) => {
      if (candidate.id === current.id) return { ...candidate, order: adjacent.order, updatedAt }
      if (candidate.id === adjacent.id) return { ...candidate, order: current.order, updatedAt }
      return candidate
    }),
    updatedAt,
  })
}

export function deleteGroup(
  document: TabSpaceDocument,
  groupId: string,
  updatedAt = new Date().toISOString(),
) {
  const deletedGroup = document.groups.find(({ id }) => id === groupId)
  if (!deletedGroup) return document
  const groups = document.groups
    .filter(({ id }) => id !== groupId)
    .map((group) =>
      group.spaceId === deletedGroup.spaceId && group.order > deletedGroup.order
        ? { ...group, order: group.order - 1, updatedAt }
        : group,
    )

  return tabSpaceDocumentSchema.parse({
    ...document,
    groups,
    tabs: document.tabs.map((tab) =>
      tab.groupId === groupId ? { ...tab, groupId: undefined, updatedAt } : tab,
    ),
    updatedAt,
  })
}
