import { CloudDownload, CloudUpload, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'

import { tabSpaceDocumentSchema, type TabSpaceDocument } from '../model/document'
import {
  clearSessionToken,
  createGistClient,
  GitHubApiError,
  readSessionToken,
  storeSessionToken,
} from '../sync/gistClient'
import { applyImport } from '../transfer/applyImport'
import { parseImport } from '../transfer/importers'
import { createBackup } from '../transfer/tabSpaceBackup'

export interface GistSyncSectionProps {
  document: TabSpaceDocument
  updateDocument(transform: (document: TabSpaceDocument) => TabSpaceDocument): Promise<void>
}

function messageFor(error: unknown) {
  if (error instanceof GitHubApiError) {
    if (error.status === 401 || error.status === 403) return 'GitHub rejected the token. Check its Gist permission or create a new token.'
    if (error.status === 409 || error.status === 412) return 'The Gist changed remotely. Pull the latest version before pushing again.'
    if (error.rateLimitRemaining === '0') return 'GitHub API rate limit reached. Try again after the reset time.'
    return error.message
  }
  return 'GitHub synchronization failed. Please try again.'
}

export function GistSyncSection({ document, updateDocument }: GistSyncSectionProps) {
  const [tokenInput, setTokenInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>()
  const [error, setError] = useState<string>()
  const client = createGistClient()

  useEffect(() => {
    void readSessionToken().then((token) => setConnected(Boolean(token)))
  }, [])

  async function connect() {
    const token = tokenInput.trim()
    if (!token) return
    setBusy(true)
    setError(undefined)
    try {
      const login = await client.validateToken(token)
      await storeSessionToken(token)
      setTokenInput('')
      setAccount(login)
      setConnected(true)
      setStatus(`Connected to GitHub as ${login}.`)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setBusy(false)
    }
  }

  async function push() {
    setBusy(true)
    setError(undefined)
    try {
      const token = await readSessionToken()
      if (!token) throw new GitHubApiError('Connect GitHub before syncing.', 401)
      const backup = createBackup(document)
      const result = document.sync.gistId
        ? await client.update(token, document.sync.gistId, backup, document.sync.lastKnownRevision)
        : await client.create(token, backup)
      const syncedAt = new Date().toISOString()
      await updateDocument((current) =>
        tabSpaceDocumentSchema.parse({
          ...current,
          sync: {
            ...current.sync,
            gistId: result.gistId,
            lastSyncedAt: syncedAt,
            ...(result.revision ? { lastKnownRevision: result.revision } : {}),
          },
          updatedAt: syncedAt,
        }),
      )
      setStatus('Private Gist updated successfully.')
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setBusy(false)
    }
  }

  async function pull() {
    if (!document.sync.gistId) return
    if (!window.confirm('Replace local TabSpace organization with the private Gist backup? Open Chrome tabs remain open.')) return
    setBusy(true)
    setError(undefined)
    try {
      const token = await readSessionToken()
      if (!token) throw new GitHubApiError('Connect GitHub before syncing.', 401)
      const result = await client.pull(token, document.sync.gistId)
      const preview = parseImport('tabspace', result.backup)
      const syncedAt = new Date().toISOString()
      await updateDocument((current) => {
        const restored = applyImport(current, preview, 'replace')
        return tabSpaceDocumentSchema.parse({
          ...restored,
          sync: {
            ...current.sync,
            gistId: result.gistId,
            lastSyncedAt: syncedAt,
            ...(result.revision ? { lastKnownRevision: result.revision } : {}),
          },
          updatedAt: syncedAt,
        })
      })
      setStatus('Private Gist restored successfully.')
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    await clearSessionToken()
    setConnected(false)
    setAccount(undefined)
    setStatus('GitHub disconnected for this browser session.')
  }

  return (
    <div className="rounded-xl border border-white/8 bg-black/15 p-4">
      <div className="text-sm font-medium">Private GitHub Gist sync</div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">Use a classic personal access token with only the <code className="text-violet-300">gist</code> scope. The token stays in Chrome session storage and is never included in backups.</p>
      <details className="mt-3 rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-xs text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-300">How to create the GitHub token</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 leading-5 text-zinc-500">
          <li>Open GitHub Settings → Developer settings → Personal access tokens → Tokens (classic).</li>
          <li>Select Generate new token (classic), add a descriptive name and expiration.</li>
          <li>Select only the <code className="text-violet-300">gist</code> scope.</li>
          <li>Generate the token, copy it once, and paste it below. Never share or commit it.</li>
        </ol>
        <a className="mt-2 inline-block text-violet-400 hover:text-violet-300" href="https://github.com/settings/tokens/new?scopes=gist&description=TabSpace" target="_blank" rel="noreferrer">Open GitHub token creation ↗</a>
      </details>
      {!connected ? (
        <div className="mt-3 flex gap-2">
          <input className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none focus:border-violet-400/40" type="password" autoComplete="off" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="github_pat_…" aria-label="GitHub token" />
          <button className="rounded-lg bg-violet-500 px-3 py-2 text-xs disabled:opacity-40" disabled={!tokenInput.trim() || busy} onClick={() => void connect()} type="button">Connect</button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-emerald-300"><span>Connected{account ? ` as ${account}` : ''}</span><button className="flex items-center gap-1 text-zinc-500 hover:text-white" onClick={() => void disconnect()} type="button"><LogOut className="size-3" /> Disconnect</button></div>
          <div className="mt-3 flex gap-2">
            <button className="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs disabled:opacity-40" disabled={busy} onClick={() => void push()} type="button"><CloudUpload className="size-3.5" />{document.sync.gistId ? 'Push update' : 'Create private Gist'}</button>
            <button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-40" disabled={busy || !document.sync.gistId} onClick={() => void pull()} type="button"><CloudDownload className="size-3.5" />Pull</button>
          </div>
        </div>
      )}
      {document.sync.lastSyncedAt ? <p className="mt-2 font-mono text-[9px] text-zinc-600">Last synced {new Date(document.sync.lastSyncedAt).toLocaleString()}</p> : null}
      {status ? <p className="mt-2 text-xs text-emerald-300" role="status">{status}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-300" role="alert">{error}</p> : null}
      <p className="mt-3 text-[10px] leading-4 text-amber-300/80">Private Gists still contain tab titles and URLs. Review your tabs before syncing sensitive browsing data.</p>
    </div>
  )
}
