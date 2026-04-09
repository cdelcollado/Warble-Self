/**
 * Admin routes tests.
 *
 * Critical path: requireAdmin middleware must reject all requests without the
 * correct ADMIN_SECRET. A bug here means any stranger can delete content.
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import { buildApp } from './helpers/build-app.js'

// ── Mock DB and storage so tests don't need a real Postgres/MinIO ─────────────
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../storage/minio.js', () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  ensureBucket: vi.fn().mockResolvedValue(undefined),
}))

const app = buildApp()

beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

describe('Admin routes — requireAdmin middleware', () => {
  const ADMIN_SECRET = 'test-admin-secret-abc123'

  beforeEach(() => {
    process.env.ADMIN_SECRET = ADMIN_SECRET
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ success: false })
  })

  it('returns 401 when Authorization header has wrong secret', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when Authorization header uses non-Bearer scheme', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { Authorization: `Basic ${ADMIN_SECRET}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 503 when ADMIN_SECRET env var is not set', async () => {
    delete process.env.ADMIN_SECRET
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { Authorization: 'Bearer anything' },
    })
    expect(res.statusCode).toBe(503)
    process.env.ADMIN_SECRET = ADMIN_SECRET
  })

  it('returns 200 with correct Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ success: true })
  })

  it('DELETE /admin/codefiles/:id returns 404 for unknown codefile', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/admin/codefiles/00000000-0000-0000-0000-000000000000',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /admin/comments/:id returns 404 for unknown comment', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/admin/comments/00000000-0000-0000-0000-000000000000',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
