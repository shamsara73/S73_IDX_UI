/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const financialRatios = sqliteTable('financial_ratios', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name'),
  sector: text('sector'),
  subSector: text('sub_sector'),
  industry: text('industry'),
  subIndustry: text('sub_industry'),
  period: integer('period'),
  assets: real('assets'),
  liabilities: real('liabilities'),
  equity: real('equity'),
  sales: real('sales'),
  ebt: real('ebt'),
  profit: real('profit'),
  eps: real('eps'),
  bookValue: real('book_value'),
  per: real('per'),
  pbv: real('pbv'),
  der: real('der'),
  roa: real('roa'),
  roe: real('roe'),
  npm: real('npm')
})
