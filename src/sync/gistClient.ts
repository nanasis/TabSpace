import { backupSchema, type TabSpaceBackup } from '../transfer/tabSpaceBackup'

const API_ROOT = 'https://api.github.com'
export const GIST_FILENAME = 'tabspace-backup.json'
export const GITHUB_TOKEN_STORAGE_KEY = 'tabspace.githubToken'

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly rateLimitRemaining?: string,
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

export interface GistResult {
  gistId: string
  revision?: string
}

export interface PulledGist extends GistResult {
  backup: TabSpaceBackup
}

function currentGistVersion(body: { history?: Array<{ version?: string }> }) {
  return body.history?.[0]?.version
}

function isGistVersion(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{40}$/i.test(value))
}

export function createGistClient(fetcher: typeof fetch = fetch) {
  async function request(token: string, path: string, init: RequestInit = {}) {
    const response = await fetcher(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...init.headers,
      },
    })
    if (!response.ok) {
      let apiMessage = `GitHub request failed (${response.status})`
      try {
        const body = await response.json() as { message?: string }
        if (body.message) apiMessage = body.message
      } catch {
        // Keep the status-only message when GitHub does not return JSON.
      }
      throw new GitHubApiError(apiMessage, response.status, response.headers.get('x-ratelimit-remaining') ?? undefined)
    }
    return response
  }

  return {
    async validateToken(token: string) {
      const response = await request(token, '/user')
      const body = await response.json() as { login?: string }
      if (!body.login) throw new GitHubApiError('GitHub did not return an account name', 502)
      return body.login
    },

    async create(token: string, backup: TabSpaceBackup): Promise<GistResult> {
      const response = await request(token, '/gists', {
        method: 'POST',
        body: JSON.stringify({
          description: 'TabSpace private synchronization backup',
          public: false,
          files: { [GIST_FILENAME]: { content: JSON.stringify(backup, null, 2) } },
        }),
      })
      const body = await response.json() as {
        id?: string
        history?: Array<{ version?: string }>
      }
      if (!body.id) throw new GitHubApiError('GitHub did not return a Gist ID', 502)
      return { gistId: body.id, revision: currentGistVersion(body) }
    },

    async update(token: string, gistId: string, backup: TabSpaceBackup, revision?: string): Promise<GistResult> {
      if (isGistVersion(revision)) {
        const currentResponse = await request(token, `/gists/${encodeURIComponent(gistId)}`)
        const currentBody = await currentResponse.json() as {
          history?: Array<{ version?: string }>
        }
        if (currentGistVersion(currentBody) !== revision) {
          throw new GitHubApiError('The Gist changed remotely', 409)
        }
      }

      const response = await request(token, `/gists/${encodeURIComponent(gistId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(backup, null, 2) } } }),
      })
      const body = await response.json() as { history?: Array<{ version?: string }> }
      return { gistId, revision: currentGistVersion(body) }
    },

    async pull(token: string, gistId: string): Promise<PulledGist> {
      const response = await request(token, `/gists/${encodeURIComponent(gistId)}`)
      const body = await response.json() as {
        files?: Record<string, { content?: string }>
        history?: Array<{ version?: string }>
      }
      const contents = body.files?.[GIST_FILENAME]?.content
      if (!contents) throw new GitHubApiError(`The Gist does not contain ${GIST_FILENAME}`, 422)
      return {
        gistId,
        revision: currentGistVersion(body),
        backup: backupSchema.parse(JSON.parse(contents) as unknown),
      }
    },
  }
}

export async function readSessionToken() {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) return undefined
  const result = await chrome.storage.session.get(GITHUB_TOKEN_STORAGE_KEY)
  const token = result[GITHUB_TOKEN_STORAGE_KEY]
  return typeof token === 'string' ? token : undefined
}

export async function storeSessionToken(token: string) {
  await chrome.storage.session.set({ [GITHUB_TOKEN_STORAGE_KEY]: token })
}

export async function clearSessionToken() {
  await chrome.storage.session.remove(GITHUB_TOKEN_STORAGE_KEY)
}
