import { Layers3, PanelLeft, Search, Settings2 } from 'lucide-react'
import { useMemo } from 'react'

import { useTabSpaceDocument } from './app/useTabSpaceDocument'
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
  const { document, error, loading } = useTabSpaceDocument(documentRepository)
  const activeSpace = document?.spaces.find(({ id }) => id === document.settings.activeSpaceId)

  return (
    <div className="flex min-h-screen bg-[#0b0b0f] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/8 bg-[#101015] lg:flex">
        <div className="flex h-18 items-center gap-3 border-b border-white/8 px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/40">
            <Layers3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">TabSpace</h1>
              <span className="rounded border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-300">
                v1
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">Focused tab workspace</p>
          </div>
        </div>

        <nav className="flex-1 p-4" aria-label="TabSpace navigation">
          <p className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Spaces
          </p>
          <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/8 px-3 py-3 text-sm text-violet-100">
            {activeSpace ? `${activeSpace.emoji}  ${activeSpace.name}` : 'Loading your spaces…'}
          </div>
        </nav>

        <div className="border-t border-white/8 p-4 text-xs text-zinc-500">
          {document ? `${document.tabs.length} tabs · ${document.groups.length} groups` : 'Local storage'}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-10 flex h-18 items-center gap-3 border-b border-white/8 bg-[#0b0b0f]/90 px-4 backdrop-blur-xl sm:px-7">
          <button
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-zinc-400 lg:hidden"
            aria-label="Open navigation"
            type="button"
          >
            <PanelLeft className="size-4" />
          </button>
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
            aria-label="Search tabs"
            type="button"
          >
            <Search className="size-4" />
          </button>
          <button
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Settings"
            type="button"
          >
            <Settings2 className="size-4" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-7" aria-labelledby="workspace-title">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400">
              Active workspace
            </p>
            <h2 id="workspace-title" className="mt-2 text-2xl font-semibold tracking-tight">
              {activeSpace?.name ?? 'Your tabs'}
            </h2>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200" role="alert">
                {error}
              </div>
            ) : null}

            <section className="mt-7 min-h-80 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-8">
              <div className="grid h-full min-h-64 place-items-center text-center">
                <div>
                  <Layers3 className="mx-auto size-9 text-zinc-700" aria-hidden="true" />
                  <p className="mt-4 text-sm font-medium text-zinc-300">
                    {loading ? 'Preparing your workspace…' : 'Your tab workspace is ready'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Tab groups and cards will appear in this area.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="flex h-9 items-center justify-between border-t border-white/8 px-4 font-mono text-[10px] text-zinc-600 sm:px-7">
          <span>{document ? `${document.tabs.length} tabs in space` : 'Starting TabSpace'}</span>
          <span>Local · private</span>
        </footer>
      </div>
    </div>
  )
}
