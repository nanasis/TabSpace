import { z } from 'zod'

export const TABSPACE_SCHEMA_VERSION = 1 as const
export const DEFAULT_SPACE_COLOR = '#8b5cf6'

const idSchema = z.string().trim().min(1).max(128)
const timestampSchema = z.iso.datetime({ offset: true })
const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)
const orderSchema = z.number().int().nonnegative()

export const spaceSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(80),
    emoji: z.string().trim().min(1).max(16),
    color: colorSchema,
    order: orderSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const groupSchema = z
  .object({
    id: idSchema,
    spaceId: idSchema,
    name: z.string().trim().min(1).max(80),
    color: colorSchema,
    order: orderSchema,
    collapsed: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const tabRecordSchema = z
  .object({
    id: idSchema,
    chromeTabId: z.number().int().nonnegative().optional(),
    spaceId: idSchema,
    groupId: idSchema.optional(),
    url: z.string().max(8192),
    title: z.string().max(4096),
    faviconUrl: z.string().max(8192).optional(),
    alias: z.string().trim().min(1).max(512).optional(),
    avatarEmoji: z.string().trim().min(1).max(16).optional(),
    pinned: z.boolean(),
    order: orderSchema,
    lastAccessedAt: timestampSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

export const settingsSchema = z
  .object({
    activeSpaceId: idSchema,
  })
  .strict()

export const syncMetadataSchema = z
  .object({
    gistId: z.string().trim().min(1).max(256).optional(),
    lastSyncedAt: timestampSchema.optional(),
    lastKnownRevision: z.string().trim().min(1).max(512).optional(),
  })
  .strict()

const documentShape = {
  spaces: z.array(spaceSchema).min(1),
  groups: z.array(groupSchema),
  tabs: z.array(tabRecordSchema),
  settings: settingsSchema,
  sync: syncMetadataSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}

function addDocumentIntegrityIssues(
  document: {
    spaces: z.infer<typeof spaceSchema>[]
    groups: z.infer<typeof groupSchema>[]
    tabs: z.infer<typeof tabRecordSchema>[]
    settings: z.infer<typeof settingsSchema>
  },
  context: z.RefinementCtx,
) {
  const spaceIds = new Set<string>()
  const groupIds = new Set<string>()
  const tabIds = new Set<string>()

  document.spaces.forEach((space, index) => {
    if (spaceIds.has(space.id)) {
      context.addIssue({ code: 'custom', message: 'Space IDs must be unique', path: ['spaces', index, 'id'] })
    }
    spaceIds.add(space.id)
  })

  document.groups.forEach((group, index) => {
    if (groupIds.has(group.id)) {
      context.addIssue({ code: 'custom', message: 'Group IDs must be unique', path: ['groups', index, 'id'] })
    }
    groupIds.add(group.id)

    if (!spaceIds.has(group.spaceId)) {
      context.addIssue({ code: 'custom', message: 'Group must reference an existing space', path: ['groups', index, 'spaceId'] })
    }
  })

  document.tabs.forEach((tab, index) => {
    if (tabIds.has(tab.id)) {
      context.addIssue({ code: 'custom', message: 'Tab IDs must be unique', path: ['tabs', index, 'id'] })
    }
    tabIds.add(tab.id)

    if (!spaceIds.has(tab.spaceId)) {
      context.addIssue({ code: 'custom', message: 'Tab must reference an existing space', path: ['tabs', index, 'spaceId'] })
    }

    if (tab.groupId) {
      const group = document.groups.find(({ id }) => id === tab.groupId)
      if (!group || group.spaceId !== tab.spaceId) {
        context.addIssue({
          code: 'custom',
          message: 'Tab group must exist in the same space',
          path: ['tabs', index, 'groupId'],
        })
      }
    }
  })

  if (!spaceIds.has(document.settings.activeSpaceId)) {
    context.addIssue({
      code: 'custom',
      message: 'Active space must reference an existing space',
      path: ['settings', 'activeSpaceId'],
    })
  }
}

export const tabSpaceDocumentSchema = z
  .object({
    schemaVersion: z.literal(TABSPACE_SCHEMA_VERSION),
    ...documentShape,
  })
  .strict()
  .superRefine(addDocumentIntegrityIssues)

const legacyDocumentSchema = z
  .object({
    schemaVersion: z.literal(0),
    spaces: documentShape.spaces,
    groups: documentShape.groups,
    tabs: documentShape.tabs,
    settings: documentShape.settings,
    createdAt: documentShape.createdAt,
    updatedAt: documentShape.updatedAt,
  })
  .strict()
  .superRefine(addDocumentIntegrityIssues)

export type Space = z.infer<typeof spaceSchema>
export type Group = z.infer<typeof groupSchema>
export type TabRecord = z.infer<typeof tabRecordSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SyncMetadata = z.infer<typeof syncMetadataSchema>
export type TabSpaceDocument = z.infer<typeof tabSpaceDocumentSchema>

export interface DocumentFactoryOptions {
  now?: () => string
  createId?: () => string
}

export interface DocumentMigrationResult {
  document: TabSpaceDocument
  migrated: boolean
}

export class UnsupportedDocumentVersionError extends Error {
  constructor(version: unknown) {
    super(`Unsupported TabSpace document version: ${String(version)}`)
    this.name = 'UnsupportedDocumentVersionError'
  }
}

export function createDefaultDocument(options: DocumentFactoryOptions = {}): TabSpaceDocument {
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const spaceId = (options.createId ?? (() => crypto.randomUUID()))()

  return tabSpaceDocumentSchema.parse({
    schemaVersion: TABSPACE_SCHEMA_VERSION,
    spaces: [
      {
        id: spaceId,
        name: 'My Space',
        emoji: '✨',
        color: DEFAULT_SPACE_COLOR,
        order: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    groups: [],
    tabs: [],
    settings: { activeSpaceId: spaceId },
    sync: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export function migrateDocument(input: unknown): DocumentMigrationResult {
  const version =
    typeof input === 'object' && input !== null && 'schemaVersion' in input
      ? input.schemaVersion
      : undefined

  if (version === TABSPACE_SCHEMA_VERSION) {
    return { document: tabSpaceDocumentSchema.parse(input), migrated: false }
  }

  if (version === 0) {
    const legacyDocument = legacyDocumentSchema.parse(input)
    return {
      document: tabSpaceDocumentSchema.parse({
        ...legacyDocument,
        schemaVersion: TABSPACE_SCHEMA_VERSION,
        sync: {},
      }),
      migrated: true,
    }
  }

  throw new UnsupportedDocumentVersionError(version)
}
