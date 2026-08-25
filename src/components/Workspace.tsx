import { ChevronDown, ChevronRight, ChevronUp, Layers3, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { TabSpaceDocument } from '../model/document'
import { createGroup, deleteGroup, moveGroup, updateGroup } from '../model/groupOperations'
import { NewGroupDialog } from './NewGroupDialog'

export interface WorkspaceProps {
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
}

export function Workspace({ document, updateDocument, onError }: WorkspaceProps) {
  const [showNewGroup, setShowNewGroup] = useState(false)
  const activeSpaceId = document.settings.activeSpaceId
  const groups = document.groups
    .filter(({ spaceId }) => spaceId === activeSpaceId)
    .sort((left, right) => left.order - right.order)
  const ungroupedTabs = document.tabs.filter(
    (tab) => tab.spaceId === activeSpaceId && tab.groupId === undefined,
  )

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

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400">Active workspace</p>
          <h2 id="workspace-title" className="mt-2 text-2xl font-semibold tracking-tight">
            {document.spaces.find(({ id }) => id === activeSpaceId)?.name ?? 'Your tabs'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{document.tabs.filter(({ spaceId }) => spaceId === activeSpaceId).length} tabs · {groups.length} groups</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium hover:bg-violet-400" onClick={() => setShowNewGroup(true)} type="button">
          <Plus className="size-3.5" /> New group
        </button>
      </div>

      <div className="mt-7 space-y-5">
        {groups.map((group) => {
          const tabs = document.tabs.filter((tab) => tab.groupId === group.id)
          return (
            <section key={group.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.018]">
              <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
                <button className="text-zinc-500 hover:text-white" onClick={() => void updateDocument((current) => updateGroup(current, group.id, { collapsed: !group.collapsed }))} aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name}`} type="button">
                  {group.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                <span className="size-2 rounded-full" style={{ backgroundColor: group.color }} />
                <h3 className="flex-1 text-sm font-medium">{group.name}</h3>
                <span className="font-mono text-[10px] text-zinc-600">{tabs.length}</span>
                <button className="icon-button" onClick={() => void updateDocument((current) => moveGroup(current, group.id, -1))} aria-label={`Move ${group.name} up`} type="button"><ChevronUp className="size-3.5" /></button>
                <button className="icon-button" onClick={() => void updateDocument((current) => moveGroup(current, group.id, 1))} aria-label={`Move ${group.name} down`} type="button"><ChevronDown className="size-3.5" /></button>
                <button className="icon-button" onClick={() => editGroup(group.id, group.name, group.color)} aria-label={`Edit ${group.name}`} type="button"><MoreHorizontal className="size-3.5" /></button>
                <button className="icon-button hover:text-red-300" onClick={() => removeGroup(group.id, group.name)} aria-label={`Delete ${group.name}`} type="button"><Trash2 className="size-3.5" /></button>
              </div>
              {!group.collapsed ? (
                <div className="p-4 text-xs text-zinc-600">
                  {tabs.length ? `${tabs.length} tabs in this group` : 'Move tabs here to start this group.'}
                </div>
              ) : null}
            </section>
          )
        })}

        <section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.012]">
          <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
            <span className="size-2 rounded-full bg-zinc-700" />
            <h3 className="flex-1 text-sm font-medium text-zinc-300">Ungrouped</h3>
            <span className="font-mono text-[10px] text-zinc-600">{ungroupedTabs.length}</span>
          </div>
          <div className="grid min-h-32 place-items-center p-4 text-center text-xs text-zinc-600">
            {ungroupedTabs.length ? `${ungroupedTabs.length} tabs are ready to organize.` : (
              <span><Layers3 className="mx-auto mb-2 size-5 text-zinc-700" />No ungrouped tabs.</span>
            )}
          </div>
        </section>
      </div>

      {showNewGroup ? (
        <NewGroupDialog
          onClose={() => setShowNewGroup(false)}
          onCreate={(name, color) => {
            void updateDocument((current) => createGroup(current, activeSpaceId, name, color)).catch(() => onError('TabSpace could not create that group.'))
            setShowNewGroup(false)
          }}
        />
      ) : null}
    </>
  )
}
