// Auth removed — single-user self-hosted instance.
// All operations are attributed to LOCAL_USER_ID.
export const LOCAL_USER_ID = 'local'

// Augment Fastify request type (kept for compatibility)
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string }
    session?: { id: string }
  }
}
