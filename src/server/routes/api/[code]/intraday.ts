/**
 * GET /api/:code/intraday — intraday tick bars + opening range for today.
 */

import type { Context } from '@neabyte/deserve'
import { Realtime } from '@app/server/services/Realtime.ts'

export async function GET(ctx: Context) {
  const code = (ctx.get.param('code') ?? '').toUpperCase()
  if (code === '') {
    return ctx.send.json({ error: 'code wajib' }, { status: 400 })
  }
  const data = await Realtime.getIntraday(code)
  return ctx.send.json(data)
}
