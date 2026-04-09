/**
 * Build a Fastify test app with mocked DB and storage.
 * Uses Fastify's inject() for in-process HTTP testing — no real network or DB needed.
 */
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { profilesRoutes } from '../../routes/profiles.js'
import { codefilesRoutes } from '../../routes/codefiles.js'
import { ratingsRoutes } from '../../routes/ratings.js'
import { commentsRoutes } from '../../routes/comments.js'
import { reportsRoutes } from '../../routes/reports.js'
import { adminRoutes } from '../../routes/admin.js'
import { fail } from '../../lib/errors.js'

export function buildApp() {
  const app = Fastify({ logger: false })

  app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  // Rate limiting disabled in tests to avoid interference
  app.register(rateLimit, { max: 10000, timeWindow: '1 minute' })

  app.register(async (api) => {
    api.register(profilesRoutes)
    api.register(codefilesRoutes)
    api.register(ratingsRoutes)
    api.register(commentsRoutes)
    api.register(reportsRoutes)
    api.register(adminRoutes)
  }, { prefix: '/api' })

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode ?? 500
    reply.status(status).send(fail(status === 500 ? 'Internal server error' : err.message))
  })

  return app
}
