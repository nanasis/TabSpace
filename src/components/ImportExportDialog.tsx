import { Download, FileJson, Upload, X } from 'lucide-react'
import { useState } from 'react'

import type { TabSpaceDocument } from '../model/document'
import { applyImport, type ImportMode } from '../transfer/applyImport'
import { createBookmarksHtml, createMarkdown, createOneTabText, downloadFile } from '../transfer/exports'
import { parseImport } from '../transfer/importers'
import { createBackup } from '../transfer/tabSpaceBackup'
import type { ImportPreview, ImportProvider } from '../transfer/types'
import { useDialogFocus } from './useDialogFocus'

export type DataTransferView = 'import' | 'export'

export interface ImportExportDialogProps {
  document: TabSpaceDocument
  view: DataTransferView
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onClose(): void
}

const PROVIDERS: Array<{
  value: ImportProvider
  label: string
  description: string
}> = [
  { value: 'tabspace', label: 'TabSpace', description: 'Full backup' },
  { value: 'toby', label: 'Toby', description: 'Collections' },
  { value: 'tabme', label: 'Tabme', description: 'Spaces & folders' },
]

export function ImportExportDialog({
  document,
  view,
  updateDocument,
  onClose,
}: ImportExportDialogProps) {
  const [provider, setProvider] = useState<ImportProvider>('tabspace')
  const [preview, setPreview] = useState<ImportPreview>()
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string>()
  const dialogRef = useDialogFocus<HTMLElement>(onClose)

  async function readFile(file: File | undefined) {
    if (!file) return
    setError(undefined)
    try {
      const parsedJson: unknown = JSON.parse(await file.text())
      setPreview(parseImport(provider, parsedJson))
    } catch (caught) {
      setPreview(undefined)
      setError(caught instanceof Error ? caught.message : 'The selected file could not be imported.')
    }
  }

  async function importPreview() {
    if (!preview) return
    if (
      mode === 'replace' &&
      !window.confirm(
        'Replace all TabSpace organization with this import? Open Chrome tabs will remain open.',
      )
    ) {
      return
    }

    try {
      await updateDocument((current) => applyImport(current, preview, mode))
      onClose()
    } catch {
      setError('TabSpace could not apply the import. Existing data was left unchanged.')
    }
  }

  function exportJson() {
    downloadFile({
      filename: 'tabspace-backup.json',
      mimeType: 'application/json',
      contents: JSON.stringify(createBackup(document), null, 2),
    })
  }

  const title = view === 'import' ? 'Import data' : 'Export data'
  const description =
    view === 'import'
      ? 'Bring spaces, groups, and tabs into TabSpace from a selected provider.'
      : 'Download a portable copy of your spaces, groups, and tabs.'

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="my-4 w-full max-w-xl rounded-2xl border border-white/10 bg-[#17171e] shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
      >
        <header className="flex items-start border-b border-white/8 p-5">
          <div className="flex-1">
            <h2 id="transfer-title" className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={`Close ${view}`}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="p-5">
          {view === 'import' ? (
            <section>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Upload className="size-4 text-violet-400" /> Import JSON
              </div>

              <fieldset className="mt-4">
                <legend className="text-xs font-medium text-zinc-400">Source provider</legend>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-[#0d0d12] p-1.5">
                  {PROVIDERS.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg border px-2 py-2.5 text-center transition ${provider === option.value ? 'border-violet-400/30 bg-violet-400/12 text-violet-100 shadow-sm shadow-violet-950/30' : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="import-provider"
                        value={option.value}
                        checked={provider === option.value}
                        onChange={() => {
                          setProvider(option.value)
                          setPreview(undefined)
                          setError(undefined)
                        }}
                      />
                      <span className="block text-xs font-medium">{option.label}</span>
                      <span className="mt-1 block text-[9px] text-zinc-600">
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label
                className="mt-3 grid min-h-36 cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 bg-[#0d0d12] p-4 text-center transition hover:border-violet-400/40 hover:bg-violet-400/[0.03]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  void readFile(event.dataTransfer.files[0])
                }}
              >
                <span>
                  <FileJson className="mx-auto size-7 text-zinc-600" />
                  <span className="mt-2 block text-xs text-zinc-300">
                    Drop {PROVIDERS.find(({ value }) => value === provider)?.label} JSON here
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-600">
                    or select a file from your computer
                  </span>
                </span>
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void readFile(event.target.files?.[0])}
                />
              </label>

              {preview ? (
                <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/8 p-3 text-xs">
                  <p className="font-medium text-violet-100">
                    Ready to import {preview.spaces.length} spaces,{' '}
                    {preview.spaces.reduce((sum, space) => sum + space.groups.length, 0)} groups,
                    and{' '}
                    {preview.spaces.reduce(
                      (sum, space) =>
                        sum +
                        space.ungroupedTabs.length +
                        space.groups.reduce((groupSum, group) => groupSum + group.tabs.length, 0),
                      0,
                    )}{' '}
                    tabs.
                  </p>
                  {preview.warnings.map((warning) => (
                    <p className="mt-1 text-amber-300" key={warning}>{warning}</p>
                  ))}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex rounded-lg border border-white/10 bg-[#101015] p-1" role="radiogroup" aria-label="Import mode">
                      {(['merge', 'replace'] as const).map((option) => (
                        <label
                          key={option}
                          className={`cursor-pointer rounded-md px-3 py-1.5 text-[10px] capitalize transition ${mode === option ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          <input className="sr-only" type="radio" name="import-mode" checked={mode === option} onChange={() => setMode(option)} />
                          {option}
                        </label>
                      ))}
                    </div>
                    <button
                      className="ml-auto rounded-lg bg-violet-500 px-4 py-2 font-medium hover:bg-violet-400"
                      onClick={() => void importPreview()}
                      type="button"
                    >
                      Import
                    </button>
                  </div>
                </div>
              ) : null}
              {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}
            </section>
          ) : (
            <section>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download className="size-4 text-violet-400" /> Export {document.tabs.length} tabs
              </div>
              <div className="mt-4 space-y-2">
                <ExportButton title="TabSpace backup" description="Versioned JSON for complete round trips" extension=".json" onClick={exportJson} />
                <ExportButton title="Bookmarks HTML" description="Compatible with Chrome and other browsers" extension=".html" onClick={() => downloadFile(createBookmarksHtml(document))} />
                <ExportButton title="OneTab text" description="URL and title lines grouped by space" extension=".txt" onClick={() => downloadFile(createOneTabText(document))} />
                <ExportButton title="Markdown" description="Readable linked space and group outline" extension=".md" onClick={() => downloadFile(createMarkdown(document))} />
              </div>
              <p className="mt-4 text-[11px] leading-5 text-zinc-600">
                Exports can contain sensitive titles and URLs. TabSpace backups exclude Chrome runtime
                IDs, GitHub tokens, and synchronization metadata.
              </p>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}

function ExportButton({
  title,
  description,
  extension,
  onClick,
}: {
  title: string
  description: string
  extension: string
  onClick(): void
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-[#0d0d12] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/5"
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-zinc-300">{title}</span>
        <span className="mt-1 block text-[10px] text-zinc-600">{description}</span>
      </span>
      <span className="font-mono text-[10px] text-violet-400">{extension}</span>
    </button>
  )
}
