import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision,
  unique,
  boolean,
} from 'drizzle-orm/pg-core'

// ── Better Auth tables ────────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

// ── Application tables ────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  callsign: text('callsign'),
  country: text('country'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const codefiles = pgTable('codefiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: text('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  country: text('country').notNull(),
  region: text('region'),
  filePath: text('file_path').notNull(),
  fileFormat: text('file_format').notNull(), // 'img' | 'csv' | 'ddmr'
  downloads: integer('downloads').default(0).notNull(),
  avgRating: doublePrecision('avg_rating').default(0).notNull(),
  ratingCount: integer('rating_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const codefileRatings = pgTable('codefile_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  codefileId: uuid('codefile_id').notNull().references(() => codefiles.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('uq_rating_user_codefile').on(table.codefileId, table.userId),
])

export const codefileComments = pgTable('codefile_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  codefileId: uuid('codefile_id').notNull().references(() => codefiles.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => codefileComments.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const codefileReports = pgTable('codefile_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  codefileId: uuid('codefile_id').references(() => codefiles.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').references(() => codefileComments.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
