import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { GoogleDriveAdapter } from '@/lib/cloud/google-drive'
import type { CloudData } from '@/types'

function makeCloudData(overrides: Partial<CloudData> = {}): CloudData {
  return {
    version: 1,
    syncedAt: '2024-01-15T00:00:00.000Z',
    entries: [],
    imageManifest: [],
    ...overrides,
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function blobResponse(content: string, status = 200): Response {
  return new Response(new Blob([content]), { status })
}

describe('GoogleDriveAdapter', () => {
  const mockToken = vi.fn(async () => 'mock-access-token')
  let adapter: GoogleDriveAdapter
  let fetchSpy: MockInstance<typeof globalThis.fetch>

  beforeEach(() => {
    adapter = new GoogleDriveAdapter(mockToken)
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('readJson', () => {
    it('should return null when file does not exist', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      const result = await adapter.readJson('diary.json')

      expect(result).toBeNull()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('name%3D%27diary.json%27'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        }),
      )
    })

    it('should return parsed CloudData when file exists', async () => {
      const cloudData = makeCloudData({ syncedAt: '2024-06-01T12:00:00.000Z' })
      // First call: find file ID
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'file-123', name: 'diary.json' }] }),
      )
      // Second call: download file content
      fetchSpy.mockResolvedValueOnce(jsonResponse(cloudData))

      const result = await adapter.readJson('diary.json')

      expect(result).toEqual(cloudData)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      // Second call should use file ID with alt=media
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('file-123?alt=media'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token',
          }),
        }),
      )
    })

    it('should include authorization header', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      await adapter.readJson('diary.json')

      const call = fetchSpy.mock.calls[0]
      const init = call?.[1] as RequestInit | undefined
      expect((init?.headers as Record<string, string>)?.Authorization).toBe(
        'Bearer mock-access-token',
      )
    })

    it('should throw SyncError with auth kind on 401', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'auth',
      })
    })

    it('should throw SyncError with auth kind on 403', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'auth',
      })
    })

    it('should throw SyncError with server kind on 500', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'server error' }, 500))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'server',
      })
    })

    it('should throw SyncError with rate_limit kind on 429', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, 429))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'rate_limit',
      })
    })

    it('should throw SyncError with quota kind on 413', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'too large' }, 413))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'quota',
      })
    })

    it('should throw SyncError with quota kind on 507', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'insufficient storage' }, 507))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'quota',
      })
    })

    it('should throw SyncError with network kind on fetch failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'network',
      })
    })

    it('should throw SyncError with data_corrupt kind when cloud data is invalid', async () => {
      // findFileId returns existing file
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'file-123', name: 'diary.json' }] }),
      )
      // download file content - invalid data (missing required fields)
      fetchSpy.mockResolvedValueOnce(jsonResponse({ invalid: 'data' }))

      await expect(adapter.readJson('diary.json')).rejects.toMatchObject({
        kind: 'data_corrupt',
        message: expect.stringContaining('Invalid cloud data'),
      })
    })

    it('should escape single quotes in file name for findFileId query', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      await adapter.readJson("file'name.json")

      const url = fetchSpy.mock.calls[0]?.[0] as string
      // The query should contain the escaped single quote: name='file\'name.json'
      // URL-encoded, \' becomes %5C%27
      expect(url).toContain('%5C%27')
    })
  })

  describe('writeJson', () => {
    it('should create file when it does not exist', async () => {
      const cloudData = makeCloudData()
      // findFileId returns empty
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))
      // createFile POST
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 'new-file-id' }))

      await adapter.writeJson('diary.json', cloudData)

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      // Second call should be POST to upload API
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('upload/drive/v3/files?uploadType=multipart'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('should update file when it already exists', async () => {
      const cloudData = makeCloudData()
      // findFileId returns existing file
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'existing-id', name: 'diary.json' }] }),
      )
      // updateFile PATCH
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 'existing-id' }))

      await adapter.writeJson('diary.json', cloudData)

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      // Second call should be PATCH with file ID
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('upload/drive/v3/files/existing-id?uploadType=multipart'),
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })

  describe('uploadImage', () => {
    it('should create image file in appDataFolder', async () => {
      const blob = new Blob(['image-data'], { type: 'image/jpeg' })
      // findFileId returns empty
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))
      // createFile POST
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 'img-id' }))

      await adapter.uploadImage('images/abc.jpg', blob)

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('upload/drive/v3/files?uploadType=multipart'),
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('should update image if it already exists', async () => {
      const blob = new Blob(['image-data'], { type: 'image/jpeg' })
      // findFileId returns existing
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'existing-img', name: 'images/abc.jpg' }] }),
      )
      // updateFile PATCH
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 'existing-img' }))

      await adapter.uploadImage('images/abc.jpg', blob)

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('upload/drive/v3/files/existing-img?uploadType=multipart'),
        expect.objectContaining({ method: 'PATCH' }),
      )
    })
  })

  describe('downloadImage', () => {
    it('should download image blob', async () => {
      // findFileId
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'img-id', name: 'images/abc.jpg' }] }),
      )
      // download blob
      fetchSpy.mockResolvedValueOnce(blobResponse('image-binary-content'))

      const result = await adapter.downloadImage('images/abc.jpg')

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(0)
    })

    it('should throw SyncError with data_corrupt kind when image file not found', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      await expect(adapter.downloadImage('images/missing.jpg')).rejects.toMatchObject({
        kind: 'data_corrupt',
      })
    })
  })

  describe('listFiles', () => {
    it('should list files matching folder prefix', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          files: [
            { id: 'f1', name: 'images/abc.jpg' },
            { id: 'f2', name: 'images/def.jpg' },
          ],
        }),
      )

      const result = await adapter.listFiles('images/')

      expect(result).toEqual(['images/abc.jpg', 'images/def.jpg'])
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('name+contains+%27images%2F%27'),
        expect.any(Object),
      )
    })

    it('should return empty array when no files found', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      const result = await adapter.listFiles('images/')

      expect(result).toEqual([])
    })

    it('should escape single quotes in folder path for query', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      await adapter.listFiles("folder'name/")

      const url = fetchSpy.mock.calls[0]?.[0] as string
      // The query should contain the escaped single quote
      // URL-encoded, \' becomes %5C%27
      expect(url).toContain('%5C%27')
    })
  })

  describe('deleteFiles', () => {
    it('should delete each file by looking up its ID', async () => {
      // findFileId for first path
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'f1', name: 'images/abc.jpg' }] }),
      )
      // DELETE first file
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))
      // findFileId for second path
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ files: [{ id: 'f2', name: 'images/def.jpg' }] }),
      )
      // DELETE second file
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await adapter.deleteFiles(['images/abc.jpg', 'images/def.jpg'])

      expect(fetchSpy).toHaveBeenCalledTimes(4)
      // Verify DELETE calls
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/drive/v3/files/f1'),
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(fetchSpy).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('/drive/v3/files/f2'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('should skip files that do not exist', async () => {
      // findFileId returns empty (file not found)
      fetchSpy.mockResolvedValueOnce(jsonResponse({ files: [] }))

      await adapter.deleteFiles(['images/nonexistent.jpg'])

      // Only one fetch call (the findFileId), no DELETE
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle empty array', async () => {
      await adapter.deleteFiles([])

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
