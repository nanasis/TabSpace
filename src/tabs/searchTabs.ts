import type { TabRecord } from '../model/document'

export function searchTabs(tabs: TabRecord[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return tabs

  return tabs.filter((tab) => {
    let domain = ''
    try {
      domain = new URL(tab.url).hostname
    } catch {
      // Restricted and incomplete browser URLs remain searchable by their raw URL.
    }

    return [tab.alias, tab.title, domain, tab.url].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery),
    )
  })
}
