import type { FastifyInstance } from 'fastify'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { codefileComments, profiles } from '../db/schema.js'
import { LOCAL_USER_ID } from '../middleware/auth.js'
import { ok, fail } from '../lib/errors.js'

const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
})

export async function commentsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/codefiles/:id/comments', async (req, reply) => {
    const { id } = req.params as { id: string }

    const rows = await db
      .select({
        id: codefileComments.id,
        codefileId: codefileComments.codefileId,
        authorId: codefileComments.authorId,
        parentId: codefileComments.parentId,
        body: codefileComments.body,
        createdAt: codefileComments.createdAt,
        profiles: { callsign: profiles.callsign },
      })
      .from(codefileComments)
      .leftJoin(profiles, eq(codefileComments.authorId, profiles.id))
      .where(eq(codefileComments.codefileId, id))
      .orderBy(asc(codefileComments.createdAt))

    return reply.send(ok(rows))
  })

  app.post('/codefiles/:id/comments', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = commentSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send(fail(parsed.error.message))

    const [created] = await db
      .insert(codefileComments)
      .values({
        codefileId: id,
        authorId: LOCAL_USER_ID,
        body: parsed.data.body,
        parentId: parsed.data.parentId ?? null,
      })
      .returning()

    return reply.status(201).send(ok(created))
  })

  app.delete('/comments/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const [comment] = await db
      .select()
      .from(codefileComments)
      .where(eq(codefileComments.id, id))

    if (!comment) return reply.status(404).send(fail('Comment not found'))

    await db.delete(codefileComments).where(eq(codefileComments.parentId, id))
    await db.delete(codefileComments).where(eq(codefileComments.id, id))

    return reply.send(ok(null))
  })
}
