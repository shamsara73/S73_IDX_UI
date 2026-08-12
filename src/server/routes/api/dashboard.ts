/**
 * GET /api/dashboard — aggregated beranda data (one round-trip).
 */

import type { Context } from '@neabyte/deserve'
import { Dashboard } from '@app/server/services/Dashboard.ts'

export async function GET(ctx: Context) {
  const data = await Dashboard.fetchAll()
  return ctx.send.json(data)
}
