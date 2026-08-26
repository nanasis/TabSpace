import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createDefaultDocument, tabSpaceDocumentSchema } from '../model/document'
import { createGroup } from '../model/groupOperations'
import { createSpace } from '../model/spaceOperations'
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
  it('shows all open tabs from the current window regardless of space', () => {
    const withSecondSpace = createSpace(initialDocument(), 'Research', '🔬', {
      now: () => NOW,
      createId: () => 'space-2',
    })
    const document = tabSpaceDocumentSchema.parse({
      ...withSecondSpace,
      tabs: [
        {
          id: 'open-tab', chromeTabId: 10, windowId: 1, spaceId: 'space-1', url: 'https://open.example',
          title: 'Open tab', pinned: false, active: false, order: 0, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
        {
          id: 'other-space-tab', chromeTabId: 11, windowId: 1, spaceId: 'space-2', url: 'https://research.example',
          title: 'Other space tab', pinned: false, active: false, order: 0, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
        {
          id: 'other-window-tab', chromeTabId: 12, windowId: 2, spaceId: 'space-1', url: 'https://window.example',
          title: 'Other window tab', pinned: false, active: false, order: 1, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
        {
          id: 'saved-tab', spaceId: 'space-1', url: 'https://saved.example',
          title: 'Saved tab', pinned: false, active: false, order: 2, lastAccessedAt: NOW,
          createdAt: NOW, updatedAt: NOW,
        },
      ],
    })

    render(<Sidebar document={document} currentWindowId={1} onActionError={vi.fn()} />)

    expect(screen.getByText('Open tab')).toBeInTheDocument()
    expect(screen.getByText('Other space tab')).toBeInTheDocument()
    expect(screen.queryByText('Other window tab')).not.toBeInTheDocument()
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
    render(<><Sidebar document={document} currentWindowId={1} onActionError={vi.fn()} /><Workspace document={document} updateDocument={updateDocument} onError={vi.fn()} /></>)

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

    const updateDocument = vi.fn().mockResolvedValue(undefined)
    render(<Workspace document={document} updateDocument={updateDocument} onError={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Example' })).toHaveAttribute(
      'title',
      'Edit the tab alias and icon',
    )
    expect(screen.getByRole('button', { name: 'Pin tab' })).toHaveAttribute(
      'title',
      'Pin this tab in Chrome',
    )
    expect(screen.queryByRole('button', { name: 'Copy tab URL' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose destination for Example' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Example from group' }))
    const removeFromGroup = updateDocument.mock.calls[0]?.[0] as (
      value: typeof document,
    ) => typeof document
    expect(removeFromGroup(document).tabs[0]?.groupId).toBeUndefined()

    await user.type(screen.getByRole('textbox', { name: 'Search tabs' }), 'missing')
    expect(screen.getByText(/No tabs match/)).toBeInTheDocument()
  })

  it('edits the alias and supports default or uploaded card icons', async () => {
    const user = userEvent.setup()
    let id = 0
    const document = applyImport(
      initialDocument(),
      parseImport('toby', {
        lists: [{ title: 'Sources', cards: [{ title: 'Example', url: 'https://example.com' }] }],
      }),
      'replace',
      { now: () => NOW, createId: () => `edit-${++id}` },
    )
    const updateDocument = vi.fn().mockResolvedValue(undefined)
    render(<Workspace document={document} updateDocument={updateDocument} onError={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Edit Example' }))
    expect(screen.getByRole('dialog', { name: 'Edit tab card' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Default/ })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: /Upload/ }))
    const image = new File(['small-icon'], 'icon.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Upload icon'), image)
    await screen.findByAltText('Uploaded icon preview')
    await user.clear(screen.getByRole('textbox', { name: 'Display alias' }))
    await user.type(screen.getByRole('textbox', { name: 'Display alias' }), 'Custom alias')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateDocument).toHaveBeenCalledOnce())
    const transform = updateDocument.mock.calls[0]?.[0] as (
      value: typeof document,
    ) => typeof document
    const edited = transform(document).tabs[0]
    expect(edited?.alias).toBe('Custom alias')
    expect(edited?.avatarImage).toMatch(/^data:image\/png;base64,/)
    expect(edited?.avatarEmoji).toBeUndefined()
  })

  it('uses a full-width auto-filling grid in dense mode', () => {
    let id = 0
    const compactDocument = applyImport(
      initialDocument(),
      parseImport('toby', {
        lists: [{ title: 'Sources', cards: [{ title: 'Example', url: 'https://example.com' }] }],
      }),
      'replace',
      { now: () => NOW, createId: () => `dense-${++id}` },
    )
    const denseDocument = tabSpaceDocumentSchema.parse({
      ...compactDocument,
      settings: { ...compactDocument.settings, cardDensity: 'dense' },
    })

    render(<Workspace document={denseDocument} updateDocument={vi.fn()} onError={vi.fn()} />)

    expect(document.querySelector('[data-card-layout="dense"]')).toHaveClass(
      '[grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]',
    )
    expect(screen.getByText('Example').closest('article')).toHaveAttribute('data-density', 'dense')
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
