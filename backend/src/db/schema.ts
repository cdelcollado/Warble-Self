import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  doublePrecision,
  unique,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
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
