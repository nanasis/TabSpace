import { Globe2, Layers3, Pin, Rows3, X } from 'lucide-react'
import { memo, useMemo, useState } from 'react'

import type { TabSpaceDocument } from '../model/document'
import { activateBrowserTab, closeBrowserTab } from '../tabs/chromeTabs'
import { writeTabDragPayload } from '../tabs/tabDrag'

export interface SidebarProps {
  document?: TabSpaceDocument
  currentWindowId?: number
  onActionError(message: string): void
}

type TabView = 'open' | 'pinned'

export const Sidebar = memo(function Sidebar({ document, currentWindowId, onActionError }: SidebarProps) {
  const [view, setView] = useState<TabView>('open')
  const openTabs = useMemo(
    () =>
      document?.tabs.filter(
        ({ chromeTabId, windowId }) =>
          chromeTabId !== undefined &&
          (currentWindowId === undefined || windowId === undefined || windowId === currentWindowId),
      ) ?? [],
    [currentWindowId, document?.tabs],
  )
  const visibleTabs = view === 'pinned' ? openTabs.filter(({ pinned }) => pinned) : openTabs

  async function activate(tabId: number | undefined) {
    if (tabId === undefined) {
      onActionError('That saved tab is not currently open.')
      return
    }

    try {
      await activateBrowserTab(tabId)
    } catch {
      onActionError('Chrome could not activate that tab. It may have been closed.')
    }
  }

  async function close(tabId: number | undefined) {
    if (tabId === undefined) return
    try {
      await closeBrowserTab(tabId)
    } catch {
      onActionError('Chrome could not close that tab. It may already be closed.')
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/8 bg-[#101015] lg:flex">
      <div className="flex h-18 items-center gap-3 border-b border-white/8 px-6">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
          <Layers3 className="size-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight">TabSpace</h1>
            <span className="rounded border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-300">
              v1
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Focused tab workspace</p>
        </div>
      </div>

      <nav className="border-b border-white/8 p-3" aria-label="Tab views">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
          <button
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs transition ${view === 'open' ? 'bg-white/8 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setView('open')}
            type="button"
          >
            <Rows3 className="size-3.5" /> Open <span className="text-zinc-500">{openTabs.length}</span>
          </button>
          <button
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs transition ${view === 'pinned' ? 'bg-white/8 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            onClick={() => setView('pinned')}
            type="button"
          >
            <Pin className="size-3.5" /> Pinned{' '}
            <span className="text-zinc-500">{openTabs.filter(({ pinned }) => pinned).length}</span>
          </button>
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between px-2">
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Current window
          </p>
          <span className="font-mono text-[10px] text-zinc-700">{visibleTabs.length}</span>
        </div>
        <div className="mt-2 space-y-1">
          {visibleTabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex w-full cursor-grab items-center gap-1 rounded-lg px-1 py-1 text-left transition hover:bg-white/5 active:cursor-grabbing ${tab.active ? 'bg-violet-400/8 text-white' : 'text-zinc-400'}`}
              onDragStart={(event) =>
                writeTabDragPayload(event.dataTransfer, { tabId: tab.id, source: 'sidebar' })
              }
              draggable
              title="Drag to a group in the workspace"
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1 text-left"
                onClick={() => void activate(tab.chromeTabId)}
                type="button"
              >
                <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5 text-zinc-500">
                  {tab.avatarImage ? (
                    <img className="size-full object-cover" src={tab.avatarImage} alt="" loading="lazy" decoding="async" />
                  ) : tab.avatarEmoji ? (
                    <span className="text-sm">{tab.avatarEmoji}</span>
                  ) : tab.faviconUrl ? (
                    <img className="size-4" src={tab.faviconUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <Globe2 className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs">{tab.alias ?? tab.title}</span>
                {tab.pinned ? <Pin className="size-3 shrink-0 text-violet-400" aria-label="Pinned" /> : null}
              </button>
              <button
                className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-700 opacity-0 transition hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                onClick={() => void close(tab.chromeTabId)}
                aria-label={`Close ${tab.alias ?? tab.title}`}
                title="Close this Chrome tab"
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {!visibleTabs.length ? (
            <div className="px-3 py-10 text-center text-xs leading-5 text-zinc-600">
              {view === 'pinned' ? 'No pinned tabs in this space.' : 'Open a tab to see it here.'}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/8 p-4 font-mono text-[10px] text-zinc-600">
        {document
          ? `${openTabs.length} open tabs · ${openTabs.filter(({ pinned }) => pinned).length} pinned · current window`
          : 'Loading local workspace…'}
      </div>
    </aside>
  )
})
