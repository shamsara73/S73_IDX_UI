/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const aiExplanations = sqliteTable('ai_explanations', {
  code: text('code').primaryKey(),
  date: integer('date').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at')
})
