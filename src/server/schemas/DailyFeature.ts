/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const dailyFeatures = sqliteTable('daily_features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull(),
  date: integer('date').notNull(),

  // --- Price-based features ---
  close: real('close'),
  ret_1d: real('ret_1d'),
  ret_5d: real('ret_5d'),
  ret_20d: real('ret_20d'),
  ret_60d: real('ret_60d'),
  ret_120d: real('ret_120d'),

  // --- Volume / Liquidity ---
  volume: real('volume'),
  value: real('value'),
  volume_ma_20: real('volume_ma_20'),
  rvol_20: real('rvol_20'),
  turnover: real('turnover'),
  amihud_illiq: real('amihud_illiq'),

  // --- Volatility ---
  atr_14: real('atr_14'),
  atr_pct: real('atr_pct'),
  std_20: real('std_20'),
  std_60: real('std_60'),
  parkinson_hl: real('parkinson_hl'),

  // --- Trend / Momentum ---
  sma_20: real('sma_20'),
  sma_50: real('sma_50'),
  sma_200: real('sma_200'),
  ema_12: real('ema_12'),
  ema_26: real('ema_26'),
  macd: real('macd'),
  macd_signal: real('macd_signal'),
  macd_hist: real('macd_hist'),
  rsi_14: real('rsi_14'),
  stoch_k: real('stoch_k'),
  stoch_d: real('stoch_d'),
  mom_10d: real('mom_10d'),
  mom_20d: real('mom_20d'),
  adx_14: real('adx_14'),

  // --- Mean Reversion ---
  bb_upper: real('bb_upper'),
  bb_middle: real('bb_middle'),
  bb_lower: real('bb_lower'),
  bb_width: real('bb_width'),
  bb_pct_b: real('bb_pct_b'),
  zscore_20: real('zscore_20'),

  // --- Volume-Price ---
  vwap: real('vwap'),
  vwap_dist: real('vwap_dist'),
  obv: real('obv'),
  cmf_20: real('cmf_20'),
  mfi_14: real('mfi_14'),

  // --- Microstructure ---
  gap_pct: real('gap_pct'),
  gap_atr_adj: real('gap_atr_adj'),
  vwap_reclaim: integer('vwap_reclaim'), // 1 = above, -1 = below, 0 = at

  // --- Fundamental (point-in-time) ---
  per: real('per'),
  pbv: real('pbv'),
  roe: real('roe'),
  roa: real('roa'),
  der: real('der'),
  npm: real('npm'),
  div_yield: real('div_yield'),
  market_cap: real('market_cap'),
  revenue_ttm: real('revenue_ttm'),
  eps_ttm: real('eps_ttm'),
  bvps: real('bvps'),

  // --- Foreign Flow ---
  foreign_net_buy: real('foreign_net_buy'),
  foreign_pct: real('foreign_pct'),

  // --- Sector / Market ---
  sector: text('sector'),
  sector_ret_20d: real('sector_ret_20d'),
  market_ret_20d: real('market_ret_20d'),
  beta_60d: real('beta_60d'),
  sector_strength: real('sector_strength'),

  // --- Target (forward returns) ---
  fwd_ret_5d: real('fwd_ret_5d'),
  fwd_ret_10d: real('fwd_ret_10d'),
  fwd_ret_20d: real('fwd_ret_20d'),

  // --- Metadata ---
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
}, (t) => ({
  codeDateUnique: uniqueIndex('daily_features_code_date_unique').on(t.code, t.date),
}))