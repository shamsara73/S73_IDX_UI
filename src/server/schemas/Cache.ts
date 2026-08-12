/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const cacheEntries = sqliteTable('cache_entries', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at').notNull()
})
