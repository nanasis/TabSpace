import { z } from 'zod'

import type { TabSpaceDocument } from '../model/document'

const backupTabSchema = z.object({
  title: z.string(),
  url: z.string(),
  alias: z.string().optional(),
  avatarEmoji: z.string().optional(),
  avatarImage: z.string().startsWith('data:image/').max(262144).optional(),
  faviconUrl: z.string().max(8192).optional(),
}).strict()
const backupGroupSchema = z.object({
  name: z.string(),
  color: z.string(),
  tabs: z.array(backupTabSchema),
}).strict()
const backupSpaceSchema = z.object({
  name: z.string(),
  emoji: z.string(),
  color: z.string(),
  groups: z.array(backupGroupSchema),
  ungroupedTabs: z.array(backupTabSchema),
}).strict()

export const backupSchema = z.object({
  format: z.literal('tabspace-backup'),
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime({ offset: true }),
  spaces: z.array(backupSpaceSchema).min(1),
}).strict()

export type TabSpaceBackup = z.infer<typeof backupSchema>

function backupTab(tab: TabSpaceDocument['tabs'][number]) {
  return {
    title: tab.title,
    url: tab.url,
    ...(tab.alias ? { alias: tab.alias } : {}),
    ...(tab.avatarEmoji ? { avatarEmoji: tab.avatarEmoji } : {}),
    ...(tab.avatarImage ? { avatarImage: tab.avatarImage } : {}),
    ...(tab.faviconUrl ? { faviconUrl: tab.faviconUrl } : {}),
  }
}

export function createBackup(document: TabSpaceDocument, exportedAt = new Date().toISOString()) {
  return backupSchema.parse({
    format: 'tabspace-backup',
    schemaVersion: 1,
    exportedAt,
    spaces: [...document.spaces]
      .sort((left, right) => left.order - right.order)
      .map((space) => ({
        name: space.name,
        emoji: space.emoji,
        color: space.color,
        groups: document.groups
          .filter(({ spaceId }) => spaceId === space.id)
          .sort((left, right) => left.order - right.order)
          .map((group) => ({
            name: group.name,
            color: group.color,
            tabs: document.tabs
              .filter(({ groupId }) => groupId === group.id)
              .sort((left, right) => left.order - right.order)
              .map(backupTab),
          })),
        ungroupedTabs: document.tabs
          .filter((tab) => tab.spaceId === space.id && tab.groupId === undefined)
          .sort((left, right) => left.order - right.order)
          .map(backupTab),
      })),
  })
}
