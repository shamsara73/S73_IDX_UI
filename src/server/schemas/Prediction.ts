/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const predictionResults = sqliteTable('prediction_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  predType: text('pred_type').notNull(),
  date: integer('date').notNull(),
  predPrice: real('pred_price'),
  resultPrice: real('result_price'),
  resultChangePct: real('result_change_pct'),
  outcome: text('outcome').notNull()
})
