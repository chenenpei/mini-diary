import type { CloudAdapter, TokenProvider } from '@/lib/cloud/types'
import { validateCloudData } from '@/lib/sync'
import type { CloudData, SyncError } from '@/types'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'
const BOUNDARY = 'sync_boundary'

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function parseDriveFileList(data: unknown): Array<{ id: string; name: string }> {
  if (typeof data !== 'object' || data === null || !('files' in data)) return []
  const files = (data as Record<string, unknown>).files
  if (!Array.isArray(files)) return []
  return files.filter(
    (f): f is { id: string; name: string } =>
      typeof f === 'object' &&
      f !== null &&
      typeof (f as Record<string, unknown>).id === 'string' &&
      typeof (f as Record<string, unknown>).name === 'string',
  )
}

export class GoogleDriveAdapter implements CloudAdapter {
  constructor(private getToken: TokenProvider) {}

  async readJson(path: string): Promise<CloudData | null> {
    const fileId = await this.findFileId(path)
    if (!fileId) return null

    const token = await this.getToken()
    const response = await this.fetchWithErrorHandling(`${DRIVE_API}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const raw: unknown = await response.json()
    const validation = validateCloudData(raw)
    if (!validation.valid) {
      throw {
        kind: 'data_corrupt',
        message: `Invalid cloud data: ${validation.errors.join(', ')}`,
      } satisfies SyncError
    }
    return raw as CloudData
  }

  async writeJson(path: string, data: CloudData): Promise<void> {
    const fileId = await this.findFileId(path)
    const token = await this.getToken()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })

    if (fileId) {
      await this.updateFile(fileId, path, blob, 'application/json', token)
    } else {
      await this.createFile(path, blob, 'application/json', token)
    }
  }

  async uploadImage(path: string, blob: Blob): Promise<void> {
    const fileId = await this.findFileId(path)
    const token = await this.getToken()
    const contentType = blob.type || 'application/octet-stream'

    if (fileId) {
      await this.updateFile(fileId, path, blob, contentType, token)
    } else {
      await this.createFile(path, blob, contentType, token)
    }
  }

  async downloadImage(path: string): Promise<Blob> {
    const fileId = await this.findFileId(path)
    if (!fileId) {
      throw {
        kind: 'data_corrupt',
        message: `Image file not found: ${path}`,
      } satisfies SyncError
    }

    const token = await this.getToken()
    const response = await this.fetchWithErrorHandling(`${DRIVE_API}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return await response.blob()
  }

  async listFiles(folderPath: string): Promise<string[]> {
    const token = await this.getToken()
    const query = `name contains '${escapeQueryValue(folderPath)}'`
    const params = new URLSearchParams({
      q: query,
      spaces: 'appDataFolder',
      fields: 'files(id,name)',
    })

    const response = await this.fetchWithErrorHandling(`${DRIVE_API}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const files = parseDriveFileList(await response.json())
    return files.map((f) => f.name)
  }

  async deleteFiles(paths: string[]): Promise<void> {
    for (const path of paths) {
      const fileId = await this.findFileId(path)
      if (!fileId) continue

      const token = await this.getToken()
      await this.fetchWithErrorHandling(`${DRIVE_API}/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  }

  private async findFileId(name: string): Promise<string | null> {
    const token = await this.getToken()
    const query = `name='${escapeQueryValue(name)}'`
    const params = new URLSearchParams({
      q: query,
      spaces: 'appDataFolder',
      fields: 'files(id,name)',
    })

    const response = await this.fetchWithErrorHandling(`${DRIVE_API}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const files = parseDriveFileList(await response.json())
    return files[0]?.id ?? null
  }

  private async createFile(
    name: string,
    content: Blob,
    contentType: string,
    token: string,
  ): Promise<void> {
    const metadata = JSON.stringify({ name, parents: ['appDataFolder'] })
    const body = this.buildMultipartBody(metadata, content, contentType)

    await this.fetchWithErrorHandling(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
      },
      body,
    })
  }

  private async updateFile(
    fileId: string,
    name: string,
    content: Blob,
    contentType: string,
    token: string,
  ): Promise<void> {
    const metadata = JSON.stringify({ name })
    const body = this.buildMultipartBody(metadata, content, contentType)

    await this.fetchWithErrorHandling(`${UPLOAD_API}/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
      },
      body,
    })
  }

  private buildMultipartBody(metadata: string, content: Blob, contentType: string): Blob {
    const metadataPart = `--${BOUNDARY}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
    const endBoundary = `\r\n--${BOUNDARY}--`
    const contentHeader = `--${BOUNDARY}\r\nContent-Type: ${contentType}\r\n\r\n`

    return new Blob([metadataPart, contentHeader, content, endBoundary], {
      type: `multipart/related; boundary=${BOUNDARY}`,
    })
  }

  private async fetchWithErrorHandling(url: string, init?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await fetch(url, init)
    } catch {
      throw { kind: 'network', message: 'Network request failed' } satisfies SyncError
    }

    if (response.ok) return response

    const status = response.status

    if (status === 401 || status === 403) {
      throw { kind: 'auth', message: `Authentication failed: ${status}` } satisfies SyncError
    }
    if (status === 429) {
      throw { kind: 'rate_limit', message: 'Rate limit exceeded' } satisfies SyncError
    }
    if (status === 413 || status === 507) {
      throw { kind: 'quota', message: `Storage quota error: ${status}` } satisfies SyncError
    }
    if (status >= 500) {
      throw { kind: 'server', message: `Server error: ${status}` } satisfies SyncError
    }

    throw { kind: 'server', message: `Unexpected HTTP error: ${status}` } satisfies SyncError
  }
}
