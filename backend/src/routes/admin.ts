import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { codefiles, codefileReports, codefileComments } from '../db/schema.js'
import { deleteFile } from '../storage/minio.js'
import { ok, fail } from '../lib/errors.js'

// ── Admin auth middleware ──────────────────────────────────────────────────────
// Protected by ADMIN_SECRET env var. Set a long random string in .env.
// Usage: Authorization: Bearer <ADMIN_SECRET>
async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    reply.status(503).send(fail('Admin access not configured — set ADMIN_SECRET in .env'))
    return
  }
  const auth = req.headers.authorization
  if (auth !== `Bearer ${secret}`) {
    reply.status(401).send(fail('Unauthorized'))
    return
  }
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // ── List reports ────────────────────────────────────────────────────────────
  app.get('/admin/reports', { preHandler: requireAdmin }, async (_req, reply) => {
    const rows = await db
      .select()
      .from(codefileReports)
      .orderBy(desc(codefileReports.createdAt))
      .limit(100)

    return reply.send(ok(rows))
  })

  // ── Force-delete a codefile (bypasses owner check) ──────────────────────────
  app.delete('/admin/codefiles/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [codefile] = await db.select().from(codefiles).where(eq(codefiles.id, id))
    if (!codefile) return reply.status(404).send(fail('Codefile not found'))

    await deleteFile(codefile.filePath).catch(() => undefined)
    await db.delete(codefiles).where(eq(codefiles.id, id))

    return reply.send(ok(null))
  })

  // ── Force-delete a comment (bypasses owner check) ───────────────────────────
  app.delete('/admin/comments/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const [comment] = await db.select().from(codefileComments).where(eq(codefileComments.id, id))
    if (!comment) return reply.status(404).send(fail('Comment not found'))

    await db.delete(codefileComments).where(eq(codefileComments.id, id))
    return reply.send(ok(null))
  })
}
