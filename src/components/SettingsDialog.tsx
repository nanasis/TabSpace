import { Database, Download, GitBranch, ShieldCheck, Upload, X } from 'lucide-react'
import type { Settings, TabSpaceDocument } from '../model/document'
import { GistSyncSection } from './GistSyncSection'
import { useDialogFocus } from './useDialogFocus'

export interface SettingsDialogProps {
  document: TabSpaceDocument
  onChange(updates: Partial<Settings>): void
  onClose(): void
  onOpenImport(): void
  onOpenExport(): void
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
}

export function SettingsDialog({
  document,
  onChange,
  onClose,
  onOpenImport,
  onOpenExport,
  updateDocument,
}: SettingsDialogProps) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#17171e] shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="flex items-start border-b border-white/8 p-5">
          <div className="flex-1">
            <h2 id="settings-title" className="text-lg font-semibold">Settings</h2>
            <p className="mt-1 text-xs text-zinc-500">Configure your local TabSpace dashboard.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings" type="button">
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <fieldset>
            <legend className="text-sm font-medium">Tab card density</legend>
            <p className="mt-1 text-xs text-zinc-500">Choose how cards use the available GroupSpace width.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                {
                  value: 'dense',
                  label: 'Dense',
                  description: 'Use the full workspace width and fit as many cards per row as the screen allows.',
                },
                {
                  value: 'compact',
                  label: 'Compact',
                  description: 'Keep the current bounded workspace and responsive card layout.',
                },
              ] as const).map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-xl border px-3 py-3 transition ${document.settings.cardDensity === option.value ? 'border-violet-400/40 bg-violet-400/10 text-violet-100' : 'border-white/8 text-zinc-400 hover:border-white/15'}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="card-density"
                    value={option.value}
                    checked={document.settings.cardDensity === option.value}
                    onChange={() => onChange({ cardDensity: option.value })}
                  />
                  <span className="block text-xs font-medium">{option.label}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border border-white/8 bg-black/15 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Database className="size-4 text-violet-400" />Local data</div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {document.spaces.length} spaces, {document.groups.length} groups, and {document.tabs.length} tab records are stored in Chrome on this device.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/5"
                onClick={onOpenImport}
                type="button"
              >
                <Upload className="size-3.5" /> Import data
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/5"
                onClick={onOpenExport}
                type="button"
              >
                <Download className="size-3.5" /> Export data
              </button>
            </div>
          </div>

          <GistSyncSection document={document} updateDocument={updateDocument} />

          <div className="rounded-xl border border-white/8 bg-black/15 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-emerald-400" />Privacy</div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">TabSpace does not send local tab data anywhere. GitHub synchronization is not enabled in this test build.</p>
          </div>

          <a
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
            href="https://github.com/nanasis/TabSpace"
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch className="size-4" /> View TabSpace on GitHub
          </a>
        </div>
      </section>
    </div>
  )
}
