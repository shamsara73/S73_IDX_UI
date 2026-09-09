/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * GET /api/quant/rankings — returns latest machine learning quant factor predictions & model metrics.
 */

import type { Context } from '@neabyte/deserve'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { desc, eq } from 'drizzle-orm'

export async function GET(ctx: Context) {
  try {
    // Get latest date from quant_predictions
    const latestRow = await Database.select({ date: Schemas.quantPredictions.date })
      .from(Schemas.quantPredictions)
      .orderBy(desc(Schemas.quantPredictions.date))
      .limit(1)

    if (latestRow.length === 0 || !latestRow[0]?.date) {
      return ctx.send.json({ ok: false, message: 'No quant predictions available yet.' }, { status: 404 })
    }

    const latestDate = latestRow[0].date

    // Fetch top quant predictions for latest date
    const rows = await Database.select()
      .from(Schemas.quantPredictions)
      .where(eq(Schemas.quantPredictions.date, latestDate))
      .orderBy(desc(Schemas.quantPredictions.aiScore5d))

    // Summary stats
    const topPicks = rows.slice(0, 30)

    return ctx.send.json({
      ok: true,
      date: latestDate,
      totalStocks: rows.length,
      topPicks,
      allPicks: rows
    })
  } catch (error) {
    return ctx.send.json({
      ok: false,
      error: 'Failed to retrieve quant rankings.',
      details: String(error)
    }, { status: 500 })
  }
}
