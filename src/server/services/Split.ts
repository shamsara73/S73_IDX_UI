/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Stock split / reverse-split events from the official IDX endpoint
 * (LINK_STOCK_SPLIT). Used to adjust price series in the backtester so
 * momentum is not distorted across split dates.
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import type { Client } from '@app/server/services/Client.ts'

interface SplitRaw {
  code: string
  stockname?: string
  Ratio?: string
  NominalValue?: number
  NominalValueNew?: number
  AdditionalListedShares?: number
  ListedShares?: number
  ListingDate?: string | number
}

function parseRatio(raw: string | undefined): number | null {
  if (raw == null) {
    return null
  }
  // IDX format: "1:5" (1 old -> 5 new) or a plain number like "5"
  const m = raw.trim().match(/^\s*1\s*:\s*(\d+(?:\.\d+)?)\s*$/)
  if (m) {
    return Number(m[1])
  }
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function tsOf(value: string | number | undefined): number | null {
  if (value == null || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const n = Number(value)
  if (Number.isFinite(n)) {
    return n > 1e12 ? n : n * 1000
  }
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

export class Split {
  private static readonly origin = 'https://www.idx.co.id'

  static async syncMonth(client: Client, year: number, month: number): Promise<number> {
    const url =
      `${Split.origin}/primary/DigitalStatistic/GetApiDataPaginated` +
      `?urlName=LINK_STOCK_SPLIT&periodYear=${year}&periodMonth=${month}` +
      `&periodType=monthly&isPrint=False&cumulative=false` +
      `&pageSize=1000&pageNumber=1`
    const res = await client.get(url)
    if (!res.ok) {
      return 0
    }
    const json = (await res.json()) as { data?: SplitRaw[] }
    const rows = json.data ?? []
    if (rows.length === 0) {
      return 0
    }
    let synced = 0
    for (const item of rows) {
      const listingTs = tsOf(item.ListingDate)
      if (listingTs == null) {
        continue
      }
      const values = {
        id: `${item.code}-${listingTs}`,
        code: item.code,
        name: item.stockname ?? null,
        ratio: parseRatio(item.Ratio),
        nominalOld: item.NominalValue ?? null,
        nominalNew: item.NominalValueNew ?? null,
        additionalShares: item.AdditionalListedShares ?? null,
        listedShares: item.ListedShares ?? null,
        listingDate: listingTs
      }
      await Database.insert(Schemas.stockSplits).values(values).onConflictDoUpdate({
        target: Schemas.stockSplits.id,
        set: values
      })
      synced++
    }
    return synced
  }

  /** Sync splits for the trailing N months. */
  static async syncRecent(client: Client, monthsBack = 12): Promise<number> {
    const now = new Date()
    let total = 0
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      total += await Split.syncMonth(client, d.getFullYear(), d.getMonth() + 1)
    }
    return total
  }
}
