import { Globe2, ImageUp, Smile, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import type { TabRecord } from '../model/document'
import { useDialogFocus } from './useDialogFocus'

const MAX_ICON_FILE_SIZE = 192 * 1024

type IconMode = 'default' | 'emoji' | 'upload'

export interface EditTabValues {
  alias?: string
  avatarEmoji?: string
  avatarImage?: string
}

export interface EditTabDialogProps {
  tab: TabRecord
  onClose(): void
  onSave(values: EditTabValues): void
}

function initialIconMode(tab: TabRecord): IconMode {
  if (tab.avatarImage) return 'upload'
  if (tab.avatarEmoji) return 'emoji'
  return 'default'
}

export function EditTabDialog({ tab, onClose, onSave }: EditTabDialogProps) {
  const [alias, setAlias] = useState(tab.alias ?? '')
  const [iconMode, setIconMode] = useState<IconMode>(() => initialIconMode(tab))
  const [emoji, setEmoji] = useState(tab.avatarEmoji ?? '✨')
  const [uploadedIcon, setUploadedIcon] = useState(tab.avatarImage)
  const [error, setError] = useState<string>()
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose)

  async function loadIcon(file: File | undefined) {
    if (!file) return
    setError(undefined)
    if (!file.type.startsWith('image/')) {
      setError('Choose a PNG, JPEG, WebP, GIF, or other image file.')
      return
    }
    if (file.size > MAX_ICON_FILE_SIZE) {
      setError('The icon must be smaller than 192 KB.')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image')),
      )
      reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read image')))
      reader.readAsDataURL(file)
    }).catch(() => undefined)

    if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length > 262144) {
      setError('TabSpace could not load that image. Try a smaller file.')
      return
    }
    setUploadedIcon(dataUrl)
    setIconMode('upload')
  }

  function submit() {
    if (iconMode === 'emoji' && !emoji.trim()) {
      setError('Enter an emoji or choose the default icon.')
      return
    }
    if (iconMode === 'upload' && !uploadedIcon) {
      setError('Choose an image to use as the icon.')
      return
    }

    onSave({
      alias: alias.trim() || undefined,
      avatarEmoji: iconMode === 'emoji' ? emoji.trim().slice(0, 16) : undefined,
      avatarImage: iconMode === 'upload' ? uploadedIcon : undefined,
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#17171e] shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tab-title"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <header className="flex items-start border-b border-white/8 p-5">
          <div className="min-w-0 flex-1">
            <h2 id="edit-tab-title" className="text-lg font-semibold">Edit tab card</h2>
            <p className="mt-1 truncate text-xs text-zinc-500">{tab.title}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close tab editor" type="button">
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div>
            <label className="text-xs font-medium text-zinc-400" htmlFor="tab-alias">Display alias</label>
            <input
              id="tab-alias"
              autoFocus
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d12] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-violet-400/50"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder={tab.title}
              maxLength={512}
            />
            <p className="mt-1.5 text-[10px] text-zinc-600">Leave blank to use the current browser title.</p>
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-zinc-400">Card icon</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { value: 'default', label: 'Default', icon: Globe2 },
                { value: 'emoji', label: 'Emoji', icon: Smile },
                { value: 'upload', label: 'Upload', icon: ImageUp },
              ] as const).map((option) => {
                const Icon = option.icon
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-xs transition ${iconMode === option.value ? 'border-violet-400/40 bg-violet-400/10 text-violet-100' : 'border-white/8 text-zinc-500 hover:border-white/15 hover:text-zinc-300'}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="icon-mode"
                      value={option.value}
                      checked={iconMode === option.value}
                      onChange={() => setIconMode(option.value)}
                    />
                    <Icon className="mx-auto mb-1.5 size-4" />
                    {option.label}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="rounded-xl border border-white/8 bg-[#0d0d12] p-4">
            {iconMode === 'default' ? (
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center overflow-hidden rounded-xl bg-white/5">
                  {tab.faviconUrl ? (
                    <img className="size-6" src={tab.faviconUrl} alt="" />
                  ) : (
                    <Globe2 className="size-5 text-zinc-600" />
                  )}
                </span>
                <div><p className="text-xs text-zinc-300">Use the default site icon</p><p className="mt-1 text-[10px] text-zinc-600">Loaded from Chrome or the imported backup.</p></div>
              </div>
            ) : null}

            {iconMode === 'emoji' ? (
              <label className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-white/5 text-xl">{emoji || '·'}</span>
                <span className="min-w-0 flex-1"><span className="block text-xs text-zinc-300">Emoji icon</span><input className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-violet-400/50" value={emoji} onChange={(event) => setEmoji(event.target.value)} aria-label="Emoji icon" maxLength={16} /></span>
              </label>
            ) : null}

            {iconMode === 'upload' ? (
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">
                  {uploadedIcon ? <img className="size-full object-cover" src={uploadedIcon} alt="Uploaded icon preview" /> : <ImageUp className="size-5 text-zinc-600" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300">Upload a custom icon</p>
                  <p className="mt-1 text-[10px] text-zinc-600">Image files up to 192 KB are stored locally.</p>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-zinc-300 hover:border-violet-400/30">
                    <Upload className="size-3" /> Choose image
                    <input className="sr-only" type="file" accept="image/*" aria-label="Upload icon" onChange={(event) => void loadIcon(event.target.files?.[0])} />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-xs text-red-300" role="alert">{error}</p> : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-white/8 p-4">
          <button className="rounded-lg px-4 py-2 text-xs text-zinc-400 hover:bg-white/5" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-medium text-white hover:bg-violet-400" type="submit">Save changes</button>
        </footer>
      </form>
    </div>,
    document.body,
  )
}
