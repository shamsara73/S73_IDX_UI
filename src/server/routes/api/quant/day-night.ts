/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * GET /api/quant/day-night — Returns ranked candidates for:
 * 1. type=pbsj (Pagi Beli Sore Jual - Day-trading intraday alpha)
 * 2. type=sbpj (Sore Beli Pagi Jual - Overnight gap alpha)
 */

import type { Context } from '@neabyte/deserve'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { desc, gte } from 'drizzle-orm'
import Utils from '@app/server/Utils.ts'

export async function GET(ctx: Context) {
  try {
    const type = (Utils.queryString(ctx.get.query('type')) ?? 'pbsj').toLowerCase()
    const limitRaw = Utils.parseNumber(Utils.queryString(ctx.get.query('limit')))
    const limit = Math.min(100, Math.max(5, limitRaw ?? 50))
    const minVol = Utils.parseNumber(Utils.queryString(ctx.get.query('minVolume'))) ?? 50000

    const rows = await Database.select()
      .from(Schemas.intradayOvernightStats)
      .where(gte(Schemas.intradayOvernightStats.volume20dAvg, minVol))
      .orderBy(type === 'sbpj' 
        ? desc(Schemas.intradayOvernightStats.sbpjScore) 
        : desc(Schemas.intradayOvernightStats.pbsjScore)
      )
      .limit(limit)

    // Join with screener info if available
    const compRows = await Database.select({
      code: Schemas.screener.code,
      name: Schemas.screener.name,
      sector: Schemas.screener.sector
    }).from(Schemas.screener)

    const compMap = new Map()
    for (const c of compRows) {
      if (c && c.code) {
        compMap.set(c.code, c)
      }
    }

    const enriched = rows.map((r, idx) => {
      const c = compMap.get(r.code)
      return {
        rank: idx + 1,
        code: r.code,
        name: c?.name ?? null,
        sector: c?.sector ?? null,
        lastClose: r.lastClose,
        volume20dAvg: r.volume20dAvg,
        rvol: r.rvol,
        closeLocationPct: r.closeLocationPct,
        // PBSJ
        pbsjScore: r.pbsjScore,
        pbsjWinRate20d: r.pbsjWinRate20d,
        pbsjWinRate60d: r.pbsjWinRate60d,
        pbsjAvgRet20d: r.pbsjAvgRet20d,
        pbsjAvgRet60d: r.pbsjAvgRet60d,
        avgIntradayRange20d: r.avgIntradayRange20d,
        // SBPJ
        sbpjScore: r.sbpjScore,
        sbpjWinRate20d: r.sbpjWinRate20d,
        sbpjWinRate60d: r.sbpjWinRate60d,
        sbpjAvgRet20d: r.sbpjAvgRet20d,
        sbpjAvgRet60d: r.sbpjAvgRet60d,
        updatedAt: r.updatedAt
      }
    })

    return ctx.send.json({
      ok: true,
      type,
      total: enriched.length,
      data: enriched
    })
  } catch (error) {
    return ctx.send.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
