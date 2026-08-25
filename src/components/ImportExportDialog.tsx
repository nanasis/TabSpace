import { Download, FileJson, Upload, X } from 'lucide-react'
import { useState } from 'react'

import type { TabSpaceDocument } from '../model/document'
import { applyImport, type ImportMode } from '../transfer/applyImport'
import { createBookmarksHtml, createMarkdown, createOneTabText, downloadFile } from '../transfer/exports'
import { parseImport } from '../transfer/importers'
import { createBackup } from '../transfer/tabSpaceBackup'
import type { ImportPreview, ImportProvider } from '../transfer/types'
import { useDialogFocus } from './useDialogFocus'

export interface ImportExportDialogProps {
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
  onClose(): void
}

export function ImportExportDialog({ document, updateDocument, onClose }: ImportExportDialogProps) {
  const [provider, setProvider] = useState<ImportProvider>('tabspace')
  const [preview, setPreview] = useState<ImportPreview>()
  const [mode, setMode] = useState<ImportMode>('merge')
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<string>()
  const dialogRef = useDialogFocus<HTMLElement>(onClose)

  async function readFile(file: File | undefined) {
    if (!file) return
    setError(undefined)
    setStatus(undefined)
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
    if (mode === 'replace' && !window.confirm('Replace all TabSpace organization with this import? Open Chrome tabs will remain open.')) return
    try {
      await updateDocument((current) => applyImport(current, preview, mode))
      setStatus(`Imported ${preview.spaces.length} spaces successfully.`)
      setPreview(undefined)
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

  const tabCount = document.tabs.length

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="my-4 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#17171e] shadow-2xl shadow-black/60" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
        <header className="flex items-start border-b border-white/8 p-5">
          <div className="flex-1"><h2 id="transfer-title" className="text-lg font-semibold">Import & export</h2><p className="mt-1 text-xs text-zinc-500">Move spaces, groups, and tabs without exposing credentials.</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close import and export" type="button"><X className="size-4" /></button>
        </header>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <section>
            <div className="flex items-center gap-2 text-sm font-medium"><Upload className="size-4 text-violet-400" />Import JSON</div>
            <label className="mt-4 block text-xs text-zinc-400" htmlFor="import-provider">Source provider</label>
            <select id="import-provider" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm" value={provider} onChange={(event) => { setProvider(event.target.value as ImportProvider); setPreview(undefined); setError(undefined) }}>
              <option value="tabspace">TabSpace</option><option value="toby">Toby</option><option value="tabme">Tabme</option>
            </select>
            <label
              className="mt-3 grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 bg-black/10 p-4 text-center hover:border-violet-400/40"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); void readFile(event.dataTransfer.files[0]) }}
            >
              <span><FileJson className="mx-auto size-6 text-zinc-600" /><span className="mt-2 block text-xs text-zinc-400">Drop JSON here or choose a file</span></span>
              <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void readFile(event.target.files?.[0])} />
            </label>

            {preview ? (
              <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/8 p-3 text-xs">
                <p className="font-medium text-violet-100">Ready to import {preview.spaces.length} spaces, {preview.spaces.reduce((sum, space) => sum + space.groups.length, 0)} groups, and {preview.spaces.reduce((sum, space) => sum + space.ungroupedTabs.length + space.groups.reduce((groupSum, group) => groupSum + group.tabs.length, 0), 0)} tabs.</p>
                {preview.warnings.map((warning) => <p className="mt-1 text-amber-300" key={warning}>{warning}</p>)}
                <div className="mt-3 flex gap-2">
                  <select className="rounded-lg border border-white/10 bg-[#17171e] px-2 py-1.5" value={mode} onChange={(event) => setMode(event.target.value as ImportMode)} aria-label="Import mode"><option value="merge">Merge</option><option value="replace">Replace</option></select>
                  <button className="rounded-lg bg-violet-500 px-3 py-1.5 font-medium hover:bg-violet-400" onClick={() => void importPreview()} type="button">Import</button>
                </div>
              </div>
            ) : null}
            {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}
            {status ? <p className="mt-3 text-xs text-emerald-300" role="status">{status}</p> : null}
          </section>

          <section>
            <div className="flex items-center gap-2 text-sm font-medium"><Download className="size-4 text-violet-400" />Export {tabCount} tabs</div>
            <div className="mt-4 space-y-2">
              <ExportButton title="TabSpace backup" description="Versioned JSON for complete round trips" extension=".json" onClick={exportJson} />
              <ExportButton title="Bookmarks HTML" description="Compatible with Chrome and other browsers" extension=".html" onClick={() => downloadFile(createBookmarksHtml(document))} />
              <ExportButton title="OneTab text" description="URL and title lines grouped by space" extension=".txt" onClick={() => downloadFile(createOneTabText(document))} />
              <ExportButton title="Markdown" description="Readable linked space and group outline" extension=".md" onClick={() => downloadFile(createMarkdown(document))} />
            </div>
            <p className="mt-4 text-[11px] leading-5 text-zinc-600">Exports can contain sensitive titles and URLs. TabSpace backups exclude Chrome runtime IDs, GitHub tokens, and synchronization metadata.</p>
          </section>
        </div>
      </section>
    </div>
  )
}

function ExportButton({ title, description, extension, onClick }: { title: string; description: string; extension: string; onClick(): void }) {
  return <button className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-black/10 p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/5" onClick={onClick} type="button"><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-zinc-300">{title}</span><span className="mt-1 block text-[10px] text-zinc-600">{description}</span></span><span className="font-mono text-[10px] text-violet-400">{extension}</span></button>
}
