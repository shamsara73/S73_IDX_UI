/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * POST /api/admin/features/compute — trigger daily feature computation.
 * Body: { date?: number } — defaults to today (YYYYMMDD)
 */

import type { Context } from '@neabyte/deserve'
import DailyFeature from '@app/server/services/DailyFeature.ts'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { eq } from 'drizzle-orm'

function todayDateInt(): number {
  const n = new Date()
  return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate()
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{ date?: number }>()
  const targetDate = body.date ?? todayDateInt()

  try {
    await DailyFeature.computeForDate(targetDate)
    const count = await Database.select({ code: Schemas.dailyFeatures.code })
      .from(Schemas.dailyFeatures)
      .where(eq(Schemas.dailyFeatures.date, targetDate))
    return ctx.send.json({ ok: true, date: targetDate, processed: count.length })
  } catch (error) {
    return ctx.send.json({ ok: false, error: String(error).slice(0, 500) }, { status: 500 })
  }
}
