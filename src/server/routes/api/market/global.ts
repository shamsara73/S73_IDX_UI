/**
 * GET /api/market/global — global market snapshot (US, IHSG, FX, commodities).
 */

import type { Context } from '@neabyte/deserve'
import { GlobalMarket } from '@app/server/services/GlobalMarket.ts'

export async function GET(ctx: Context) {
  const quotes = await GlobalMarket.fetchAll()
  return ctx.send.json({ quotes })
}
