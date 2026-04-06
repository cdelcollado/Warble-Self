import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { codefileReports } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { ok, fail } from '../lib/errors.js'

const reportSchema = z.object({
  reason: z.string().min(1).max(500),
  codefileId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
}).refine(
  (data) => data.codefileId ?? data.commentId,
  { message: 'Either codefileId or commentId must be provided' },
)

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/reports', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    await db.insert(codefileReports).values({
      reporterId: req.user!.id,
      codefileId: parsed.data.codefileId ?? null,
      commentId: parsed.data.commentId ?? null,
      reason: parsed.data.reason,
    })

    return reply.status(201).send(ok(null))
  })
}
