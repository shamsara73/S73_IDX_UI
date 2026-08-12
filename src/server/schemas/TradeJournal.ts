/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const tradeJournal = sqliteTable('trade_journal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  direction: text('direction').notNull(),
  entryPrice: real('entry_price').notNull(),
  exitPrice: real('exit_price'),
  entryTime: text('entry_time'),
  exitTime: text('exit_time'),
  reason: text('reason'),
  pnl: real('pnl'),
  note: text('note'),
  date: integer('date')
})
