import { Check, Copy, ExternalLink, Globe2, Pencil, Pin, PinOff, SmilePlus, X } from 'lucide-react'
import { memo, useState, type MouseEvent } from 'react'

import type { TabRecord, TabSpaceDocument } from '../model/document'
import { updateTab } from '../model/tabOperations'
import {
  activateBrowserTab,
  closeBrowserTab,
  openBrowserTab,
  setBrowserTabPinned,
} from '../tabs/chromeTabs'
import { writeTabDragPayload } from '../tabs/tabDrag'

export interface MoveDestination {
  value: string
  label: string
  spaceId: string
  groupId?: string
}

export interface TabCardProps {
  tab: TabRecord
  moveDestinations: MoveDestination[]
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
  onMove(tabId: string, destination: MoveDestination): void
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
  moveDestinations,
  updateDocument,
  onError,
  onMove,
  selected,
  onSelect,
  dense,
}: TabCardProps) {
  const [choosingDestination, setChoosingDestination] = useState(false)

  async function open() {
    try {
      if (tab.chromeTabId === undefined) await openBrowserTab(tab.url)
      else await activateBrowserTab(tab.chromeTabId)
    } catch {
      onError('Chrome could not open that tab.')
    }
  }

  async function close() {
    if (tab.chromeTabId === undefined) {
      onError('This saved tab is not currently open.')
      return
    }
    try {
      await closeBrowserTab(tab.chromeTabId)
    } catch {
      onError('Chrome could not close that tab. It may already be closed.')
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

  function rename() {
    const alias = window.prompt('Tab alias (leave blank to use its title):', tab.alias ?? '')
    if (alias === null) return
    void updateDocument((current) => updateTab(current, tab.id, { alias: alias.trim() || undefined }))
  }

  function chooseAvatar() {
    const avatarEmoji = window.prompt('Custom emoji (leave blank to use the favicon):', tab.avatarEmoji ?? '')
    if (avatarEmoji === null) return
    void updateDocument((current) =>
      updateTab(current, tab.id, { avatarEmoji: avatarEmoji.trim() || undefined }),
    )
  }

  return (
    <article
      className={`group relative min-w-0 cursor-grab rounded-xl border bg-[#15151b] ${dense ? 'p-2.5' : 'p-3.5'} transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-[#181820] active:cursor-grabbing ${selected ? 'border-violet-400/60 ring-1 ring-violet-400/30' : tab.active ? 'border-violet-400/35 shadow-lg shadow-violet-950/10' : 'border-white/8'}`}
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
        <button className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5" onClick={chooseAvatar} aria-label={`Change avatar for ${tab.alias ?? tab.title}`} type="button">
          {tab.avatarEmoji ? <span className="text-lg">{tab.avatarEmoji}</span> : tab.faviconUrl ? <img className="size-5" src={tab.faviconUrl} alt="" loading="lazy" decoding="async" /> : <Globe2 className="size-4 text-zinc-600" />}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => void open()} type="button">
          <span className="block truncate text-sm font-medium text-zinc-200">{tab.alias ?? tab.title}</span>
          <span className="mt-1 block truncate text-xs text-zinc-600">{domainFor(tab.url)}</span>
        </button>
        <button className="text-zinc-700 opacity-0 transition hover:text-red-300 group-hover:opacity-100 focus:opacity-100" onClick={() => void close()} aria-label={`Close ${tab.alias ?? tab.title}`} type="button"><X className="size-4" /></button>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {tab.active ? <span className="rounded bg-emerald-400/10 px-1.5 py-1 font-mono text-[8px] text-emerald-300">ACTIVE</span> : null}
        {tab.pinned ? <span className="rounded bg-violet-400/10 px-1.5 py-1 font-mono text-[8px] text-violet-300">PINNED</span> : null}
        <span className="ml-auto font-mono text-[9px] text-zinc-700">{relativeAccess(tab.lastAccessedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-white/6 pt-3">
        <button className="icon-button" onClick={rename} aria-label={`Rename ${tab.alias ?? tab.title}`} type="button"><Pencil className="size-3" /></button>
        <button className="icon-button" onClick={() => void togglePinned()} aria-label={tab.pinned ? 'Unpin tab' : 'Pin tab'} type="button">{tab.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}</button>
        <button className="icon-button" onClick={() => void navigator.clipboard.writeText(tab.url).catch(() => onError('Could not copy this URL.'))} aria-label="Copy tab URL" type="button"><Copy className="size-3" /></button>
        <button className="icon-button" onClick={() => void open()} aria-label="Open tab" type="button"><ExternalLink className="size-3" /></button>
        {choosingDestination ? (
          <select
            autoFocus
            className="ml-auto min-w-0 max-w-36 rounded-md border border-violet-400/30 bg-black/20 px-1.5 py-1 text-[9px] text-zinc-400 outline-none"
            defaultValue=""
            onBlur={() => setChoosingDestination(false)}
            onChange={(event) => {
              const destination = moveDestinations.find(({ value }) => value === event.target.value)
              if (destination) onMove(tab.id, destination)
              setChoosingDestination(false)
            }}
            aria-label={`Move ${tab.alias ?? tab.title}`}
          >
            <option value="" disabled>Move to…</option>
            {moveDestinations.map((destination) => (
              <option key={destination.value} value={destination.value}>{destination.label}</option>
            ))}
          </select>
        ) : (
          <button
            className="ml-auto flex items-center gap-1 rounded-md border border-white/8 px-1.5 py-1 text-[9px] text-zinc-600 hover:border-violet-400/30 hover:text-violet-300"
            onClick={() => setChoosingDestination(true)}
            aria-label={`Choose destination for ${tab.alias ?? tab.title}`}
            type="button"
          >
            <SmilePlus className="size-3" aria-hidden="true" /> Move
          </button>
        )}
      </div>
    </article>
  )
})
