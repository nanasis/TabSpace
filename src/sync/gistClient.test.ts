import { describe, expect, it, vi } from 'vitest'

import { createGistClient, GIST_FILENAME, GitHubApiError } from './gistClient'

const backup = {
  format: 'tabspace-backup' as const,
  schemaVersion: 1 as const,
  exportedAt: '2026-08-25T12:00:00.000Z',
  spaces: [{ name: 'My Space', emoji: '✨', color: '#8b5cf6', groups: [], ungroupedTabs: [] }],
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', etag: '"revision-1"' },
    ...init,
  })
}

describe('GitHub Gist client', () => {
  it('validates a token without persisting it', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ login: 'octocat' }))

    await expect(createGistClient(fetcher).validateToken('secret')).resolves.toBe('octocat')
    expect(fetcher).toHaveBeenCalledWith('https://api.github.com/user', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
    }))
  })

  it('creates a private Gist with canonical backup JSON', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: 'gist-1' }))

    await expect(createGistClient(fetcher).create('secret', backup)).resolves.toEqual({
      gistId: 'gist-1',
      revision: '"revision-1"',
    })
    const request = fetcher.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({ public: false }))
  })

  it('uses the known revision for conflict-safe updates', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ id: 'gist-1' }))

    await createGistClient(fetcher).update('secret', 'gist-1', backup, '"revision-0"')

    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/gists/gist-1'), expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ 'If-Match': '"revision-0"' }),
    }))
  })

  it('validates pulled backup contents', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      files: { [GIST_FILENAME]: { content: JSON.stringify(backup) } },
    }))

    await expect(createGistClient(fetcher).pull('secret', 'gist-1')).resolves.toEqual(
      expect.objectContaining({ backup }),
    )
  })

  it('exposes revoked-token and rate-limit errors without response data', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(
      { message: 'Bad credentials' },
      { status: 401, headers: { 'x-ratelimit-remaining': '0' } },
    ))

    await expect(createGistClient(fetcher).validateToken('revoked')).rejects.toEqual(
      expect.objectContaining<Partial<GitHubApiError>>({ status: 401, message: 'Bad credentials' }),
    )
  })
})
