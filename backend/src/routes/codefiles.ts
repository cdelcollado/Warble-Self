import type { FastifyInstance } from 'fastify'
import { eq, ilike, or, desc, asc, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { codefiles, profiles } from '../db/schema.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { ok, fail } from '../lib/errors.js'
import { uploadFile, deleteFile, downloadFile, getPresignedUrl } from '../storage/minio.js'

const PAGE_SIZE = 20

const filtersSchema = z.object({
  search: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  country: z.string().optional(),
  sortBy: z.enum(['newest', 'downloads', 'rating']).optional().default('newest'),
  page: z.coerce.number().int().min(0).optional().default(0),
})

const ALLOWED_EXTENSIONS = /\.(img|csv|ddmr)$/i
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function codefilesRoutes(app: FastifyInstance): Promise<void> {
  // ── List ────────────────────────────────────────────────────────────────────
  app.get('/codefiles', { preHandler: optionalAuth }, async (req, reply) => {
    const parsed = filtersSchema.safeParse(req.query)
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    const { search, brand, model, country, sortBy, page } = parsed.data
    const offset = page * PAGE_SIZE

    const conditions = []

    if (search?.trim()) {
      const term = `%${search.trim()}%`
      conditions.push(or(
        ilike(codefiles.title, term),
        ilike(codefiles.brand, term),
        ilike(codefiles.model, term),
        ilike(codefiles.country, term),
      ))
    }
    if (brand) conditions.push(eq(codefiles.brand, brand))
    if (model) conditions.push(eq(codefiles.model, model))
    if (country) conditions.push(ilike(codefiles.country, `%${country}%`))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const orderBy =
      sortBy === 'downloads' ? desc(codefiles.downloads)
      : sortBy === 'rating' ? desc(codefiles.avgRating)
      : desc(codefiles.createdAt)

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: codefiles.id,
          authorId: codefiles.authorId,
          title: codefiles.title,
          description: codefiles.description,
          brand: codefiles.brand,
          model: codefiles.model,
          country: codefiles.country,
          region: codefiles.region,
          filePath: codefiles.filePath,
          fileFormat: codefiles.fileFormat,
          downloads: codefiles.downloads,
          avgRating: codefiles.avgRating,
          ratingCount: codefiles.ratingCount,
          createdAt: codefiles.createdAt,
          updatedAt: codefiles.updatedAt,
          profiles: { callsign: profiles.callsign },
        })
        .from(codefiles)
        .leftJoin(profiles, eq(codefiles.authorId, profiles.id))
        .where(where)
        .orderBy(orderBy)
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(codefiles)
        .where(where),
    ])

    return reply.send(ok(rows, { total: count, page, pageSize: PAGE_SIZE }))
  })

  // ── Get single ──────────────────────────────────────────────────────────────
  app.get('/codefiles/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const [row] = await db
      .select({
        id: codefiles.id,
        authorId: codefiles.authorId,
        title: codefiles.title,
        description: codefiles.description,
        brand: codefiles.brand,
        model: codefiles.model,
        country: codefiles.country,
        region: codefiles.region,
        filePath: codefiles.filePath,
        fileFormat: codefiles.fileFormat,
        downloads: codefiles.downloads,
        avgRating: codefiles.avgRating,
        ratingCount: codefiles.ratingCount,
        createdAt: codefiles.createdAt,
        updatedAt: codefiles.updatedAt,
        profiles: { callsign: profiles.callsign },
      })
      .from(codefiles)
      .leftJoin(profiles, eq(codefiles.authorId, profiles.id))
      .where(eq(codefiles.id, id))

    if (!row) return reply.status(404).send(fail('Codefile not found'))
    return reply.send(ok(row))
  })

  // ── Upload ──────────────────────────────────────────────────────────────────
  app.post('/codefiles', { preHandler: requireAuth }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.status(400).send(fail('No file provided'))

    if (!ALLOWED_EXTENSIONS.test(data.filename)) {
      return reply.status(400).send(fail('Invalid file format. Allowed: .img, .csv, .ddmr'))
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer)
    }
    if (data.file.truncated) {
      return reply.status(400).send(fail('File too large (max 10 MB)'))
    }
    const fileBuffer = Buffer.concat(chunks)

    const fields = data.fields as Record<string, { value: string }>
    const bodySchema = z.object({
      title: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      brand: z.string().min(1),
      model: z.string().min(1),
      country: z.string().min(1).max(60),
      region: z.string().max(60).optional(),
    })

    const parsed = bodySchema.safeParse({
      title: fields.title?.value,
      description: fields.description?.value,
      brand: fields.brand?.value,
      model: fields.model?.value,
      country: fields.country?.value,
      region: fields.region?.value,
    })
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    const ext = data.filename.match(/\.(img|csv|ddmr)$/i)?.[1]?.toLowerCase() ?? 'img'
    const filePath = `${req.user!.id}/${Date.now()}_${data.filename}`

    await uploadFile(filePath, fileBuffer)

    try {
      const [created] = await db.insert(codefiles).values({
        authorId: req.user!.id,
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() ?? null,
        brand: parsed.data.brand,
        model: parsed.data.model,
        country: parsed.data.country.trim(),
        region: parsed.data.region?.trim() ?? null,
        filePath,
        fileFormat: ext,
        downloads: 0,
      }).returning()

      return reply.status(201).send(ok(created))
    } catch (err) {
      // Rollback MinIO upload on DB failure
      await deleteFile(filePath).catch(() => undefined)
      throw err
    }
  })

  // ── Delete ──────────────────────────────────────────────────────────────────
  app.delete('/codefiles/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [codefile] = await db.select().from(codefiles).where(eq(codefiles.id, id))
    if (!codefile) return reply.status(404).send(fail('Codefile not found'))
    if (codefile.authorId !== req.user!.id) return reply.status(403).send(fail('Forbidden'))

    await deleteFile(codefile.filePath).catch(() => undefined)
    await db.delete(codefiles).where(eq(codefiles.id, id))

    return reply.send(ok(null))
  })

  // ── Download (increment counter + presigned URL) ─────────────────────────────
  app.post('/codefiles/:id/download', async (req, reply) => {
    const { id } = req.params as { id: string }

    const [codefile] = await db
      .update(codefiles)
      .set({ downloads: sql`downloads + 1` })
      .where(eq(codefiles.id, id))
      .returning()

    if (!codefile) return reply.status(404).send(fail('Codefile not found'))

    const url = await getPresignedUrl(codefile.filePath)
    return reply.send(ok({ url, filename: codefile.filePath.split('/').pop() }))
  })

  // ── Buffer (for preview) ────────────────────────────────────────────────────
  app.get('/codefiles/:id/buffer', async (req, reply) => {
    const { id } = req.params as { id: string }

    const [codefile] = await db.select().from(codefiles).where(eq(codefiles.id, id))
    if (!codefile) return reply.status(404).send(fail('Codefile not found'))

    const buffer = await downloadFile(codefile.filePath)
    return reply
      .header('Content-Type', 'application/octet-stream')
      .send(buffer)
  })
}
