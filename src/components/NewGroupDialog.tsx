import { useState } from 'react'

import { useDialogFocus } from './useDialogFocus'

const COLORS = ['#8b5cf6', '#3b82f6', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899']

export interface NewGroupDialogProps {
  onClose(): void
  onCreate(name: string, color: string): void
}

export function NewGroupDialog({ onClose, onCreate }: NewGroupDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0] ?? '#8b5cf6')
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#17171e] p-5 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-group-title"
        onSubmit={(event) => {
          event.preventDefault()
          const normalizedName = name.trim()
          if (normalizedName) onCreate(normalizedName, color)
        }}
      >
        <h2 id="new-group-title" className="text-lg font-semibold">New group</h2>
        <p className="mt-1 text-xs text-zinc-500">Create a section for related tabs in this space.</p>
        <label className="mt-5 block text-xs text-zinc-400" htmlFor="group-name">Group name</label>
        <input
          id="group-name"
          autoFocus
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-700 focus:border-violet-400/50"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Design references"
          maxLength={80}
        />
        <fieldset className="mt-5">
          <legend className="text-xs text-zinc-400">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((option) => (
              <button
                key={option}
                className={`size-7 rounded-full border-2 transition ${color === option ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: option }}
                onClick={() => setColor(option)}
                aria-label={`Use color ${option}`}
                type="button"
              />
            ))}
          </div>
        </fieldset>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-lg px-4 py-2 text-xs text-zinc-400 hover:bg-white/5" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-40" disabled={!name.trim()} type="submit">Create group</button>
        </div>
      </form>
    </div>
  )
}
