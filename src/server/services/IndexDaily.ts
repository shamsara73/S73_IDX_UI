/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Daily index levels (IHSG COMPOSITE + sector indices) from the official IDX
 * chart endpoint. Used as the real-market benchmark in the backtester.
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import type { Client } from '@app/server/services/Client.ts'

export const INDEX_CODES = [
  'COMPOSITE',
  'IDXENERGY',
  'IDXFINANCE',
  'IDXPROPERT',
  'IDXTECHNO',
  'IDXINFRA',
  'IDXTRANS',
  'IDXHEALTH',
  'IDXBASIC',
  'IDXINDUST'
] as const

function yyyymmdd(epochMs: number): number {
  const d = new Date(epochMs)
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

export class IndexDaily {
  private static readonly origin = 'https://www.idx.co.id'

  static async syncIndex(client: Client, indexCode: string, period = '1Y'): Promise<number> {
    const url = `${IndexDaily.origin}/primary/helper/GetIndexChart?indexCode=${indexCode}&period=${period}`
    const res = await client.get(url)
    if (!res.ok) {
      return 0
    }
    const json = (await res.json()) as {
      ChartData?: { Date: string | number; Close: number }[]
    }
    const points = json.ChartData ?? []
    if (points.length === 0) {
      return 0
    }
    let synced = 0
    for (const point of points) {
      const ts = typeof point.Date === 'number'
        ? point.Date
        : new Date(point.Date).getTime()
      if (!Number.isFinite(ts) || point.Close == null || !Number.isFinite(point.Close)) {
        continue
      }
      const dateInt = yyyymmdd(ts)
      const values = {
        id: `${indexCode}-${dateInt}`,
        code: indexCode,
        date: dateInt,
        value: point.Close
      }
      await Database.insert(Schemas.indexDaily).values(values).onConflictDoUpdate({
        target: Schemas.indexDaily.id,
        set: { value: values.value }
      })
      synced++
    }
    return synced
  }

  static async syncAll(client: Client): Promise<number> {
    let total = 0
    for (const code of INDEX_CODES) {
      total += await IndexDaily.syncIndex(client, code)
    }
    return total
  }
}
