import { Check, Copy, ExternalLink, Globe2, Pencil, Pin, PinOff, SmilePlus, X } from 'lucide-react'
import type { MouseEvent } from 'react'

import type { TabRecord, TabSpaceDocument } from '../model/document'
import { moveTab, updateTab } from '../model/tabOperations'
import {
  activateBrowserTab,
  closeBrowserTab,
  openBrowserTab,
  setBrowserTabPinned,
} from '../tabs/chromeTabs'
import { writeTabDragPayload } from '../tabs/tabDrag'

export interface TabCardProps {
  tab: TabRecord
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
  selected?: boolean
  onSelect?(event: MouseEvent<HTMLButtonElement>): void
  compact?: boolean
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

export function TabCard({ tab, document, updateDocument, onError, selected, onSelect, compact }: TabCardProps) {
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
      className={`group relative min-w-0 cursor-grab rounded-xl border bg-[#15151b] ${compact ? 'p-2.5' : 'p-3.5'} transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-[#181820] active:cursor-grabbing ${selected ? 'border-violet-400/60 ring-1 ring-violet-400/30' : tab.active ? 'border-violet-400/35 shadow-lg shadow-violet-950/10' : 'border-white/8'}`}
      draggable
      onDragStart={(event) =>
        writeTabDragPayload(event.dataTransfer, { tabId: tab.id, source: 'card' })
      }
      title="Drag this card to another group"
    >
      {onSelect ? (
        <button
          className={`absolute -left-2 -top-2 z-10 grid size-5 place-items-center rounded-md border transition ${selected ? 'border-violet-400 bg-violet-500 text-white' : 'border-white/15 bg-[#1b1b23] text-transparent opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
          onClick={onSelect}
          aria-label={`${selected ? 'Deselect' : 'Select'} ${tab.alias ?? tab.title}`}
          aria-pressed={selected}
          type="button"
        >
          <Check className="size-3" />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <button className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5" onClick={chooseAvatar} aria-label={`Change avatar for ${tab.alias ?? tab.title}`} type="button">
          {tab.avatarEmoji ? <span className="text-lg">{tab.avatarEmoji}</span> : tab.faviconUrl ? <img className="size-5" src={tab.faviconUrl} alt="" /> : <Globe2 className="size-4 text-zinc-600" />}
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
        <SmilePlus className="ml-1 size-3 text-zinc-800" aria-hidden="true" />
        <select
          className="ml-auto min-w-0 max-w-28 rounded-md border border-white/8 bg-black/20 px-1.5 py-1 text-[9px] text-zinc-500 outline-none"
          value={tab.groupId ? `group:${tab.groupId}` : `space:${tab.spaceId}`}
          onChange={(event) => {
            const [kind, id] = event.target.value.split(':')
            if (!id) return
            const destinationSpaceId = kind === 'group' ? document.groups.find((group) => group.id === id)?.spaceId : id
            if (!destinationSpaceId) return
            void updateDocument((current) => moveTab(current, tab.id, destinationSpaceId, kind === 'group' ? id : undefined))
          }}
          aria-label={`Move ${tab.alias ?? tab.title}`}
        >
          {document.spaces.map((space) => (
            <option key={`space:${space.id}`} value={`space:${space.id}`}>{space.name} / Ungrouped</option>
          ))}
          {document.groups.map((group) => (
            <option key={`group:${group.id}`} value={`group:${group.id}`}>{document.spaces.find(({ id }) => id === group.spaceId)?.name} / {group.name}</option>
          ))}
        </select>
      </div>
    </article>
  )
}
