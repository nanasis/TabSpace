import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { memo, useMemo } from 'react'

import type { TabSpaceDocument } from '../model/document'
import {
  activateSpace,
  createSpace,
  deleteSpace,
  moveSpace,
  updateSpace,
} from '../model/spaceOperations'

export interface SpaceBarProps {
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onError(message: string): void
}

export const SpaceBar = memo(function SpaceBar({ document, updateDocument, onError }: SpaceBarProps) {
  const activeSpace = document.spaces.find(({ id }) => id === document.settings.activeSpaceId)
  const countsBySpace = useMemo(() => {
    const counts = new Map<string, { tabs: number; groups: number }>()
    document.spaces.forEach(({ id }) => counts.set(id, { tabs: 0, groups: 0 }))
    document.tabs.forEach(({ spaceId }) => {
      const countsForSpace = counts.get(spaceId)
      if (countsForSpace) countsForSpace.tabs += 1
    })
    document.groups.forEach(({ spaceId }) => {
      const countsForSpace = counts.get(spaceId)
      if (countsForSpace) countsForSpace.groups += 1
    })
    return counts
  }, [document.groups, document.spaces, document.tabs])

  function addSpace() {
    const name = window.prompt('Name your new space:', 'New Space')?.trim()
    if (!name) return
    const emoji = window.prompt('Choose an emoji:', '🪐')?.trim() || '🪐'
    void updateDocument((current) => createSpace(current, name, emoji)).catch(() =>
      onError('TabSpace could not create that space.'),
    )
  }

  function renameSpace() {
    if (!activeSpace) return
    const name = window.prompt('Rename this space:', activeSpace.name)?.trim()
    if (!name) return
    const emoji = window.prompt('Space emoji:', activeSpace.emoji)?.trim() || activeSpace.emoji
    const requestedColor = window.prompt('Space color (hex):', activeSpace.color)?.trim()
    const color = requestedColor && /^#[0-9a-f]{6}$/i.test(requestedColor) ? requestedColor : activeSpace.color
    void updateDocument((current) => updateSpace(current, activeSpace.id, { name, emoji, color })).catch(() =>
      onError('TabSpace could not rename that space.'),
    )
  }

  function removeSpace() {
    if (!activeSpace) return
    if (document.spaces.length === 1) {
      onError('My Space is your final space and cannot be deleted.')
      return
    }
    const confirmed = window.confirm(
      `Delete “${activeSpace.name}”? Its open tabs will stay open and move to your first space.`,
    )
    if (!confirmed) return
    void updateDocument((current) => deleteSpace(current, activeSpace.id)).catch(() =>
      onError('TabSpace could not delete that space.'),
    )
  }

  return (
    <div className="border-b border-white/8 bg-[#0d0d12] px-4 py-2.5 sm:px-7">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
        {[...document.spaces]
          .sort((left, right) => left.order - right.order)
          .map((space) => (
            <button
              key={space.id}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs transition ${space.id === document.settings.activeSpaceId ? 'border-violet-400/30 bg-violet-400/12 text-violet-100' : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
              onClick={() => void updateDocument((current) => activateSpace(current, space.id))}
              type="button"
            >
              <span className="mr-1.5">{space.emoji}</span>
              {space.name}
              <span className="ml-2 font-mono text-[9px] text-zinc-500">
                {countsBySpace.get(space.id)?.tabs ?? 0}/{countsBySpace.get(space.id)?.groups ?? 0}
              </span>
            </button>
          ))}
        <button
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 text-zinc-500 hover:border-violet-400/30 hover:text-violet-300"
          onClick={addSpace}
          aria-label="Create space"
          type="button"
        >
          <Plus className="size-3.5" />
        </button>
        <span className="flex-1" />
        <button className="icon-button" onClick={() => activeSpace && void updateDocument((current) => moveSpace(current, activeSpace.id, -1))} aria-label="Move space left" type="button">
          <ChevronLeft className="size-3.5" />
        </button>
        <button className="icon-button" onClick={() => activeSpace && void updateDocument((current) => moveSpace(current, activeSpace.id, 1))} aria-label="Move space right" type="button">
          <ChevronRight className="size-3.5" />
        </button>
        <button className="icon-button" onClick={renameSpace} aria-label="Rename space" type="button">
          <Pencil className="size-3.5" />
        </button>
        <button className="icon-button hover:text-red-300" onClick={removeSpace} aria-label="Delete space" type="button">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
})
