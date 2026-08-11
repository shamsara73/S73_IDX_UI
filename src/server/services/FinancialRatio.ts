/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Quarterly financial ratios (PER/PBV/ROA/ROE/DER/NPM) from the official IDX
 * endpoint LINK_FINANCIAL_DATA_RATIO. Basis for trend arrows in the screener
 * and the historical valuation backtest strategy.
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import type { Client } from '@app/server/services/Client.ts'

interface RatioRaw {
  code: string
  stockName?: string
  sector?: string
  subSector?: string
  industry?: string
  subIndustry?: string
  fsDate?: string | number
  assets?: number
  liabilities?: number
  equity?: number
  sales?: number
  ebt?: number
  eps?: number
  bookValue?: number
  per?: number
  priceBV?: number
  deRatio?: number
  roa?: number
  roe?: number
  npm?: number
}

function periodMillis(period: string | number | undefined): number | null {
  if (period == null || period === '') {
    return null
  }
  if (typeof period === 'number') {
    return Number.isFinite(period) ? period : null
  }
  const n = Number(period)
  if (Number.isFinite(n)) {
    return n > 1e12 ? n : n * 1000
  }
  const t = new Date(period).getTime()
  return Number.isFinite(t) ? t : null
}

export class FinancialRatio {
  private static readonly origin = 'https://www.idx.co.id'

  static async syncMonth(client: Client, year: number, month: number): Promise<number> {
    const pageSize = 1000
    let page = 1
    let synced = 0
    for (;;) {
      const url =
        `${FinancialRatio.origin}/primary/DigitalStatistic/GetApiDataPaginated` +
        `?urlName=LINK_FINANCIAL_DATA_RATIO&periodYear=${year}&periodMonth=${month}` +
        `&periodType=monthly&isPrint=False&cumulative=false` +
        `&pageSize=${pageSize}&pageNumber=${page}`
      const res = await client.get(url)
      if (!res.ok) {
        break
      }
      const json = (await res.json()) as { data?: RatioRaw[]; recordsTotal?: number }
      const rows = json.data ?? []
      if (rows.length === 0) {
        break
      }
      for (const item of rows) {
        const period = periodMillis(item.fsDate)
        if (period == null) {
          continue
        }
        const values = {
          id: `${item.code}-${period}`,
          code: item.code,
          name: item.stockName ?? null,
          sector: item.sector ?? null,
          subSector: item.subSector ?? null,
          industry: item.industry ?? null,
          subIndustry: item.subIndustry ?? null,
          period,
          assets: item.assets ?? null,
          liabilities: item.liabilities ?? null,
          equity: item.equity ?? null,
          sales: item.sales ?? null,
          ebt: item.ebt ?? null,
          profit: null,
          eps: item.eps ?? null,
          bookValue: item.bookValue ?? null,
          per: item.per ?? null,
          pbv: item.priceBV ?? null,
          der: item.deRatio ?? null,
          roa: item.roa ?? null,
          roe: item.roe ?? null,
          npm: item.npm ?? null
        }
        await Database.insert(Schemas.financialRatios).values(values).onConflictDoUpdate({
          target: Schemas.financialRatios.id,
          set: values
        })
        synced++
      }
      const total = Number(json.recordsTotal ?? 0)
      if (total <= 0 || page * pageSize >= total || rows.length < pageSize) {
        break
      }
      page++
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    return synced
  }

  /** Sync the last N months of quarterly ratio reports. */
  static async syncRecent(client: Client, monthsBack = 8): Promise<number> {
    const now = new Date()
    let total = 0
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      total += await FinancialRatio.syncMonth(client, d.getFullYear(), d.getMonth() + 1)
    }
    return total
  }
}
