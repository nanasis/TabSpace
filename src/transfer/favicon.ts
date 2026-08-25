export function faviconForImportedTab(pageUrl: string | URL, rawFaviconUrl?: string) {
  const parsedPageUrl = typeof pageUrl === 'string' ? new URL(pageUrl) : pageUrl

  if (rawFaviconUrl) {
    if (rawFaviconUrl.startsWith('data:image/') && rawFaviconUrl.length <= 8192) {
      return rawFaviconUrl
    }
    try {
      const faviconUrl = new URL(rawFaviconUrl)
      if (['http:', 'https:'].includes(faviconUrl.protocol) && faviconUrl.href.length <= 8192) {
        return faviconUrl.href
      }
    } catch {
      // Fall back to the conventional favicon location for the imported page.
    }
  }

  return ['http:', 'https:'].includes(parsedPageUrl.protocol)
    ? new URL('/favicon.ico', parsedPageUrl.origin).href
    : undefined
}
