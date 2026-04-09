import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Resend } from 'resend'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { profiles } from '../db/schema.js'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (resend && process.env.FROM_EMAIL) {
        await resend.emails.send({
          from: process.env.FROM_EMAIL,
          to: user.email,
          subject: 'Reset your Warble password',
          html: `<p>Hi ${user.name ?? user.email},</p>
<p>Click the link below to reset your Warble password. This link expires in 1 hour.</p>
<p><a href="${url}">${url}</a></p>
<p>If you did not request a password reset, ignore this email.</p>`,
        })
      } else {
        // Fallback: log to console (dev mode / RESEND_API_KEY not set)
        console.log(`[Password Reset] User: ${user.email} — Reset URL: ${url}`)
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(profiles).values({
            id: user.id,
            callsign: null,
            country: null,
          }).onConflictDoNothing()
        },
      },
    },
  },
})

export type Auth = typeof auth
