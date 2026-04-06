import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../auth/index.js'

function toHeaders(raw: FastifyRequest['headers']): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const session = await auth.api.getSession({ headers: toHeaders(req.headers) })
  if (!session) {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
    return
  }
  req.user = session.user
  req.session = session.session
}

export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const session = await auth.api.getSession({ headers: toHeaders(req.headers) })
  if (session) {
    req.user = session.user
    req.session = session.session
  }
}

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string }
    session?: { id: string }
  }
}
