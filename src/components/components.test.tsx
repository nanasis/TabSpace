import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createDefaultDocument } from '../model/document'
import { applyImport } from '../transfer/applyImport'
import { parseImport } from '../transfer/importers'
import { NewGroupDialog } from './NewGroupDialog'
import { SpaceBar } from './SpaceBar'
import { Workspace } from './Workspace'

const NOW = '2026-08-25T12:00:00.000Z'

function initialDocument() {
  return createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
}

describe('workspace components', () => {
  it('renders group cards and filters them using search', async () => {
    const user = userEvent.setup()
    let id = 0
    const document = applyImport(
      initialDocument(),
      parseImport('toby', {
        lists: [{ title: 'Sources', cards: [{ title: 'Example', url: 'https://example.com' }] }],
      }),
      'replace',
      { now: () => NOW, createId: () => `id-${++id}` },
    )

    render(<Workspace document={document} updateDocument={vi.fn()} onError={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText('Example')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search tabs' }), 'missing')
    expect(screen.getByText(/No tabs match/)).toBeInTheDocument()
  })

  it('creates a space through the space toolbar', async () => {
    const user = userEvent.setup()
    const updateDocument = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(window, 'prompt').mockReturnValueOnce('Research').mockReturnValueOnce('🔬')
    render(<SpaceBar document={initialDocument()} updateDocument={updateDocument} onError={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Create space' }))

    expect(updateDocument).toHaveBeenCalledOnce()
    const transform = updateDocument.mock.calls[0]?.[0] as (document: ReturnType<typeof initialDocument>) => ReturnType<typeof initialDocument>
    expect(transform(initialDocument()).spaces[1]?.name).toBe('Research')
  })

  it('submits the New Group dialog and supports cancellation', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    const onClose = vi.fn()
    render(<NewGroupDialog onCreate={onCreate} onClose={onClose} />)

    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Planning')
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    expect(onCreate).toHaveBeenCalledWith('Planning', '#8b5cf6')
  })
})
