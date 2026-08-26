import { tabSpaceDocumentSchema, type Group, type Space, type TabRecord, type TabSpaceDocument } from '../model/document'
import { faviconForImportedTab } from './favicon'
import type { ImportPreview } from './types'

export type ImportMode = 'merge' | 'replace'

export interface ApplyImportOptions {
  now?: () => string
  createId?: () => string
}

const DEFAULT_COLORS = ['#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#ec4899']

function canonicalUrl(url: string) {
  try {
    return new URL(url).href
  } catch {
    return url
  }
}

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
        const faviconUrl = faviconForImportedTab(tab.url, tab.faviconUrl)
        tabs.push({
          id: createId(),
          spaceId,
          ...(groupId ? { groupId } : {}),
          url: tab.url,
          title: tab.title.slice(0, 4096),
          ...(tab.alias ? { alias: tab.alias.slice(0, 512) } : {}),
          ...(tab.avatarEmoji ? { avatarEmoji: tab.avatarEmoji.slice(0, 16) } : {}),
          ...(tab.avatarImage ? { avatarImage: tab.avatarImage.slice(0, 262144) } : {}),
          ...(faviconUrl ? { faviconUrl } : {}),
          pinned: false,
          active: false,
          collected: true,
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

  if (mode === 'replace' && firstImportedSpaceId) {
    let ungroupedOrder = tabs.filter(
      (tab) => tab.spaceId === firstImportedSpaceId && tab.groupId === undefined,
    ).length
    const tabIds = new Set(tabs.map(({ id }) => id))
    const importedIndexesByUrl = new Map<string, number[]>()
    tabs.forEach((tab, index) => {
      if (tab.chromeTabId !== undefined) return
      const indexes = importedIndexesByUrl.get(canonicalUrl(tab.url))
      if (indexes) indexes.push(index)
      else importedIndexesByUrl.set(canonicalUrl(tab.url), [index])
    })

    document.tabs
      .filter((tab): tab is TabRecord & { chromeTabId: number } => tab.chromeTabId !== undefined)
      .forEach((openTab) => {
        const importedIndex = importedIndexesByUrl.get(canonicalUrl(openTab.url))?.shift() ?? -1

        if (importedIndex >= 0) {
          const importedTab = tabs[importedIndex]
          if (importedTab) {
            tabs[importedIndex] = {
              ...importedTab,
              chromeTabId: openTab.chromeTabId,
              ...(openTab.windowId !== undefined ? { windowId: openTab.windowId } : {}),
              url: openTab.url,
              title: openTab.title,
              ...(openTab.faviconUrl ? { faviconUrl: openTab.faviconUrl } : {}),
              pinned: openTab.pinned,
              active: openTab.active,
              lastAccessedAt: openTab.lastAccessedAt,
              updatedAt,
            }
          }
          return
        }

        const nextTabId = tabIds.has(openTab.id) ? createId() : openTab.id
        tabs.push({
          ...openTab,
          id: nextTabId,
          collected: false,
          spaceId: firstImportedSpaceId,
          groupId: undefined,
          order: ungroupedOrder,
          updatedAt,
        })
        tabIds.add(nextTabId)
        ungroupedOrder += 1
      })
  }

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
