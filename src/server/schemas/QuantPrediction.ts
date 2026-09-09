/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const quantPredictions = sqliteTable('quant_predictions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  date: integer('date').notNull(),
  close: real('close'),
  sector: text('sector'),
  predFwd5d: real('pred_fwd_5d'),
  aiScore5d: real('ai_score_5d'),
  predFwd10d: real('pred_fwd_10d'),
  aiScore10d: real('ai_score_10d'),
  probTop10: real('prob_top10'),
  signalGrade: text('signal_grade'),
  createdAt: integer('created_at').notNull()
}, (t) => ({
  codeDateUnique: uniqueIndex('quant_predictions_code_date_unique').on(t.code, t.date),
}))
