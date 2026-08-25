import { expect, test } from '@playwright/test'

const timestamp = '2026-08-25T12:00:00.000Z'
const document = {
  schemaVersion: 1,
  spaces: [{ id: 'space-1', name: 'My Space', emoji: '✨', color: '#8b5cf6', order: 0, createdAt: timestamp, updatedAt: timestamp }],
  groups: [{ id: 'group-1', spaceId: 'space-1', name: 'Daily Work', color: '#8b5cf6', order: 0, collapsed: false, createdAt: timestamp, updatedAt: timestamp }],
  tabs: [
    { id: 'tab-1', chromeTabId: 10, spaceId: 'space-1', groupId: 'group-1', url: 'https://github.com/nanasis/TabSpace', title: 'TabSpace · GitHub', alias: 'GitHub', pinned: true, active: true, order: 0, lastAccessedAt: timestamp, createdAt: timestamp, updatedAt: timestamp },
    { id: 'tab-2', chromeTabId: 11, spaceId: 'space-1', groupId: 'group-1', url: 'https://www.figma.com/', title: 'Figma', pinned: false, active: false, order: 1, lastAccessedAt: timestamp, createdAt: timestamp, updatedAt: timestamp },
    { id: 'tab-3', chromeTabId: 12, spaceId: 'space-1', url: 'https://www.typescriptlang.org/docs/', title: 'TypeScript Documentation', pinned: false, active: false, order: 0, lastAccessedAt: timestamp, createdAt: timestamp, updatedAt: timestamp },
  ],
  settings: { activeSpaceId: 'space-1', cardDensity: 'comfortable' },
  sync: {},
  createdAt: timestamp,
  updatedAt: timestamp,
}

const backup = {
  format: 'tabspace-backup',
  schemaVersion: 1,
  exportedAt: timestamp,
  spaces: [{ name: 'Imported', emoji: '📥', color: '#8b5cf6', groups: [], ungroupedTabs: [{ title: 'Example', url: 'https://example.com/' }] }],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((initialDocument) => {
    const local: Record<string, unknown> = { 'tabspace.document': initialDocument }
    const session: Record<string, unknown> = {}
    const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
    const chromeApi = {
      storage: {
          local: {
            get: async (key: string) => ({ [key]: local[key] }),
            set: async (updates: Record<string, unknown>) => {
              Object.assign(local, updates)
              const changes = Object.fromEntries(Object.entries(updates).map(([key, newValue]) => [key, { newValue }]))
              listeners.forEach((listener) => listener(changes, 'local'))
            },
          },
          session: {
            get: async (key: string) => ({ [key]: session[key] }),
            set: async (updates: Record<string, unknown>) => Object.assign(session, updates),
            remove: async (key: string) => { delete session[key] },
          },
          onChanged: {
            addListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => listeners.add(listener),
            removeListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => listeners.delete(listener),
          },
      },
      tabs: {
        query: async () => [],
        create: async () => ({}),
        get: async () => ({}),
        update: async () => ({}),
        remove: async () => undefined,
      },
      windows: { update: async () => ({}) },
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
    }
    Object.assign(globalThis.chrome, chromeApi)
  }, document)
})

test('opens settings, persists density, and previews a backup import', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'My Space' })).toBeVisible()
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true })

  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await page.getByText('compact', { exact: true }).click()
  await page.getByRole('button', { name: 'Import or export data' }).click()

  await expect(page.getByRole('dialog', { name: 'Import & export' })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'tabspace-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })
  await expect(page.getByText(/Ready to import 1 spaces, 0 groups, and 1 tabs/)).toBeVisible()
})
