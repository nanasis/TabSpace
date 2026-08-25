import { Layers3 } from 'lucide-react'

export function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-lg text-center" aria-labelledby="app-title">
        <Layers3
          className="mx-auto mb-5 size-12 text-violet-400"
          aria-hidden="true"
          strokeWidth={1.75}
        />
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-violet-300">
          Chrome extension
        </p>
        <h1 id="app-title" className="text-4xl font-semibold tracking-tight">
          TabSpace
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-400">
          Your focused workspace for organizing open tabs is being prepared.
        </p>
      </section>
    </main>
  )
}
