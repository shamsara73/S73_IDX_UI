/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const dividends = sqliteTable('dividends', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name'),
  cashDividend: real('cash_dividend'),
  cumDividend: text('cum_dividend'),
  exDividend: text('ex_dividend'),
  recordDate: text('record_date'),
  paymentDate: text('payment_date'),
  period: integer('period')
})
