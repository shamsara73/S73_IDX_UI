/**
 * GET /api/:code/realtime — real-time quote + VWAP for a stock.
 */

import type { Context } from '@neabyte/deserve'
import { Realtime } from '@app/server/services/Realtime.ts'

export async function GET(ctx: Context) {
  const code = (ctx.get.param('code') ?? '').toUpperCase()
  if (code === '') {
    return ctx.send.json({ error: 'code wajib' }, { status: 400 })
  }
  const quote = await Realtime.getQuote(code)
  return ctx.send.json(quote)
}
