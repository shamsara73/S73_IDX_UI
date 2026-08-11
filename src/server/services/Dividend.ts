/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import type { Client } from '@app/server/services/Client.ts'

interface DividendRaw {
  code: string
  name: string
  cashDividend: number | string
  cumDividend: string | number | null
  exDividend: string | number | null
  recordDate: string | number | null
  paymentDate: string | number | null
}

export class Dividend {
  private static readonly origin = 'https://www.idx.co.id'

  /** Sync one month of dividend announcements (paginated) from the official IDX API. */
  static async syncMonth(client: Client, year: number, month: number): Promise<number> {
    const pageSize = 100
    let page = 1
    let synced = 0
    for (;;) {
      const url =
        `${Dividend.origin}/primary/DigitalStatistic/GetApiDataPaginated?urlName=LINK_DIVIDEND` +
        `&periodYear=${year}&periodMonth=${month}&periodType=monthly&isPrint=False&cumulative=false` +
        `&pageSize=${pageSize}&pageNumber=${page}`
      const res = await client.get(url)
      if (!res.ok) {
        break
      }
      const json = (await res.json()) as { data?: DividendRaw[]; recordsTotal?: number }
      const rows = json.data ?? []
      if (rows.length === 0) {
        break
      }
      for (const item of rows) {
        const recordDate = item.recordDate != null ? String(item.recordDate) : ''
        const exDividend = item.exDividend != null ? String(item.exDividend) : ''
        const keyDate = recordDate !== '' ? recordDate : exDividend
        if (keyDate === '') {
          continue
        }
        const id = `${item.code}-${keyDate}`
        const cash =
          typeof item.cashDividend === 'number'
            ? item.cashDividend
            : Number.parseFloat(String(item.cashDividend ?? ''))
        const values = {
          id,
          code: item.code,
          name: item.name,
          cashDividend: Number.isFinite(cash) ? cash : null,
          cumDividend: item.cumDividend != null ? String(item.cumDividend) : null,
          exDividend: exDividend || null,
          recordDate: recordDate || null,
          paymentDate: item.paymentDate != null ? String(item.paymentDate) : null,
          period: new Date(year, month - 1, 1).getTime()
        }
        await Database.insert(Schemas.dividends).values(values).onConflictDoUpdate({
          target: Schemas.dividends.id,
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

  /** Sync the last N months (covers ex-dates + trailing dividend window). */
  static async syncRecent(client: Client, monthsBack = 6): Promise<number> {
    const now = new Date()
    let total = 0
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      total += await Dividend.syncMonth(client, d.getFullYear(), d.getMonth() + 1)
    }
    return total
  }
}
