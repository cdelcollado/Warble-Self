import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth/index.js'
import { ensureBucket } from './storage/minio.js'
import { profilesRoutes } from './routes/profiles.js'
import { codefilesRoutes } from './routes/codefiles.js'
import { ratingsRoutes } from './routes/ratings.js'
import { commentsRoutes } from './routes/comments.js'
import { reportsRoutes } from './routes/reports.js'
import { adminRoutes } from './routes/admin.js'
import { fail } from './lib/errors.js'

const app = Fastify({ logger: true })

// ── Security headers ──────────────────────────────────────────────────────────
await app.register(helmet, { contentSecurityPolicy: false })

// ── CORS ──────────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: process.env.FRONTEND_URL!,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

// ── Rate limiting ─────────────────────────────────────────────────────────────
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// ── Multipart (file uploads) ──────────────────────────────────────────────────
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

// ── Better Auth — must run before Fastify routing ────────────────────────────
// Better Auth uses the Node.js http handler interface
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    done(null, JSON.parse(body as string))
  } catch (e) {
    done(e instanceof Error ? e : new Error(String(e)))
  }
})

const authHandler = toNodeHandler(auth)

app.addHook('onRequest', async (req, reply) => {
  if (req.url?.startsWith('/api/auth/')) {
    const origin = process.env.FRONTEND_URL!
    reply.raw.setHeader('Access-Control-Allow-Origin', origin)
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
    reply.raw.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

    if (req.method === 'OPTIONS') {
      reply.raw.writeHead(204)
      reply.raw.end()
      return
    }

    reply.hijack()
    await authHandler(req.raw, reply.raw)
  }
})

// ── Application routes ────────────────────────────────────────────────────────
await app.register(async (api) => {
  await api.register(profilesRoutes)
  await api.register(codefilesRoutes)
  await api.register(ratingsRoutes)
  await api.register(commentsRoutes)
  await api.register(reportsRoutes)
  await api.register(adminRoutes)
}, { prefix: '/api' })

// ── Global error handler ──────────────────────────────────────────────────────
app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  app.log.error(err)
  const status = err.statusCode ?? 500
  reply.status(status).send(fail(status === 500 ? 'Internal server error' : err.message))
})

// ── Start ─────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await ensureBucket()
  await app.listen({ port: 3000, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
