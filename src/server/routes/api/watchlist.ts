/**
 * Server-side watchlist CRUD: GET (list), POST (add), DELETE (remove).
 */

import type { Context } from '@neabyte/deserve'
import { asc, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import Utils from '@app/server/Utils.ts'

export async function GET(ctx: Context) {
  const rows = await Database.select().from(Schemas.watchlist).orderBy(asc(Schemas.watchlist.code))
  return ctx.send.json({ data: rows })
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{ code?: string }>()
  const code = body.code?.trim().toUpperCase() ?? ''
  if (code === '') {
    return ctx.send.json({ error: 'code wajib' }, { status: 400 })
  }
  await Database.insert(Schemas.watchlist)
    .values({ code, addedAt: new Date().toISOString() })
    .onConflictDoNothing()
  return ctx.send.json({ ok: true, code })
}

export async function DELETE(ctx: Context) {
  const code = (ctx.get.query('code') ?? '').trim().toUpperCase()
  if (code === '') {
    return ctx.send.json({ error: 'code wajib' }, { status: 400 })
  }
  await Database.delete(Schemas.watchlist).where(eq(Schemas.watchlist.code, code))
  return ctx.send.json({ ok: true, code })
}
