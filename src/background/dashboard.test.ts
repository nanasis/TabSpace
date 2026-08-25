import { describe, expect, it, vi } from 'vitest'

import { type DashboardBrowser, openOrFocusDashboard } from './dashboard'

function createBrowser(overrides: Partial<DashboardBrowser> = {}): DashboardBrowser {
  return {
    getDashboardUrl: () => 'chrome-extension://tabspace/index.html',
    queryTabs: vi.fn().mockResolvedValue([]),
    focusWindow: vi.fn().mockResolvedValue(undefined),
    activateTab: vi.fn().mockResolvedValue(undefined),
    createTab: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('openOrFocusDashboard', () => {
  it('focuses an existing dashboard tab', async () => {
    const browser = createBrowser({
      queryTabs: vi.fn().mockResolvedValue([
        { id: 4, windowId: 2, url: 'https://example.com' },
        { id: 7, windowId: 3, url: 'chrome-extension://tabspace/index.html#open' },
      ]),
    })

    await openOrFocusDashboard(browser)

    expect(browser.focusWindow).toHaveBeenCalledWith(3)
    expect(browser.activateTab).toHaveBeenCalledWith(7)
    expect(browser.createTab).not.toHaveBeenCalled()
  })

  it('creates the dashboard when one is not open', async () => {
    const browser = createBrowser()

    await openOrFocusDashboard(browser)

    expect(browser.createTab).toHaveBeenCalledWith('chrome-extension://tabspace/index.html')
  })

  it('creates a fresh dashboard when the queried tab becomes stale', async () => {
    const browser = createBrowser({
      queryTabs: vi
        .fn()
        .mockResolvedValue([{ id: 7, windowId: 3, url: 'chrome-extension://tabspace/index.html' }]),
      activateTab: vi.fn().mockRejectedValue(new Error('No tab with id: 7')),
    })

    await openOrFocusDashboard(browser)

    expect(browser.createTab).toHaveBeenCalledWith('chrome-extension://tabspace/index.html')
  })

  it('falls back to creating the dashboard when tab discovery fails', async () => {
    const browser = createBrowser({
      queryTabs: vi.fn().mockRejectedValue(new Error('Tab query failed')),
    })

    await openOrFocusDashboard(browser)

    expect(browser.createTab).toHaveBeenCalledWith('chrome-extension://tabspace/index.html')
  })
})
