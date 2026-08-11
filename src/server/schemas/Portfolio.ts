/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const portfolio = sqliteTable('portfolio', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  shares: integer('shares').notNull(),
  avgCost: real('avg_cost').notNull(),
  note: text('note'),
  addedAt: text('added_at')
})
