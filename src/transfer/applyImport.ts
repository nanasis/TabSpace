import { tabSpaceDocumentSchema, type Group, type Space, type TabRecord, type TabSpaceDocument } from '../model/document'
import type { ImportPreview } from './types'

export type ImportMode = 'merge' | 'replace'

export interface ApplyImportOptions {
  now?: () => string
  createId?: () => string
}

const DEFAULT_COLORS = ['#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899']

function validColor(color: string | undefined, index: number) {
  return color && /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : (DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? '#8b5cf6')
}

export function applyImport(
  document: TabSpaceDocument,
  preview: ImportPreview,
  mode: ImportMode,
  options: ApplyImportOptions = {},
) {
  const updatedAt = (options.now ?? (() => new Date().toISOString()))()
  const createId = options.createId ?? (() => crypto.randomUUID())
  const spaces: Space[] = mode === 'merge' ? [...document.spaces] : []
  const groups: Group[] = mode === 'merge' ? [...document.groups] : []
  const tabs: TabRecord[] = mode === 'merge' ? [...document.tabs] : []

  preview.spaces.forEach((importedSpace, spaceIndex) => {
    const spaceId = createId()
    spaces.push({
      id: spaceId,
      name: importedSpace.name.trim().slice(0, 80) || `Imported Space ${spaceIndex + 1}`,
      emoji: importedSpace.emoji?.trim().slice(0, 16) || '📥',
      color: validColor(importedSpace.color, spaceIndex),
      order: spaces.length,
      createdAt: updatedAt,
      updatedAt,
    })

    const addTabs = (importedTabs: typeof importedSpace.ungroupedTabs, groupId?: string) => {
      importedTabs.forEach((tab, tabIndex) => {
        tabs.push({
          id: createId(),
          spaceId,
          ...(groupId ? { groupId } : {}),
          url: tab.url,
          title: tab.title.slice(0, 4096),
          ...(tab.alias ? { alias: tab.alias.slice(0, 512) } : {}),
          ...(tab.avatarEmoji ? { avatarEmoji: tab.avatarEmoji.slice(0, 16) } : {}),
          pinned: false,
          active: false,
          order: tabIndex,
          lastAccessedAt: updatedAt,
          createdAt: updatedAt,
          updatedAt,
        })
      })
    }

    importedSpace.groups.forEach((importedGroup, groupIndex) => {
      const groupId = createId()
      groups.push({
        id: groupId,
        spaceId,
        name: importedGroup.name.trim().slice(0, 80) || `Imported Group ${groupIndex + 1}`,
        color: validColor(importedGroup.color, groupIndex),
        order: groupIndex,
        collapsed: false,
        createdAt: updatedAt,
        updatedAt,
      })
      addTabs(importedGroup.tabs, groupId)
    })
    addTabs(importedSpace.ungroupedTabs)
  })

  const firstImportedSpaceId = spaces[mode === 'merge' ? document.spaces.length : 0]?.id
  return tabSpaceDocumentSchema.parse({
    ...document,
    spaces,
    groups,
    tabs,
    settings: {
      ...document.settings,
      activeSpaceId: firstImportedSpaceId ?? document.settings.activeSpaceId,
    },
    updatedAt,
  })
}
