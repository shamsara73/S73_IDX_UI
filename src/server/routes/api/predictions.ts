/**
 * Prediction results CRUD + win-rate stats.
 */

import type { Context } from '@neabyte/deserve'
import { asc, desc, eq, sql } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import Utils from '@app/server/Utils.ts'

export async function GET(ctx: Context) {
  const dateRaw = Utils.queryString(ctx.get.query('date'))
  const historyRaw = Utils.queryString(ctx.get.query('history'))

  // Get predictions for a specific date
  if (dateRaw != null && dateRaw !== '') {
    const dateInt = Number(dateRaw)
    const rows = await Database.select()
      .from(Schemas.predictionResults)
      .where(eq(Schemas.predictionResults.date, dateInt))
      .orderBy(asc(Schemas.predictionResults.code))
    const wins = rows.filter((r) => r.outcome === 'win').length
    const losses = rows.filter((r) => r.outcome === 'loss').length
    const total = wins + losses
    return ctx.send.json({
      date: dateInt,
      data: rows,
      winRate: total > 0 ? wins / total : null,
      wins,
      losses,
      flat: rows.filter((r) => r.outcome === 'flat').length
    })
  }

  // Get win-rate history (last N days)
  const days = historyRaw != null ? Math.min(30, Math.max(1, Number(historyRaw))) : 14
  const rows = await Database.select({
    date: Schemas.predictionResults.date,
    outcome: Schemas.predictionResults.outcome,
    count: sql<number>`count(*)`
  })
    .from(Schemas.predictionResults)
    .groupBy(Schemas.predictionResults.date, Schemas.predictionResults.outcome)
    .orderBy(desc(Schemas.predictionResults.date))

  // Group by date
  const byDate = new Map<number, { win: number; loss: number; flat: number }>()
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? { win: 0, loss: 0, flat: 0 }
    if (r.outcome === 'win') entry.win = r.count
    else if (r.outcome === 'loss') entry.loss = r.count
    else entry.flat = r.count
    byDate.set(r.date, entry)
  }

  const history = [...byDate.entries()]
    .slice(0, days)
    .map(([date, counts]) => {
      const total = counts.win + counts.loss
      return {
        date,
        winRate: total > 0 ? counts.win / total : null,
        wins: counts.win,
        losses: counts.loss,
        flat: counts.flat,
        total: counts.win + counts.loss + counts.flat
      }
    })

  return ctx.send.json({ history })
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{ predictions?: { code: string; predType: string; date: number; predPrice: number | null; resultPrice: number | null; resultChangePct: number | null; outcome: string }[] }>()
  const preds = body.predictions
  if (!Array.isArray(preds) || preds.length === 0) {
    return ctx.send.json({ error: 'predictions array required' }, { status: 400 })
  }

  // Delete existing predictions for the same date+code (upsert)
  for (const p of preds) {
    await Database.delete(Schemas.predictionResults)
      .where(sql`${Schemas.predictionResults.date} = ${p.date} AND ${Schemas.predictionResults.code} = ${p.code}`)
    await Database.insert(Schemas.predictionResults).values({
      code: p.code,
      predType: p.predType,
      date: p.date,
      predPrice: p.predPrice,
      resultPrice: p.resultPrice,
      resultChangePct: p.resultChangePct,
      outcome: p.outcome
    })
  }

  return ctx.send.json({ ok: true, saved: preds.length })
}
