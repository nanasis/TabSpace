export interface BrowserTab {
  id?: number
  windowId?: number
  url?: string
}

export interface DashboardBrowser {
  getDashboardUrl(): string
  queryTabs(): Promise<BrowserTab[]>
  focusWindow(windowId: number): Promise<void>
  activateTab(tabId: number): Promise<void>
  createTab(url: string): Promise<void>
}

function isDashboardUrl(candidateUrl: string | undefined, dashboardUrl: string) {
  if (!candidateUrl) {
    return false
  }

  try {
    const candidate = new URL(candidateUrl)
    const dashboard = new URL(dashboardUrl)

    return (
      candidate.protocol === dashboard.protocol &&
      candidate.host === dashboard.host &&
      candidate.pathname === dashboard.pathname
    )
  } catch {
    return false
  }
}

export async function openOrFocusDashboard(browser: DashboardBrowser) {
  const dashboardUrl = browser.getDashboardUrl()
  let tabs: BrowserTab[]

  try {
    tabs = await browser.queryTabs()
  } catch {
    await browser.createTab(dashboardUrl)
    return
  }

  const dashboardTab = tabs.find(
    (tab) =>
      typeof tab.id === 'number' &&
      typeof tab.windowId === 'number' &&
      isDashboardUrl(tab.url, dashboardUrl),
  )

  if (dashboardTab?.id !== undefined && dashboardTab.windowId !== undefined) {
    try {
      await browser.focusWindow(dashboardTab.windowId)
      await browser.activateTab(dashboardTab.id)
      return
    } catch {
      // The tab or window may have closed after the query. Open a fresh dashboard.
    }
  }

  await browser.createTab(dashboardUrl)
}
