import { describe, expect, it, vi } from 'vitest'

import { createGistClient, GIST_FILENAME, GitHubApiError } from './gistClient'

const VERSION_1 = 'a'.repeat(40)
const VERSION_2 = 'b'.repeat(40)

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
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      id: 'gist-1',
      history: [{ version: VERSION_1 }],
    }))

    await expect(createGistClient(fetcher).create('secret', backup)).resolves.toEqual({
      gistId: 'gist-1',
      revision: VERSION_1,
    })
    const request = fetcher.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({ public: false }))
  })

  it('checks the known Gist version before updating without unsupported headers', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ history: [{ version: VERSION_1 }] }))
      .mockResolvedValueOnce(jsonResponse({ history: [{ version: VERSION_2 }] }))

    await expect(
      createGistClient(fetcher).update('secret', 'gist-1', backup, VERSION_1),
    ).resolves.toEqual({ gistId: 'gist-1', revision: VERSION_2 })

    const patchRequest = fetcher.mock.calls[1]?.[1] as RequestInit
    expect(patchRequest.method).toBe('PATCH')
    expect(patchRequest.headers).not.toHaveProperty('If-Match')
  })

  it('accepts legacy ETag metadata without sending it to GitHub', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      history: [{ version: VERSION_2 }],
    }))

    await createGistClient(fetcher).update('secret', 'gist-1', backup, 'W/"legacy-etag"')

    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'PATCH' }))
  })

  it('rejects an update when the remote Gist version changed', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      history: [{ version: VERSION_2 }],
    }))

    await expect(
      createGistClient(fetcher).update('secret', 'gist-1', backup, VERSION_1),
    ).rejects.toEqual(expect.objectContaining({ status: 409 }))
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('validates pulled backup contents', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      files: { [GIST_FILENAME]: { content: JSON.stringify(backup) } },
      history: [{ version: VERSION_1 }],
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
