/**
 * GET /api/nl-screen?q=ROE di atas 15 dan DER di bawah 1
 * POST /api/nl-screen { q: "..." }
 */

import type { Context } from '@neabyte/deserve'
import * as Services from '@app/server/services/index.ts'

export async function GET(ctx: Context) {
  const q = ctx.get.query('q')?.trim() ?? ''
  if (q === '') {
    return ctx.send.json({ error: 'Param q wajib diisi' }, { status: 400 })
  }
  const dateInt = Services.CronDate.todayDateInt()
  const result = await Services.NlScreen.parse(q, dateInt)
  return ctx.send.json(result)
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{ q?: string }>()
  const q = body.q?.trim() ?? ''
  if (q === '') {
    return ctx.send.json({ error: 'Param q wajib diisi' }, { status: 400 })
  }
  const dateInt = Services.CronDate.todayDateInt()
  const result = await Services.NlScreen.parse(q, dateInt)
  return ctx.send.json(result)
}
