import type { FastifyInstance } from 'fastify'
import { eq, and, avg, count, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { codefileRatings, codefiles } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { ok, fail } from '../lib/errors.js'

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
})

async function recalculateRating(codefileId: string): Promise<void> {
  const [result] = await db
    .select({
      avgRating: avg(codefileRatings.rating),
      ratingCount: count(codefileRatings.id),
    })
    .from(codefileRatings)
    .where(eq(codefileRatings.codefileId, codefileId))

  await db
    .update(codefiles)
    .set({
      avgRating: result.avgRating ? Number(result.avgRating) : 0,
      ratingCount: result.ratingCount,
    })
    .where(eq(codefiles.id, codefileId))
}

export async function ratingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/codefiles/:id/ratings', async (req, reply) => {
    const { id } = req.params as { id: string }
    const rows = await db
      .select()
      .from(codefileRatings)
      .where(eq(codefileRatings.codefileId, id))
    return reply.send(ok(rows))
  })

  app.put('/codefiles/:id/ratings', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = ratingSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    const [upserted] = await db
      .insert(codefileRatings)
      .values({ codefileId: id, userId: req.user!.id, rating: parsed.data.rating })
      .onConflictDoUpdate({
        target: [codefileRatings.codefileId, codefileRatings.userId],
        set: { rating: parsed.data.rating },
      })
      .returning()

    await recalculateRating(id)
    return reply.send(ok(upserted))
  })

  app.delete('/codefiles/:id/ratings', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }

    await db
      .delete(codefileRatings)
      .where(and(
        eq(codefileRatings.codefileId, id),
        eq(codefileRatings.userId, req.user!.id),
      ))

    await recalculateRating(id)
    return reply.send(ok(null))
  })
}
