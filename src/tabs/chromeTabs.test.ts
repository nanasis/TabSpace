import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  activateBrowserTab,
  BrowserTabError,
  closeBrowserTab,
  queryBrowserTabs,
  setBrowserTabPinned,
} from './chromeTabs'

afterEach(() => vi.unstubAllGlobals())

function mockChrome() {
  const tabs = {
    query: vi.fn().mockResolvedValue([{ id: 4, url: 'https://example.com', title: 'Example', pinned: false, active: true, windowId: 2 }]),
    get: vi.fn().mockResolvedValue({ id: 4, windowId: 2 }),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({}),
  }
  const windows = { update: vi.fn().mockResolvedValue({}) }
  vi.stubGlobal('chrome', { tabs, windows })
  return { tabs, windows }
}

describe('Chrome tab boundary', () => {
  it('maps queried tabs and focuses a tab window before activation', async () => {
    const { tabs, windows } = mockChrome()

    await expect(queryBrowserTabs()).resolves.toEqual([
      expect.objectContaining({ id: 4, url: 'https://example.com', active: true }),
    ])
    await activateBrowserTab(4)

    expect(windows.update).toHaveBeenCalledWith(2, { focused: true })
    expect(tabs.update).toHaveBeenCalledWith(4, { active: true })
  })

  it('closes and pins through Chrome APIs', async () => {
    const { tabs } = mockChrome()

    await closeBrowserTab(4)
    await setBrowserTabPinned(4, true)

    expect(tabs.remove).toHaveBeenCalledWith(4)
    expect(tabs.update).toHaveBeenCalledWith(4, { pinned: true })
  })

  it('converts Chrome failures into safe action errors', async () => {
    const { tabs } = mockChrome()
    tabs.remove.mockRejectedValue(new Error('sensitive browser detail'))

    await expect(closeBrowserTab(4)).rejects.toEqual(
      expect.objectContaining<Partial<BrowserTabError>>({ message: 'Chrome could not close the tab' }),
    )
  })
})
