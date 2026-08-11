/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const stockSplits = sqliteTable('stock_splits', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name'),
  ratio: real('ratio'),
  nominalOld: real('nominal_old'),
  nominalNew: real('nominal_new'),
  additionalShares: real('additional_shares'),
  listedShares: real('listed_shares'),
  listingDate: integer('listing_date')
})
