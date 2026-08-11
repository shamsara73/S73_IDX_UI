/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import type { Context } from '@neabyte/deserve'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import Utils from '@app/server/Utils.ts'

interface PortfolioRow {
  id: number
  code: string
  name: string | null
  sector: string | null
  shares: number
  avgCost: number
  note: string | null
  price: number | null
  costBasis: number
  marketValue: number | null
  pnl: number | null
  pnlPct: number | null
  divPerShare12m: number | null
  divAccrual: number | null
  addedAt: string | null
}

export async function GET(ctx: Context) {
  const rows = await Database.select().from(Schemas.portfolio).orderBy(asc(Schemas.portfolio.code))
  if (rows.length === 0) {
    return ctx.send.json({ data: [], summary: null })
  }

  const codes = rows.map((r) => r.code)
  const latestDate = await Database.select({ date: Schemas.summary.date })
    .from(Schemas.summary)
    .orderBy(desc(Schemas.summary.date))
    .limit(1)
  const dateInt = latestDate[0]?.date ?? null
  const priceRows = dateInt == null
    ? []
    : await Database.select({
        stockCode: Schemas.summary.stockCode,
        priceClose: Schemas.summary.priceClose
      })
        .from(Schemas.summary)
        .where(and(eq(Schemas.summary.date, dateInt), sql`${Schemas.summary.stockCode} IN ${codes}`))
  const codeToPrice = new Map(priceRows.map((r) => [r.stockCode, r.priceClose]))

  const infoRows = await Database.select({
    code: Schemas.screener.code,
    name: Schemas.screener.name,
    sector: Schemas.screener.sector
  })
    .from(Schemas.screener)
    .where(sql`${Schemas.screener.code} IN ${codes}`)
  const codeToInfo = new Map(infoRows.map((r) => [r.code, r]))

  // Trailing 12-month dividends per share
  const nowTs = Date.now()
  const cutoff365 = nowTs - 365 * 86400000
  const divRows = await Database.select({
    code: Schemas.dividends.code,
    cashDividend: Schemas.dividends.cashDividend,
    recordDate: Schemas.dividends.recordDate
  }).from(Schemas.dividends)
  const divSum = new Map<string, number>()
  for (const d of divRows) {
    const ts = Utils.dateToTimestamp(d.recordDate)
    if (ts == null || ts < cutoff365) {
      continue
    }
    divSum.set(d.code, (divSum.get(d.code) ?? 0) + (d.cashDividend ?? 0))
  }

  const data: PortfolioRow[] = rows.map((r) => {
    const price = codeToPrice.get(r.code) ?? null
    const costBasis = r.shares * r.avgCost
    const marketValue = price != null ? r.shares * price : null
    const pnl = marketValue != null ? marketValue - costBasis : null
    const pnlPct = pnl != null && costBasis > 0 ? pnl / costBasis : null
    const divPerShare12m = divSum.get(r.code) ?? null
    const divAccrual = divPerShare12m != null ? divPerShare12m * r.shares : null
    return {
      id: r.id,
      code: r.code,
      name: codeToInfo.get(r.code)?.name ?? null,
      sector: codeToInfo.get(r.code)?.sector ?? null,
      shares: r.shares,
      avgCost: r.avgCost,
      note: r.note,
      price,
      costBasis,
      marketValue,
      pnl,
      pnlPct,
      divPerShare12m,
      divAccrual,
      addedAt: r.addedAt
    }
  })

  const costBasisTotal = data.reduce((acc, r) => acc + r.costBasis, 0)
  const marketValueTotal = data.reduce((acc, r) => acc + (r.marketValue ?? 0), 0)
  const pnlTotal = marketValueTotal - costBasisTotal
  const divAccrualTotal = data.reduce((acc, r) => acc + (r.divAccrual ?? 0), 0)

  return ctx.send.json({
    data,
    summary: {
      costBasis: costBasisTotal,
      marketValue: marketValueTotal,
      pnl: pnlTotal,
      pnlPct: costBasisTotal > 0 ? pnlTotal / costBasisTotal : null,
      divAccrual: divAccrualTotal,
      divYieldOnCost: costBasisTotal > 0 ? divAccrualTotal / costBasisTotal : null
    }
  })
}

export async function POST(ctx: Context) {
  const body = await ctx.get.body<{
    code?: unknown
    shares?: unknown
    avgCost?: unknown
    note?: unknown
  }>()
  const code = String(body.code ?? '').trim().toUpperCase()
  const shares = Number(body.shares)
  const avgCost = Number(body.avgCost)
  if (code === '' || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avgCost) || avgCost <= 0) {
    return ctx.send.json({ error: 'code, shares, dan avgCost wajib diisi (angka positif)' }, { status: 400 })
  }
  const existing = await Database.select().from(Schemas.portfolio).where(eq(Schemas.portfolio.code, code)).limit(1)
  const note = typeof body.note === 'string' ? body.note : null
  const existingRow = existing[0]
  if (existingRow != null) {
    const updated = await Database.update(Schemas.portfolio)
      .set({ shares: Math.round(shares), avgCost, note, addedAt: existingRow.addedAt })
      .where(eq(Schemas.portfolio.id, existingRow.id))
      .returning()
    return ctx.send.json({ data: updated[0] })
  }
  const created = await Database.insert(Schemas.portfolio)
    .values({ code, shares: Math.round(shares), avgCost, note, addedAt: new Date().toISOString() })
    .returning()
  return ctx.send.json({ data: created[0] })
}

export async function DELETE(ctx: Context) {
  const code = Utils.queryString(ctx.get.query('code'))?.trim().toUpperCase() ?? ''
  if (code === '') {
    return ctx.send.json({ error: 'code wajib diisi' }, { status: 400 })
  }
  await Database.delete(Schemas.portfolio).where(eq(Schemas.portfolio.code, code))
  return ctx.send.json({ ok: true })
}
