/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const intradayOvernightStats = sqliteTable('intraday_overnight_stats', {
  code: text('code').primaryKey(),
  lastClose: real('last_close'),
  volume20dAvg: real('volume_20d_avg'),
  rvol: real('rvol'),
  closeLocationPct: real('close_location_pct'),
  pbsjScore: real('pbsj_score'),
  pbsjWinRate20d: real('pbsj_win_rate_20d'),
  pbsjWinRate60d: real('pbsj_win_rate_60d'),
  pbsjAvgRet20d: real('pbsj_avg_ret_20d'),
  pbsjAvgRet60d: real('pbsj_avg_ret_60d'),
  avgIntradayRange20d: real('avg_intraday_range_20d'),
  sbpjScore: real('sbpj_score'),
  sbpjWinRate20d: real('sbpj_win_rate_20d'),
  sbpjWinRate60d: real('sbpj_win_rate_60d'),
  sbpjAvgRet20d: real('sbpj_avg_ret_20d'),
  sbpjAvgRet60d: real('sbpj_avg_ret_60d'),
  updatedAt: integer('updated_at').notNull()
})
