import { Check, Globe2, Pencil, Pin, PinOff, X } from 'lucide-react'
import { memo, useState, type MouseEvent } from 'react'

import type { TabRecord, TabSpaceDocument } from '../model/document'
import { updateTab } from '../model/tabOperations'
import {
  activateBrowserTab,
  openBrowserTab,
  setBrowserTabPinned,
} from '../tabs/chromeTabs'
import { writeTabDragPayload } from '../tabs/tabDrag'
import { EditTabDialog, type EditTabValues } from './EditTabDialog'

export interface TabCardProps {
  tab: TabRecord
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
  onDeleteCard(tabId: string): void
  selected?: boolean
  onSelect?(tabId: string, event: MouseEvent<HTMLButtonElement>): void
  dense?: boolean
}

function domainFor(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname || parsed.protocol.replace(':', '')
  } catch {
    return 'browser tab'
  }
}

function relativeAccess(timestamp: string) {
  const elapsed = Date.now() - Date.parse(timestamp)
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return 'now'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export const TabCard = memo(function TabCard({
  tab,
  updateDocument,
  onError,
  onDeleteCard,
  selected,
  onSelect,
  dense,
}: TabCardProps) {
  const [editing, setEditing] = useState(false)

  async function open() {
    try {
      if (tab.chromeTabId === undefined) await openBrowserTab(tab.url)
      else await activateBrowserTab(tab.chromeTabId)
    } catch {
      onError('Chrome could not open that tab.')
    }
  }

  async function togglePinned() {
    if (tab.chromeTabId === undefined) {
      onError('Open this saved tab before pinning it.')
      return
    }
    try {
      await setBrowserTabPinned(tab.chromeTabId, !tab.pinned)
      await updateDocument((current) => updateTab(current, tab.id, { pinned: !tab.pinned }))
    } catch {
      onError('Chrome could not change the pinned state.')
    }
  }

  function saveEdits(values: EditTabValues) {
    void updateDocument((current) => updateTab(current, tab.id, values)).catch(() =>
      onError('TabSpace could not save the tab card changes.'),
    )
    setEditing(false)
  }

  return (
    <>
    <article
      className={`group relative min-w-0 cursor-grab rounded-xl border bg-[#15151b] p-3.5 transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-[#181820] active:cursor-grabbing ${selected ? 'border-violet-400/60 ring-1 ring-violet-400/30' : tab.active ? 'border-violet-400/35 shadow-lg shadow-violet-950/10' : 'border-white/8'}`}
      data-density={dense ? 'dense' : 'compact'}
      draggable
      onDragStart={(event) =>
        writeTabDragPayload(event.dataTransfer, { tabId: tab.id, source: 'card' })
      }
      title="Drag this card to another group"
    >
      {onSelect ? (
        <button
          className={`absolute -left-2 -top-2 z-10 grid size-5 place-items-center rounded-md border transition ${selected ? 'border-violet-400 bg-violet-500 text-white' : 'border-white/15 bg-[#1b1b23] text-transparent opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
          onClick={(event) => onSelect(tab.id, event)}
          aria-label={`${selected ? 'Deselect' : 'Select'} ${tab.alias ?? tab.title}`}
          aria-pressed={selected}
          type="button"
        >
          <Check className="size-3" />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <button className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5" onClick={() => setEditing(true)} aria-label={`Edit icon for ${tab.alias ?? tab.title}`} title="Edit the card alias and icon" type="button">
          {tab.avatarImage ? <img className="size-full object-cover" src={tab.avatarImage} alt="" loading="lazy" decoding="async" /> : tab.avatarEmoji ? <span className="text-lg">{tab.avatarEmoji}</span> : tab.faviconUrl ? <img className="size-5" src={tab.faviconUrl} alt="" loading="lazy" decoding="async" /> : <Globe2 className="size-4 text-zinc-600" />}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => void open()} title="Open or activate this tab" type="button">
          <span className="block truncate text-sm font-medium text-zinc-200">{tab.alias ?? tab.title}</span>
          <span className="mt-1 block truncate text-xs text-zinc-600">{domainFor(tab.url)}</span>
        </button>
        <button
          className="text-zinc-700 opacity-0 transition hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
          onClick={() => onDeleteCard(tab.id)}
          aria-label={`Delete ${tab.alias ?? tab.title} card`}
          title="Delete this bookmark card without closing the browser tab"
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {tab.active ? <span className="rounded bg-emerald-400/10 px-1.5 py-1 font-mono text-[8px] text-emerald-300">ACTIVE</span> : null}
        {tab.pinned ? <span className="rounded bg-violet-400/10 px-1.5 py-1 font-mono text-[8px] text-violet-300">PINNED</span> : null}
        <span className="ml-auto font-mono text-[9px] text-zinc-700">{relativeAccess(tab.lastAccessedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-white/6 pt-3">
        <button
          className="icon-button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${tab.alias ?? tab.title}`}
          title="Edit the tab alias and icon"
          type="button"
        >
          <Pencil className="size-3" />
        </button>
        <button
          className="icon-button"
          onClick={() => void togglePinned()}
          aria-label={tab.pinned ? 'Unpin tab' : 'Pin tab'}
          title={tab.pinned ? 'Unpin this tab in Chrome' : 'Pin this tab in Chrome'}
          type="button"
        >
          {tab.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
        </button>
      </div>
    </article>
    {editing ? (
      <EditTabDialog
        tab={tab}
        onClose={() => setEditing(false)}
        onSave={saveEdits}
      />
    ) : null}
    </>
  )
})
