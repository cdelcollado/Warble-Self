import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { profiles } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { ok, fail } from '../lib/errors.js'

const updateSchema = z.object({
  callsign: z.string().max(10).toUpperCase().nullable().optional(),
  country: z.string().max(2).nullable().optional(),
})

export async function profilesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/profiles/me', { preHandler: requireAuth }, async (req, reply) => {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.user!.id))

    if (!profile) return reply.status(404).send(fail('Profile not found'))
    return reply.send(ok(profile))
  })

  app.put('/profiles/me', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    const [updated] = await db
      .insert(profiles)
      .values({ id: req.user!.id, ...parsed.data })
      .onConflictDoUpdate({
        target: profiles.id,
        set: parsed.data,
      })
      .returning()

    return reply.send(ok(updated))
  })
}
