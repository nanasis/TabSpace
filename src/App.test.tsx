import { render, screen } from '@testing-library/react'
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
})
