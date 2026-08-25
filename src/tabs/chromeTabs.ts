import type { BrowserTabSnapshot } from './reconcileTabs'

export class BrowserTabError extends Error {
  constructor(action: string, options?: ErrorOptions) {
    super(`Chrome could not ${action} the tab`, options)
    this.name = 'BrowserTabError'
  }
}

function toSnapshot(tab: chrome.tabs.Tab): BrowserTabSnapshot | undefined {
  if (tab.id === undefined) {
    return undefined
  }

  return {
    id: tab.id,
    url: tab.url ?? tab.pendingUrl ?? '',
    title: tab.title ?? 'Untitled tab',
    ...(tab.favIconUrl ? { faviconUrl: tab.favIconUrl } : {}),
    pinned: tab.pinned,
    active: tab.active,
    lastAccessed: tab.lastAccessed,
  }
}

export async function queryBrowserTabs() {
  const tabs = await chrome.tabs.query({})
  return tabs.flatMap((tab) => {
    const snapshot = toSnapshot(tab)
    return snapshot ? [snapshot] : []
  })
}

export async function activateBrowserTab(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true })
    }
    await chrome.tabs.update(tabId, { active: true })
  } catch (error) {
    throw new BrowserTabError('activate', { cause: error })
  }
}

export async function closeBrowserTab(tabId: number) {
  try {
    await chrome.tabs.remove(tabId)
  } catch (error) {
    throw new BrowserTabError('close', { cause: error })
  }
}

export async function setBrowserTabPinned(tabId: number, pinned: boolean) {
  try {
    await chrome.tabs.update(tabId, { pinned })
  } catch (error) {
    throw new BrowserTabError(pinned ? 'pin' : 'unpin', { cause: error })
  }
}
