/**
 * GET /api/stock/:code/pivots — pivot points + ATR-based stop/target for a stock.
 */

import type { Context } from '@neabyte/deserve'
import { desc, eq, sql } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { computeTradingSignals } from '@app/server/services/TradingHelper.ts'

export async function GET(ctx: Context) {
  const code = (ctx.get.param('code') ?? '').toUpperCase()
  if (code === '') {
    return ctx.send.json({ error: 'code param wajib' }, { status: 400 })
  }

  const rows = await Database.select({
    date: Schemas.summary.date,
    priceHigh: Schemas.summary.priceHigh,
    priceLow: Schemas.summary.priceLow,
    priceClose: Schemas.summary.priceClose
  })
    .from(Schemas.summary)
    .where(eq(Schemas.summary.stockCode, code))
    .orderBy(desc(Schemas.summary.date))
    .limit(30)

  if (rows.length < 2) {
    return ctx.send.json({ code, error: 'Data tidak cukup' }, { status: 404 })
  }

  const bars = rows
    .filter(
      (r) =>
        r.priceHigh != null &&
        r.priceLow != null &&
        r.priceClose != null &&
        r.priceHigh > 0 &&
        r.priceLow > 0 &&
        r.priceClose > 0
    )
    .map((r) => ({ h: r.priceHigh!, l: r.priceLow!, c: r.priceClose! }))
    .reverse()

  if (bars.length < 2) {
    return ctx.send.json({ code, error: 'Data OHLC tidak valid' }, { status: 404 })
  }

  const latest = bars[bars.length - 1]!
  const signals = computeTradingSignals(latest, bars)

  return ctx.send.json({
    code,
    latestDate: rows[0]?.date ?? null,
    latestBar: latest,
    ...signals
  })
}
