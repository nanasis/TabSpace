import { DEFAULT_SPACE_COLOR, tabSpaceDocumentSchema, type TabSpaceDocument } from './document'

export interface OperationOptions {
  now?: () => string
  createId?: () => string
}

export class OrganizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrganizationError'
  }
}

function timestamp(options: OperationOptions) {
  return (options.now ?? (() => new Date().toISOString()))()
}

export function createSpace(
  document: TabSpaceDocument,
  name: string,
  emoji: string,
  options: OperationOptions = {},
) {
  const updatedAt = timestamp(options)
  const id = (options.createId ?? (() => crypto.randomUUID()))()
  return tabSpaceDocumentSchema.parse({
    ...document,
    spaces: [
      ...document.spaces,
      {
        id,
        name,
        emoji,
        color: DEFAULT_SPACE_COLOR,
        order: document.spaces.length,
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    settings: { ...document.settings, activeSpaceId: id },
    updatedAt,
  })
}

export function activateSpace(document: TabSpaceDocument, spaceId: string, now = new Date().toISOString()) {
  if (!document.spaces.some(({ id }) => id === spaceId)) {
    throw new OrganizationError('Cannot activate a space that does not exist')
  }
  if (document.settings.activeSpaceId === spaceId) {
    return document
  }
  return tabSpaceDocumentSchema.parse({
    ...document,
    settings: { ...document.settings, activeSpaceId: spaceId },
    updatedAt: now,
  })
}

export function updateSpace(
  document: TabSpaceDocument,
  spaceId: string,
  updates: { name?: string; emoji?: string; color?: string },
  now = new Date().toISOString(),
) {
  return tabSpaceDocumentSchema.parse({
    ...document,
    spaces: document.spaces.map((space) =>
      space.id === spaceId ? { ...space, ...updates, updatedAt: now } : space,
    ),
    updatedAt: now,
  })
}

export function moveSpace(
  document: TabSpaceDocument,
  spaceId: string,
  direction: -1 | 1,
  now = new Date().toISOString(),
) {
  const spaces = [...document.spaces].sort((left, right) => left.order - right.order)
  const currentIndex = spaces.findIndex(({ id }) => id === spaceId)
  const destination = currentIndex + direction
  if (currentIndex < 0 || destination < 0 || destination >= spaces.length) {
    return document
  }

  ;[spaces[currentIndex], spaces[destination]] = [spaces[destination], spaces[currentIndex]]
  return tabSpaceDocumentSchema.parse({
    ...document,
    spaces: spaces.map((space, order) => ({ ...space, order, updatedAt: now })),
    updatedAt: now,
  })
}

export function deleteSpace(
  document: TabSpaceDocument,
  spaceId: string,
  now = new Date().toISOString(),
) {
  if (document.spaces.length === 1) {
    throw new OrganizationError('The final space cannot be deleted')
  }
  if (!document.spaces.some(({ id }) => id === spaceId)) {
    return document
  }

  const spaces = document.spaces
    .filter(({ id }) => id !== spaceId)
    .sort((left, right) => left.order - right.order)
    .map((space, order) => ({ ...space, order }))
  const destinationSpaceId = spaces[0]?.id
  if (!destinationSpaceId) {
    throw new OrganizationError('A destination space is required')
  }

  return tabSpaceDocumentSchema.parse({
    ...document,
    spaces,
    groups: document.groups.filter((group) => group.spaceId !== spaceId),
    tabs: document.tabs.map((tab) =>
      tab.spaceId === spaceId
        ? { ...tab, spaceId: destinationSpaceId, groupId: undefined, updatedAt: now }
        : tab,
    ),
    settings: {
      ...document.settings,
      activeSpaceId:
        document.settings.activeSpaceId === spaceId
          ? destinationSpaceId
          : document.settings.activeSpaceId,
    },
    updatedAt: now,
  })
}
