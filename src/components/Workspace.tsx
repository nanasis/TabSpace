import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers3,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react'

import type { TabRecord, TabSpaceDocument } from '../model/document'
import {
  createDefaultGroupForTab,
  createGroup,
  deleteGroup,
  moveGroup,
  updateGroup,
} from '../model/groupOperations'
import { moveTab, moveTabs } from '../model/tabOperations'
import { searchTabs } from '../tabs/searchTabs'
import { readTabDragPayload } from '../tabs/tabDrag'
import { NewGroupDialog } from './NewGroupDialog'
import { TabCard } from './TabCard'

interface MoveDestination {
  value: string
  label: string
  spaceId: string
  groupId?: string
}

export interface WorkspaceProps {
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
  onSelectionCountChange?(count: number): void
}

export const Workspace = memo(function Workspace({
  document,
  updateDocument,
  onError,
  onSelectionCountChange,
}: WorkspaceProps) {
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dropTarget, setDropTarget] = useState<string>()
  const activeSpaceId = document.settings.activeSpaceId
  const [destination, setDestination] = useState(`space:${activeSpaceId}`)
  const lastSelectedId = useRef<string | undefined>(undefined)
  const filteredTabsRef = useRef<TabRecord[]>([])
  const groups = useMemo(
    () =>
      document.groups
        .filter(({ spaceId }) => spaceId === activeSpaceId)
        .sort((left, right) => left.order - right.order),
    [activeSpaceId, document.groups],
  )
  const activeTabs = useMemo(
    () => document.tabs.filter(({ spaceId }) => spaceId === activeSpaceId),
    [activeSpaceId, document.tabs],
  )
  const filteredTabs = useMemo(
    () => searchTabs(activeTabs, deferredQuery),
    [activeTabs, deferredQuery],
  )
  useEffect(() => {
    filteredTabsRef.current = filteredTabs
  }, [filteredTabs])
  const tabsByGroup = useMemo(() => {
    const grouped = new Map<string | undefined, TabRecord[]>()
    filteredTabs.forEach((tab) => {
      const tabs = grouped.get(tab.groupId)
      if (tabs) tabs.push(tab)
      else grouped.set(tab.groupId, [tab])
    })
    return grouped
  }, [filteredTabs])
  const ungroupedTabs = tabsByGroup.get(undefined) ?? []
  const moveDestinations = useMemo<MoveDestination[]>(() => {
    const spaceNames = new Map(document.spaces.map(({ id, name }) => [id, name]))
    return [
      ...document.spaces.map((space) => ({
        value: `space:${space.id}`,
        label: `${space.name} / Ungrouped`,
        spaceId: space.id,
      })),
      ...document.groups.map((group) => ({
        value: `group:${group.id}`,
        label: `${spaceNames.get(group.spaceId) ?? 'Space'} / ${group.name}`,
        spaceId: group.spaceId,
        groupId: group.id,
      })),
    ]
  }, [document.groups, document.spaces])
  const dense = document.settings.cardDensity === 'dense'
  const cardGridClass = dense
    ? 'grid gap-3 p-4 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]'
    : 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

  function moveDroppedTab(event: DragEvent<HTMLElement>, groupId?: string) {
    event.preventDefault()
    const payload = readTabDragPayload(event.dataTransfer)
    setDropTarget(undefined)
    if (!payload) return

    void updateDocument((current) => moveTab(current, payload.tabId, activeSpaceId, groupId)).catch(
      () => onError('TabSpace could not move that tab.'),
    )
  }

  function createGroupFromDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    const payload = readTabDragPayload(event.dataTransfer)
    setDropTarget(undefined)
    if (!payload) return

    void updateDocument((current) =>
      createDefaultGroupForTab(current, activeSpaceId, payload.tabId),
    ).catch(() => onError('TabSpace could not create a group for that tab.'))
  }

  function clearDropTarget(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTarget(undefined)
    }
  }

  function editGroup(groupId: string, currentName: string, currentColor: string) {
    const name = window.prompt('Rename group:', currentName)?.trim()
    if (!name) return
    const requestedColor = window.prompt('Group color (hex):', currentColor)?.trim()
    const color = requestedColor && /^#[0-9a-f]{6}$/i.test(requestedColor) ? requestedColor : currentColor
    void updateDocument((current) => updateGroup(current, groupId, { name, color }))
  }

  function removeGroup(groupId: string, name: string) {
    if (!window.confirm(`Delete “${name}”? Its tabs will move to Ungrouped.`)) return
    void updateDocument((current) => deleteGroup(current, groupId))
  }

  const selectTab = useCallback((tabId: string, event: MouseEvent<HTMLButtonElement>) => {
    setSelectedIds((current) => {
      const next = new Set(event.metaKey || event.ctrlKey || event.shiftKey ? current : [])
      if (event.shiftKey && lastSelectedId.current) {
        const currentTabs = filteredTabsRef.current
        const first = currentTabs.findIndex(({ id }) => id === lastSelectedId.current)
        const last = currentTabs.findIndex(({ id }) => id === tabId)
        if (first >= 0 && last >= 0) {
          currentTabs
            .slice(Math.min(first, last), Math.max(first, last) + 1)
            .forEach(({ id }) => next.add(id))
        }
      } else if (next.has(tabId)) {
        next.delete(tabId)
      } else {
        next.add(tabId)
      }
      onSelectionCountChange?.(next.size)
      return next
    })
    lastSelectedId.current = tabId
  }, [onSelectionCountChange])

  function moveSelected() {
    const target = moveDestinations.find(({ value }) => value === destination)
    if (!target || !selectedIds.size) return
    void updateDocument((current) =>
      moveTabs(current, selectedIds, target.spaceId, target.groupId),
    )
    setSelectedIds(new Set())
    onSelectionCountChange?.(0)
  }

  const removeCardFromGroup = useCallback((tabId: string) => {
    void updateDocument((current) => {
      const tab = current.tabs.find(({ id }) => id === tabId)
      return tab ? moveTab(current, tabId, tab.spaceId) : current
    }).catch(() => onError('TabSpace could not remove that tab from its group.'))
  }, [onError, updateDocument])

  function card(tab: TabRecord) {
    return (
      <TabCard
        key={tab.id}
        tab={tab}
        updateDocument={updateDocument}
        onError={onError}
        onRemoveFromGroup={removeCardFromGroup}
        selected={selectedIds.has(tab.id)}
        onSelect={selectTab}
        dense={dense}
      />
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400">Active workspace</p>
          <h2 id="workspace-title" className="mt-2 text-2xl font-semibold tracking-tight">
            {document.spaces.find(({ id }) => id === activeSpaceId)?.name ?? 'Your tabs'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{activeTabs.length} tabs · {groups.length} groups</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              className="w-48 rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-8 text-xs outline-none placeholder:text-zinc-700 focus:border-violet-400/40 sm:w-64"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tabs…"
              aria-label="Search tabs"
            />
            {query ? <button className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white" onClick={() => setQuery('')} aria-label="Clear search" type="button"><X className="size-3.5" /></button> : null}
          </label>
          <button
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${dropTarget === 'new-group' ? 'border-violet-300 bg-violet-400 text-white ring-2 ring-violet-400/30' : 'border-violet-500 bg-violet-500 hover:bg-violet-400'}`}
            onClick={() => setShowNewGroup(true)}
            onDragEnter={(event) => { event.preventDefault(); setDropTarget('new-group') }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
            onDragLeave={clearDropTarget}
            onDrop={createGroupFromDrop}
            title="Click to name a group, or drop a tab to create New Group"
            type="button"
          >
            <Plus className="size-3.5" /> {dropTarget === 'new-group' ? 'Drop to create group' : 'New group'}
          </button>
        </div>
      </div>

      {selectedIds.size ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-400/8 px-3 py-2.5">
          <span className="text-xs text-violet-200">{selectedIds.size} selected</span>
          <select className="rounded-lg border border-white/10 bg-[#17171e] px-2 py-1.5 text-xs text-zinc-300" value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Bulk destination">
            {moveDestinations.map((target) => (
              <option key={target.value} value={target.value}>{target.label}</option>
            ))}
          </select>
          <button className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs hover:bg-violet-400" onClick={moveSelected} type="button">Move</button>
          <button className="ml-auto text-xs text-zinc-500 hover:text-white" onClick={() => { setSelectedIds(new Set()); onSelectionCountChange?.(0) }} type="button">Clear</button>
        </div>
      ) : null}

      {deferredQuery && !filteredTabs.length ? (
        <div className="mt-7 grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 text-center">
          <div><Search className="mx-auto size-6 text-zinc-700" /><p className="mt-3 text-sm text-zinc-400">No tabs match “{query}”</p><button className="mt-2 text-xs text-violet-400" onClick={() => setQuery('')} type="button">Clear search</button></div>
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          {groups.map((group) => {
            const tabs = tabsByGroup.get(group.id) ?? []
            if (deferredQuery && !tabs.length) return null
            return (
              <section
                key={group.id}
                className={`overflow-hidden rounded-2xl border bg-white/[0.018] transition [contain-intrinsic-size:auto_24rem] [content-visibility:auto] ${dropTarget === `group:${group.id}` ? 'border-violet-400/70 bg-violet-400/8 ring-2 ring-violet-400/20' : 'border-white/8'}`}
                aria-label={`${group.name} group drop area`}
                onDragEnter={(event) => { event.preventDefault(); setDropTarget(`group:${group.id}`) }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
                onDragLeave={clearDropTarget}
                onDrop={(event) => moveDroppedTab(event, group.id)}
              >
                <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
                  <button className="text-zinc-500 hover:text-white" onClick={() => void updateDocument((current) => updateGroup(current, group.id, { collapsed: !group.collapsed }))} aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name}`} type="button">{group.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}</button>
                  <span className="size-2 rounded-full" style={{ backgroundColor: group.color }} />
                  <h3 className="flex-1 text-sm font-medium">{group.name}</h3>
                  <span className="font-mono text-[10px] text-zinc-600">{tabs.length}</span>
                  <button className="icon-button" onClick={() => void updateDocument((current) => moveGroup(current, group.id, -1))} aria-label={`Move ${group.name} up`} type="button"><ChevronUp className="size-3.5" /></button>
                  <button className="icon-button" onClick={() => void updateDocument((current) => moveGroup(current, group.id, 1))} aria-label={`Move ${group.name} down`} type="button"><ChevronDown className="size-3.5" /></button>
                  <button className="icon-button" onClick={() => editGroup(group.id, group.name, group.color)} aria-label={`Edit ${group.name}`} type="button"><MoreHorizontal className="size-3.5" /></button>
                  <button className="icon-button hover:text-red-300" onClick={() => removeGroup(group.id, group.name)} aria-label={`Delete ${group.name}`} type="button"><Trash2 className="size-3.5" /></button>
                </div>
                {!group.collapsed ? tabs.length ? <div className={cardGridClass} data-card-layout={dense ? 'dense' : 'compact'}>{tabs.map(card)}</div> : <div className="p-6 text-center text-xs text-zinc-600">Move tabs here to start this group.</div> : null}
              </section>
            )
          })}

          {(!deferredQuery || ungroupedTabs.length) ? (
            <section
              className={`overflow-hidden rounded-2xl border bg-white/[0.012] transition [contain-intrinsic-size:auto_24rem] [content-visibility:auto] ${dropTarget === 'ungrouped' ? 'border-violet-400/70 bg-violet-400/8 ring-2 ring-violet-400/20' : 'border-white/8'}`}
              aria-label="Ungrouped tabs drop area"
              onDragEnter={(event) => { event.preventDefault(); setDropTarget('ungrouped') }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
              onDragLeave={clearDropTarget}
              onDrop={(event) => moveDroppedTab(event)}
            >
              <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3"><span className="size-2 rounded-full bg-zinc-700" /><h3 className="flex-1 text-sm font-medium text-zinc-300">Ungrouped</h3><span className="font-mono text-[10px] text-zinc-600">{ungroupedTabs.length}</span></div>
              {ungroupedTabs.length ? <div className={cardGridClass} data-card-layout={dense ? 'dense' : 'compact'}>{ungroupedTabs.map(card)}</div> : <div className="grid min-h-32 place-items-center p-4 text-center text-xs text-zinc-600"><span><Layers3 className="mx-auto mb-2 size-5 text-zinc-700" />No ungrouped tabs.</span></div>}
            </section>
          ) : null}
        </div>
      )}

      {showNewGroup ? <NewGroupDialog onClose={() => setShowNewGroup(false)} onCreate={(name, color) => { void updateDocument((current) => createGroup(current, activeSpaceId, name, color)).catch(() => onError('TabSpace could not create that group.')); setShowNewGroup(false) }} /> : null}
    </>
  )
})
