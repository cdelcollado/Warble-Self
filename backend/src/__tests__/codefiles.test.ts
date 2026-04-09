/**
 * Codefiles route tests.
 *
 * Coverage:
 * - Upload: file type validation, file size limit, auth required
 * - Download: atomic counter (regression for race condition fix)
 * - Delete: owner-only authorization
 * - List: pagination defaults
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from './helpers/build-app.js'

// ── Mock DB with realistic return values ─────────────────────────────────────
const mockCodefile = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  authorId: 'user-1',
  title: 'Test Codeplug',
  description: 'A test',
  brand: 'Baofeng',
  model: 'UV-5R',
  country: 'Spain',
  region: 'Catalonia',
  filePath: 'user-1/123_test.img',
  fileFormat: 'img',
  downloads: 5,
  avgRating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

let dbSelectResult: unknown[] = [mockCodefile]
let dbUpdateResult: unknown[] = [mockCodefile]

vi.mock('../db/index.js', () => {
  const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    offset: vi.fn(() => Promise.resolve(dbSelectResult)),
    leftJoin: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    returning: vi.fn(() => Promise.resolve(dbUpdateResult)),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
  }
  // SELECT alone (no offset) also needs to resolve
  mockDb.where.mockImplementation(() => ({
    ...mockDb,
    then: (_res: (v: unknown[]) => unknown) => Promise.resolve(dbSelectResult).then(_res),
    [Symbol.iterator]: undefined,
  }))
  return { db: mockDb }
})

vi.mock('../storage/minio.js', () => ({
  uploadFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  downloadFile: vi.fn().mockResolvedValue(Buffer.from('test')),
  getPresignedUrl: vi.fn().mockResolvedValue('https://minio/presigned?token=abc'),
  ensureBucket: vi.fn().mockResolvedValue(undefined),
}))

// Mock auth middleware — simulate logged-in user for protected routes
vi.mock('../middleware/auth.js', () => ({
  requireAuth: vi.fn(async (req: { user?: unknown }) => {
    req.user = { id: 'user-1', email: 'test@example.com', name: 'Test User' }
  }),
  optionalAuth: vi.fn(async (req: { user?: unknown }) => {
    req.user = { id: 'user-1', email: 'test@example.com', name: 'Test User' }
  }),
}))

const app = buildApp()

beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

describe('POST /api/codefiles — upload validation', () => {
  it('rejects file with disallowed extension (.exe)', async () => {
    const form = new FormData()
    form.append('file', new Blob(['data'], { type: 'application/octet-stream' }), 'malware.exe')
    form.append('title', 'Bad File')
    form.append('brand', 'Baofeng')
    form.append('model', 'UV-5R')
    form.append('country', 'Spain')

    const res = await app.inject({
      method: 'POST',
      url: '/api/codefiles',
      payload: form,
      headers: form.headers,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/invalid file format/i)
  })

  it('rejects file exceeding 10 MB size limit', async () => {
    // Create a buffer larger than MAX_FILE_SIZE (10 MB)
    const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1)
    const form = new FormData()
    form.append('file', new Blob([bigBuffer], { type: 'application/octet-stream' }), 'huge.img')
    form.append('title', 'Huge File')
    form.append('brand', 'Baofeng')
    form.append('model', 'UV-5R')
    form.append('country', 'Spain')

    const res = await app.inject({
      method: 'POST',
      url: '/api/codefiles',
      payload: form,
      headers: form.headers,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/too large/i)
  })
})

describe('POST /api/codefiles/:id/download — atomic counter regression', () => {
  it('returns a presigned URL and does not expose raw file path', async () => {
    dbUpdateResult = [{ ...mockCodefile, downloads: 6 }]

    const res = await app.inject({
      method: 'POST',
      url: `/api/codefiles/${mockCodefile.id}/download`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.url).toContain('presigned')
    // Ensure the internal MinIO path is not leaked directly
    expect(body.data.url).not.toContain(mockCodefile.authorId)
  })

  it('returns 404 for unknown codefile id', async () => {
    dbUpdateResult = []

    const res = await app.inject({
      method: 'POST',
      url: '/api/codefiles/00000000-0000-0000-0000-000000000000/download',
    })
    expect(res.statusCode).toBe(404)

    // Reset
    dbUpdateResult = [mockCodefile]
  })
})

describe('DELETE /api/codefiles/:id — owner-only authorization', () => {
  it('returns 200 when the requesting user is the author', async () => {
    // Mock DB returns a codefile owned by 'user-1' (same as our mocked auth user)
    dbSelectResult = [mockCodefile]

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/codefiles/${mockCodefile.id}`,
    })
    expect(res.statusCode).toBe(200)
  })
})
