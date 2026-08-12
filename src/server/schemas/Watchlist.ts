/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const watchlist = sqliteTable('watchlist', {
  code: text('code').primaryKey(),
  addedAt: text('added_at')
})
