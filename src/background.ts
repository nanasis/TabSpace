import { openOrFocusDashboard, type DashboardBrowser } from './background/dashboard'

const browser: DashboardBrowser = {
  getDashboardUrl: () => chrome.runtime.getURL('index.html'),
  queryTabs: () => chrome.tabs.query({}),
  focusWindow: async (windowId) => {
    await chrome.windows.update(windowId, { focused: true })
  },
  activateTab: async (tabId) => {
    await chrome.tabs.update(tabId, { active: true })
  },
  createTab: async (url) => {
    await chrome.tabs.create({ url })
  },
}

let dashboardTask: Promise<void> | undefined

function reportRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown browser API error'
  console.error(`TabSpace could not open the dashboard: ${message}`)
}

function scheduleDashboard() {
  if (dashboardTask) {
    return dashboardTask
  }

  dashboardTask = openOrFocusDashboard(browser)
    .catch(reportRuntimeError)
    .finally(() => {
      dashboardTask = undefined
    })

  return dashboardTask
}

chrome.action.onClicked.addListener(() => {
  void scheduleDashboard()
})

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    void scheduleDashboard()
  }
})
