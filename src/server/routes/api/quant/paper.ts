/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * GET /api/quant/paper — returns simulated portfolio summary, open positions, recent trades, and risk metrics.
 * POST /api/quant/paper/order — execute manual/automated paper buy or sell orders.
 */

import type { Context } from '@neabyte/deserve'
import { PaperTradingEngine } from '@app/server/services/PaperTradingEngine.ts'

export async function GET(ctx: Context) {
  try {
    const summary = await PaperTradingEngine.getSummary()
    return ctx.send.json({ ok: true, data: summary })
  } catch (error) {
    return ctx.send.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(ctx: Context) {
  try {
    const body = await ctx.get.body<{
      action: 'BUY' | 'SELL'
      code: string
      price: number
      atr14?: number | null
      shares?: number
      signalGrade?: string
      reason?: string
    }>()

    if (!body || !body.code || !body.price || !body.action) {
      return ctx.send.json({ ok: false, error: 'code, price, and action (BUY/SELL) are required' }, { status: 400 })
    }

    if (body.action === 'BUY') {
      const res = await PaperTradingEngine.executeBuy(
        body.code,
        body.price,
        body.atr14 ?? null,
        body.signalGrade ?? 'AAA',
        body.reason ?? 'MANUAL_QUANT'
      )
      return ctx.send.json({ ok: true, trade: res })
    } else {
      const res = await PaperTradingEngine.executeSell(
        body.code,
        body.price,
        body.shares,
        body.reason ?? 'MANUAL_EXIT'
      )
      return ctx.send.json({ ok: true, trade: res })
    }
  } catch (error) {
    return ctx.send.json({ ok: false, error: (error as Error).message }, { status: 400 })
  }
}
