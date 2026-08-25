import { openOrFocusDashboard, type DashboardBrowser } from './background/dashboard'
import { createChromeDocumentRepository } from './storage/documentRepository'
import { queryBrowserTabs } from './tabs/chromeTabs'
import { reconcileTabs, replaceChromeTabId } from './tabs/reconcileTabs'

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

const documentRepository = createChromeDocumentRepository()
let dashboardTask: Promise<void> | undefined
let tabSyncTimer: ReturnType<typeof setTimeout> | undefined
let tabSyncTask = Promise.resolve()

function reportRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown browser API error'
  console.error(`TabSpace could not open the dashboard: ${message}`)
}

async function synchronizeTabs() {
  const document = await documentRepository.load()
  const tabs = await queryBrowserTabs()
  const result = reconcileTabs(document, tabs, {
    dashboardUrl: chrome.runtime.getURL('index.html'),
  })

  if (result.changed) {
    await documentRepository.save(result.document)
  }
}

function reportTabSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown tab synchronization error'
  console.error(`TabSpace could not synchronize tabs: ${message}`)
}

function scheduleTabSync(delay = 100) {
  if (tabSyncTimer) {
    clearTimeout(tabSyncTimer)
  }

  tabSyncTimer = setTimeout(() => {
    tabSyncTimer = undefined
    tabSyncTask = tabSyncTask.then(synchronizeTabs).catch(reportTabSyncError)
  }, delay)
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

chrome.tabs.onCreated.addListener(() => scheduleTabSync())
chrome.tabs.onUpdated.addListener(() => scheduleTabSync())
chrome.tabs.onActivated.addListener(() => scheduleTabSync())
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  tabSyncTask = tabSyncTask
    .then(async () => {
      const document = await documentRepository.load()
      const result = replaceChromeTabId(document, removedTabId, addedTabId)
      if (result.changed) {
        await documentRepository.save(result.document)
      }
      await synchronizeTabs()
    })
    .catch(reportTabSyncError)
})
chrome.tabs.onMoved.addListener(() => scheduleTabSync())
chrome.tabs.onRemoved.addListener(() => scheduleTabSync())

chrome.runtime.onInstalled.addListener(({ reason }) => {
  void documentRepository
    .load()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown storage error'
      console.error(`TabSpace could not initialize local storage: ${message}`)
    })
    .finally(() => {
      if (reason === 'install') {
        void scheduleDashboard()
      }
    })
})

scheduleTabSync(0)
