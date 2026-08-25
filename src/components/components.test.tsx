import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from '../model/document'
import { createGroup } from '../model/groupOperations'
import { applyImport } from '../transfer/applyImport'
import { parseImport } from '../transfer/importers'
import { NewGroupDialog } from './NewGroupDialog'
import { Sidebar } from './Sidebar'
import { SpaceBar } from './SpaceBar'
import { Workspace } from './Workspace'

const NOW = '2026-08-25T12:00:00.000Z'

function initialDocument() {
  return createDefaultDocument({ now: () => NOW, createId: () => 'space-1' })
}

function createDataTransfer() {
  const values = new Map<string, string>()
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData(type: string, value: string) {
      values.set(type, value)
    },
    getData(type: string) {
      return values.get(type) ?? ''
    },
  } as unknown as DataTransfer
}

describe('workspace components', () => {
  it('shows only currently open tabs in the sidebar', () => {
    const initial = initialDocument()
    const document = tabSpaceDocumentSchema.parse({
      ...initial,
      tabs: [
        {
          id: 'open-tab', chromeTabId: 10, spaceId: 'space-1', url: 'https://open.example',
          title: 'Open tab', pinned: false, active: false, order: 0, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
        {
          id: 'saved-tab', spaceId: 'space-1', url: 'https://saved.example',
          title: 'Saved tab', pinned: false, active: false, order: 1, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
      ],
    })

    render(<Sidebar document={document} activeSpaceName="My Space" onActionError={vi.fn()} />)

    expect(screen.getByText('Open tab')).toBeInTheDocument()
    expect(screen.queryByText('Saved tab')).not.toBeInTheDocument()
  })

  it('drags an open sidebar tab into a workspace group', () => {
    const initial = initialDocument()
    const withGroup = createGroup(initial, 'space-1', 'Target', '#3b82f6', {
      now: () => NOW,
      createId: () => 'target-group',
    })
    const document = tabSpaceDocumentSchema.parse({
      ...withGroup,
      tabs: [{
        id: 'open-tab', chromeTabId: 10, spaceId: 'space-1', url: 'https://open.example',
        title: 'Open tab', pinned: false, active: false, order: 0, lastAccessedAt: NOW,
        createdAt: NOW, updatedAt: NOW,
      }],
    })
    const updateDocument = vi.fn().mockResolvedValue(undefined)
    const dataTransfer = createDataTransfer()
    render(<><Sidebar document={document} activeSpaceName="My Space" onActionError={vi.fn()} /><Workspace document={document} updateDocument={updateDocument} onError={vi.fn()} /></>)

    fireEvent.dragStart(screen.getByTitle('Drag to a group in the workspace'), { dataTransfer })
    fireEvent.drop(screen.getByRole('region', { name: 'Target group drop area' }), { dataTransfer })

    const transform = updateDocument.mock.calls[0]?.[0] as (value: typeof document) => typeof document
    expect(transform(document).tabs[0]?.groupId).toBe('target-group')
  })

  it('drags a tab card from one group to another', () => {
    let id = 0
    const imported = applyImport(
      initialDocument(),
      parseImport('toby', {
        lists: [{ title: 'Sources', cards: [{ title: 'Example', url: 'https://example.com' }] }],
      }),
      'replace',
      { now: () => NOW, createId: () => `id-${++id}` },
    )
    const document = createGroup(imported, imported.settings.activeSpaceId, 'Target', '#3b82f6', {
      now: () => NOW,
      createId: () => 'target-group',
    })
    const updateDocument = vi.fn().mockResolvedValue(undefined)
    const dataTransfer = createDataTransfer()
    render(<Workspace document={document} updateDocument={updateDocument} onError={vi.fn()} />)

    fireEvent.dragStart(screen.getByText('Example').closest('article')!, { dataTransfer })
    fireEvent.drop(screen.getByRole('region', { name: 'Target group drop area' }), { dataTransfer })

    expect(updateDocument).toHaveBeenCalledOnce()
    const transform = updateDocument.mock.calls[0]?.[0] as (value: typeof document) => typeof document
    expect(transform(document).tabs[0]?.groupId).toBe('target-group')
  })

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
