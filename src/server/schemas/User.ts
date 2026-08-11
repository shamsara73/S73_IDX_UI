/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const savedScreens = sqliteTable('saved_screens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  filters: text('filters').notNull(),
  createdAt: text('created_at')
})
