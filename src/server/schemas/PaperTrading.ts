/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const paperPortfolios = sqliteTable('paper_portfolios', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  initialCash: real('initial_cash').notNull(),
  cash: real('cash').notNull(),
  nav: real('nav').notNull(),
  peakNav: real('peak_nav').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const paperPositions = sqliteTable('paper_positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  portfolioId: text('portfolio_id').notNull(),
  code: text('code').notNull(),
  shares: integer('shares').notNull(),
  avgBuyPrice: real('avg_buy_price').notNull(),
  currentPrice: real('current_price').notNull(),
  stopLoss: real('stop_loss'),
  takeProfit: real('take_profit'),
  signalGrade: text('signal_grade'),
  unrealizedPnl: real('unrealized_pnl').notNull(),
  unrealizedPnlPct: real('unrealized_pnl_pct').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const paperTrades = sqliteTable('paper_trades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  portfolioId: text('portfolio_id').notNull(),
  code: text('code').notNull(),
  side: text('side').notNull(), // 'BUY' | 'SELL'
  shares: integer('shares').notNull(),
  price: real('price').notNull(),
  fee: real('fee').notNull(),
  totalValue: real('total_value').notNull(),
  realizedPnl: real('realized_pnl'),
  realizedPnlPct: real('realized_pnl_pct'),
  reason: text('reason'), // 'QUANT_ALPHA_SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'MANUAL'
  timestamp: integer('timestamp').notNull()
})
