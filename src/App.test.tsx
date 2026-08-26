import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { createDefaultDocument } from './model/document'
import type { DocumentRepository } from './storage/documentRepository'

function createRepository(): DocumentRepository {
  return {
    load: vi.fn().mockResolvedValue(
      createDefaultDocument({
        now: () => '2026-08-25T12:00:00.000Z',
        createId: () => 'space-1',
      }),
    ),
    save: vi.fn().mockResolvedValue(undefined),
  }
}

describe('App', () => {
  it('renders the TabSpace application shell', async () => {
    render(<App repository={createRepository()} />)

    expect(screen.getByRole('heading', { name: 'TabSpace' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'My Space' })).toBeInTheDocument()
  })

  it('opens settings and persists card density', async () => {
    const user = userEvent.setup()
    const repository = createRepository()
    render(<App repository={repository} />)
    await screen.findByRole('heading', { name: 'My Space' })

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /dense/i }))

    await waitFor(() =>
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ cardDensity: 'dense' }) }),
      ),
    )
    expect(document.querySelector('[data-workspace-width="dense"]')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus()
  })
})
