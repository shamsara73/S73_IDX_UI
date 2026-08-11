/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import type { Context } from '@neabyte/deserve'
import { desc, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import Utils from '@app/server/Utils.ts'
import * as Schemas from '@app/server/schemas/index.ts'

export async function GET(ctx: Context) {
  const rows = await Database.select()
    .from(Schemas.savedScreens)
    .orderBy(desc(Schemas.savedScreens.createdAt))
  return ctx.send.json({ data: rows })
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{ name?: unknown; filters?: unknown }>()
  const name = String(body?.name ?? '').trim()
  if (name === '') {
    return ctx.send.json({ error: 'name required' }, { status: 400 })
  }
  const filters =
    typeof body?.filters === 'string' ? body.filters : JSON.stringify(body?.filters ?? {})
  const created = await Database.insert(Schemas.savedScreens)
    .values({ name, filters, createdAt: new Date().toISOString() })
    .returning()
  return ctx.send.json({ data: created[0] })
}

export async function DELETE(ctx: Context) {
  const id = Number(Utils.queryString(ctx.get.query('id')))
  if (!Number.isFinite(id) || id <= 0) {
    return ctx.send.json({ error: 'id required' }, { status: 400 })
  }
  await Database.delete(Schemas.savedScreens).where(eq(Schemas.savedScreens.id, id))
  return ctx.send.json({ ok: true })
}
