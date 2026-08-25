import { Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useTabSpaceDocument } from './app/useTabSpaceDocument'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { SpaceBar } from './components/SpaceBar'
import { Workspace } from './components/Workspace'
import { updateSettings } from './model/settingsOperations'
import {
  createChromeDocumentRepository,
  type DocumentRepository,
} from './storage/documentRepository'

export interface AppProps {
  repository?: DocumentRepository
}

export function App({ repository }: AppProps) {
  const documentRepository = useMemo(
    () => repository ?? createChromeDocumentRepository(),
    [repository],
  )
  const { document, error, loading, updateDocument } = useTabSpaceDocument(documentRepository)
  const [actionError, setActionError] = useState<string>()
  const [selection, setSelection] = useState({ spaceId: '', count: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const activeSpace = document?.spaces.find(({ id }) => id === document.settings.activeSpaceId)

  return (
    <div className="flex min-h-screen bg-[#0b0b0f] text-zinc-100">
      <Sidebar
        document={document}
        activeSpaceName={activeSpace?.name}
        onActionError={setActionError}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-10 flex h-18 items-center gap-3 border-b border-white/8 bg-[#0b0b0f]/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {activeSpace ? `${activeSpace.emoji} ${activeSpace.name}` : 'TabSpace'}
            </p>
            <p className="text-xs text-zinc-500">
              {loading ? 'Loading tabs…' : `${document?.tabs.length ?? 0} open tabs`}
            </p>
          </div>
          <button
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Settings"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <Settings2 className="size-4" />
          </button>
        </header>

        {document ? (
          <SpaceBar
            document={document}
            updateDocument={updateDocument}
            onError={setActionError}
          />
        ) : null}

        <main className="flex-1 p-4 sm:p-7" aria-labelledby="workspace-title">
          <div className="mx-auto max-w-7xl">
            {error || actionError ? (
              <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200" role="alert">
                {error ?? actionError}
              </div>
            ) : null}

            {document ? (
              <Workspace
                key={document.settings.activeSpaceId}
                document={document}
                updateDocument={updateDocument}
                onError={setActionError}
                onSelectionCountChange={(count) =>
                  setSelection({ spaceId: document.settings.activeSpaceId, count })
                }
              />
            ) : (
              <p className="py-20 text-center text-sm text-zinc-600">Preparing your workspace…</p>
            )}
          </div>
        </main>

        <footer className="flex h-9 items-center justify-between border-t border-white/8 px-4 font-mono text-[10px] text-zinc-600 sm:px-7">
          <span>
            {selection.spaceId === document?.settings.activeSpaceId && selection.count
              ? `${selection.count} tabs selected`
              : document
                ? `${document.tabs.filter(({ spaceId }) => spaceId === document.settings.activeSpaceId).length} tabs in space`
                : 'Starting TabSpace'}
          </span>
          <span>Local · private</span>
        </footer>
      </div>

      {settingsOpen && document ? (
        <SettingsDialog
          document={document}
          onChange={(updates) => void updateDocument((current) => updateSettings(current, updates))}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  )
}
