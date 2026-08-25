import type { TabSpaceDocument } from '../model/document'

export interface ExportFile {
  filename: string
  mimeType: string
  contents: string
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function groupedTabs(document: TabSpaceDocument) {
  return [...document.spaces].sort((a, b) => a.order - b.order).map((space) => ({
    space,
    groups: [...document.groups]
      .filter(({ spaceId }) => spaceId === space.id)
      .sort((a, b) => a.order - b.order)
      .map((group) => ({ group, tabs: document.tabs.filter(({ groupId }) => groupId === group.id) })),
    ungrouped: document.tabs.filter((tab) => tab.spaceId === space.id && !tab.groupId),
  }))
}

export function createBookmarksHtml(document: TabSpaceDocument): ExportFile {
  const folders = groupedTabs(document).map(({ space, groups, ungrouped }) => {
    const groupHtml = groups.map(({ group, tabs }) => `    <DT><H3>${escapeHtml(group.name)}</H3>\n    <DL><p>\n${tabs.map((tab) => `      <DT><A HREF="${escapeHtml(tab.url)}">${escapeHtml(tab.alias ?? tab.title)}</A>`).join('\n')}\n    </DL><p>`).join('\n')
    const ungroupedHtml = ungrouped.map((tab) => `    <DT><A HREF="${escapeHtml(tab.url)}">${escapeHtml(tab.alias ?? tab.title)}</A>`).join('\n')
    return `  <DT><H3>${escapeHtml(`${space.emoji} ${space.name}`)}</H3>\n  <DL><p>\n${groupHtml}\n${ungroupedHtml}\n  </DL><p>`
  }).join('\n')
  return {
    filename: 'tabspace-bookmarks.html',
    mimeType: 'text/html',
    contents: `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>TabSpace Bookmarks</TITLE>\n<H1>TabSpace Bookmarks</H1>\n<DL><p>\n${folders}\n</DL><p>\n`,
  }
}

export function createOneTabText(document: TabSpaceDocument): ExportFile {
  const contents = groupedTabs(document).flatMap(({ space, groups, ungrouped }) => [
    `# ${space.emoji} ${space.name}`,
    ...groups.flatMap(({ group, tabs }) => [
      `# ${group.name}`,
      ...tabs.map((tab) => `${tab.url} | ${tab.alias ?? tab.title}`),
      '',
    ]),
    ...(ungrouped.length ? ['# Ungrouped', ...ungrouped.map((tab) => `${tab.url} | ${tab.alias ?? tab.title}`), ''] : []),
  ]).join('\n')
  return { filename: 'tabspace-onetab.txt', mimeType: 'text/plain', contents }
}

export function createMarkdown(document: TabSpaceDocument): ExportFile {
  const sections = groupedTabs(document).map(({ space, groups, ungrouped }) => {
    const groupSections = groups.map(({ group, tabs }) => `### ${group.name}\n\n${tabs.map((tab) => `- [${tab.alias ?? tab.title}](${tab.url})`).join('\n')}`).join('\n\n')
    const ungroupedSection = ungrouped.length ? `### Ungrouped\n\n${ungrouped.map((tab) => `- [${tab.alias ?? tab.title}](${tab.url})`).join('\n')}` : ''
    return `## ${space.emoji} ${space.name}\n\n${[groupSections, ungroupedSection].filter(Boolean).join('\n\n')}`
  }).join('\n\n')
  return { filename: 'tabspace-tabs.md', mimeType: 'text/markdown', contents: `# TabSpace Export\n\n${sections}\n` }
}

export function downloadFile(file: ExportFile) {
  const url = URL.createObjectURL(new Blob([file.contents], { type: file.mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename
  anchor.click()
  URL.revokeObjectURL(url)
}
