import { z } from 'zod'

import { backupSchema } from './tabSpaceBackup'
import type { ImportedGroup, ImportedSpace, ImportedTab, ImportPreview, ImportProvider } from './types'

const recordSchema = z.record(z.string(), z.unknown())
const tobyCardSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  customTitle: z.string().optional(),
}).passthrough()
const tobyListSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  cards: z.array(tobyCardSchema).default([]),
}).passthrough()

function safeTab(url: string, title?: string, alias?: string): ImportedTab | undefined {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined
    return { url: parsed.href, title: title?.trim() || parsed.hostname, ...(alias?.trim() ? { alias: alias.trim() } : {}) }
  } catch {
    return undefined
  }
}

function parseToby(input: unknown): ImportPreview {
  let lists: unknown[] = []
  const spaces: ImportedSpace[] = []
  const counter = { skipped: 0 }
  const root = recordSchema.safeParse(input)

  if (Array.isArray(input)) {
    lists = input
  } else if (root.success && Array.isArray(root.data.lists)) {
    lists = root.data.lists
  } else if (root.success && Array.isArray(root.data.groups)) {
    for (const [groupIndex, rawGroup] of root.data.groups.entries()) {
      const group = recordSchema.safeParse(rawGroup)
      if (!group.success || !Array.isArray(group.data.lists)) continue
      spaces.push(toImportedSpace(group.data.name, group.data.lists, `Toby Space ${groupIndex + 1}`, counter))
    }
  } else {
    throw new Error('The selected file is not a Toby JSON export')
  }

  if (lists.length) spaces.push(toImportedSpace('Toby Import', lists, 'Toby Import', counter))
  if (!spaces.length) throw new Error('The Toby export contains no collections')
  return {
    provider: 'toby',
    spaces,
    skippedRecords: counter.skipped,
    warnings: counter.skipped ? [`Skipped ${counter.skipped} invalid or unsupported URLs.`] : [],
  }
}

function toImportedSpace(
  rawName: unknown,
  rawLists: unknown[],
  fallback: string,
  counter: { skipped: number },
): ImportedSpace {
  return {
    name: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : fallback,
    emoji: '📥',
    groups: rawLists.flatMap((rawList, index) => {
      const parsed = tobyListSchema.safeParse(rawList)
      if (!parsed.success) return []
      const tabs = parsed.data.cards.flatMap((card) => {
        const tab = safeTab(card.url, card.title, card.customTitle)
        if (!tab) counter.skipped += 1
        return tab ? [tab] : []
      })
      const name = parsed.data.title?.trim() || parsed.data.name?.trim() || `Collection ${index + 1}`
      return [{ name, tabs }]
    }),
    ungroupedTabs: [],
  }
}

interface TabmeItem {
  url?: string
  title?: string
  name?: string
  groupItems?: TabmeItem[]
}

const tabmeItemSchema: z.ZodType<TabmeItem> = z.lazy(() =>
  z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    groupItems: z.array(tabmeItemSchema).optional(),
  }).passthrough(),
)
const tabmeFolderSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  color: z.string().optional(),
  bookmarks: z.array(tabmeItemSchema).optional(),
  tabs: z.array(tabmeItemSchema).optional(),
  items: z.array(tabmeItemSchema).optional(),
}).passthrough()
const tabmeSpaceSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  folders: z.array(tabmeFolderSchema).optional(),
  collections: z.array(tabmeFolderSchema).optional(),
  bookmarks: z.array(tabmeItemSchema).optional(),
  tabs: z.array(tabmeItemSchema).optional(),
  items: z.array(tabmeItemSchema).optional(),
}).passthrough()

function normalizeTabmeItems(rawItems: TabmeItem[], counter: { skipped: number }): ImportedTab[] {
  return rawItems.flatMap((rawItem) => {
    const nestedTabs = normalizeTabmeItems(rawItem.groupItems ?? [], counter)
    if (!rawItem.url) return nestedTabs

    const tab = safeTab(rawItem.url, rawItem.title ?? rawItem.name)
    if (!tab) counter.skipped += 1
    return tab ? [tab, ...nestedTabs] : nestedTabs
  })
}

function parseTabme(input: unknown): ImportPreview {
  const root = recordSchema.safeParse(input)
  if (!root.success || !Array.isArray(root.data.spaces)) {
    throw new Error('The selected file is not a Tabme backup')
  }
  const counter = { skipped: 0 }
  const spaces = root.data.spaces.flatMap((rawSpace, spaceIndex) => {
    const space = tabmeSpaceSchema.safeParse(rawSpace)
    if (!space.success) return []
    const folders = space.data.folders ?? space.data.collections ?? []
    const groups: ImportedGroup[] = folders.map((folder, folderIndex) => ({
      name: folder.name?.trim() || folder.title?.trim() || `Folder ${folderIndex + 1}`,
      ...(folder.color ? { color: folder.color } : {}),
      tabs: normalizeTabmeItems(folder.bookmarks ?? folder.tabs ?? folder.items ?? [], counter),
    }))
    return [{
      name: space.data.name?.trim() || space.data.title?.trim() || `Tabme Space ${spaceIndex + 1}`,
      emoji: '📥',
      groups,
      ungroupedTabs: normalizeTabmeItems(
        space.data.bookmarks ?? space.data.tabs ?? space.data.items ?? [],
        counter,
      ),
    }]
  })
  if (!spaces.length) throw new Error('The Tabme backup contains no spaces')
  return {
    provider: 'tabme',
    spaces,
    skippedRecords: counter.skipped,
    warnings: counter.skipped ? [`Skipped ${counter.skipped} invalid or unsupported URLs.`] : [],
  }
}

function parseTabSpace(input: unknown): ImportPreview {
  const backup = backupSchema.parse(input)
  return {
    provider: 'tabspace',
    spaces: backup.spaces.map((space) => ({
      name: space.name,
      emoji: space.emoji,
      color: space.color,
      groups: space.groups.map((group) => ({ name: group.name, color: group.color, tabs: group.tabs })),
      ungroupedTabs: space.ungroupedTabs,
    })),
    skippedRecords: 0,
    warnings: [],
  }
}

export function parseImport(provider: ImportProvider, input: unknown): ImportPreview {
  if (provider === 'toby') return parseToby(input)
  if (provider === 'tabme') return parseTabme(input)
  return parseTabSpace(input)
}
