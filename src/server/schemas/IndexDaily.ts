/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const indexDaily = sqliteTable('index_daily', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  date: integer('date').notNull(),
  value: real('value').notNull()
})
