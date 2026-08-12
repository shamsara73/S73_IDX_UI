/**
 * Trade journal CRUD: GET (list), POST (add), PUT (update exit), DELETE.
 */

import type { Context } from '@neabyte/deserve'
import { desc, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import Utils from '@app/server/Utils.ts'

interface JournalBody {
  id?: number
  code?: string
  direction?: string
  entryPrice?: number
  exitPrice?: number | null
  entryTime?: string | null
  exitTime?: string | null
  reason?: string | null
  note?: string | null
  pnl?: number | null
  date?: number | null
}

export async function GET(ctx: Context) {
  const rows = await Database.select().from(Schemas.tradeJournal).orderBy(desc(Schemas.tradeJournal.date), desc(Schemas.tradeJournal.id))
  return ctx.send.json({ data: rows })
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<Record<string, unknown>>()
  const code = String(body.code ?? '').trim().toUpperCase()
  const direction = String(body.direction ?? '').trim().toLowerCase()
  const entryPrice = Number(body.entryPrice)
  if (code === '' || direction === '' || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return ctx.send.json({ error: 'code, direction, entryPrice wajib' }, { status: 400 })
  }
  if (direction !== 'long' && direction !== 'short') {
    return ctx.send.json({ error: 'direction harus long atau short' }, { status: 400 })
  }
  const values = {
    code,
    direction,
    entryPrice,
    exitPrice: typeof body.exitPrice === 'number' ? body.exitPrice : null,
    entryTime: typeof body.entryTime === 'string' ? body.entryTime : null,
    exitTime: typeof body.exitTime === 'string' ? body.exitTime : null,
    reason: typeof body.reason === 'string' ? body.reason : null,
    note: typeof body.note === 'string' ? body.note : null,
    pnl: typeof body.pnl === 'number' ? body.pnl : null,
    date: typeof body.date === 'number' ? body.date : Utils.parseDate(Utils.queryString(ctx.get.query('date'))) ?? null
  }
  const inserted = await Database.insert(Schemas.tradeJournal).values(values).returning()
  return ctx.send.json({ data: inserted[0] })
}

export async function PUT(ctx: Context) {
  const body = await ctx.get.body<JournalBody>()
  const id = Number(body.id)
  if (!Number.isFinite(id) || id <= 0) {
    return ctx.send.json({ error: 'id wajib' }, { status: 400 })
  }
  const updates: Record<string, unknown> = {}
  for (const key of ['exitPrice', 'exitTime', 'pnl', 'note', 'reason'] as const) {
    if (body[key] !== undefined && body[key] !== null) {
      updates[key] = body[key]
    }
  }
  if (Object.keys(updates).length === 0) {
    return ctx.send.json({ error: 'Tidak ada field untuk diupdate' }, { status: 400 })
  }
  const updated = await Database.update(Schemas.tradeJournal).set(updates).where(eq(Schemas.tradeJournal.id, id)).returning()
  return ctx.send.json({ data: updated[0] ?? null })
}

export async function DELETE(ctx: Context) {
  const id = Number(Utils.queryString(ctx.get.query('id')))
  if (!Number.isFinite(id) || id <= 0) {
    return ctx.send.json({ error: 'id wajib' }, { status: 400 })
  }
  await Database.delete(Schemas.tradeJournal).where(eq(Schemas.tradeJournal.id, id))
  return ctx.send.json({ ok: true })
}
