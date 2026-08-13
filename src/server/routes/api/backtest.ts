/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import type { Context } from '@neabyte/deserve'
import Utils from '@app/server/Utils.ts'
import { Backtest } from '@app/server/services/Backtest.ts'
import type { BacktestStrategy, RebalanceWeeks } from '@app/server/services/Backtest.ts'

const VALID_STRATEGIES = new Set([
  'momentum', 'rsi', 'value', 'dividend', 'quality',
  'foreignFlow', 'breakout', 'meanReversion', 'custom'
])

export async function GET(ctx: Context) {
  const strategyRaw = Utils.queryString(ctx.get.query('strategy'))
  const strategy: BacktestStrategy = VALID_STRATEGIES.has(strategyRaw ?? '') ? (strategyRaw as BacktestStrategy) : 'momentum'
  const topN = Math.min(50, Math.max(1, Number(Utils.queryString(ctx.get.query('topN')) ?? 10) || 10))
  const rwRaw = Number(Utils.queryString(ctx.get.query('rebalanceWeeks')))
  const rebalanceWeeks: RebalanceWeeks = rwRaw === 12 || rwRaw === 26 ? rwRaw : 4
  const startDate = Number(Utils.queryString(ctx.get.query('startDate')))
  const minValueRaw = Number(Utils.queryString(ctx.get.query('minValue')))
  const excludeNotation = Utils.parseBoolean(Utils.queryString(ctx.get.query('excludeNotation')))
  const minValue = Number.isFinite(minValueRaw) && minValueRaw > 0 ? minValueRaw : undefined
  const validStart = Number.isFinite(startDate) && startDate >= 20240101 && startDate <= 20260811

  // Custom strategy params
  const custom = strategy === 'custom' ? {
    perMax: Number(Utils.queryString(ctx.get.query('perMax'))) || undefined,
    roeMin: Number(Utils.queryString(ctx.get.query('roeMin'))) || undefined,
    derMax: Number(Utils.queryString(ctx.get.query('derMax'))) || undefined,
    yieldMin: Number(Utils.queryString(ctx.get.query('yieldMin'))) || undefined
  } : undefined

  const result = await Backtest.run({
    strategy,
    topN,
    rebalanceWeeks,
    startDate: validStart ? startDate : 20240811,
    ...(minValue !== undefined ? { minValue } : {}),
    excludeNotation,
    ...(custom != null ? { custom } : {})
  })
  return ctx.send.json(result)
}
