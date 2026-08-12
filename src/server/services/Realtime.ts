/**
 * Real-time stock data from IDX's GetStockInfo + GetStockChart endpoints.
 * No broker API needed — IDX serves this directly.
 */

import { Client } from '@app/server/services/Client.ts'

export interface RealtimeQuote {
  code: string
  price: number | null
  change: number | null
  changePct: number | null
  volume: number | null
  value: number | null
  vwap: number | null
  frequency: number | null
}

export interface IntradayBar {
  time: number
  label: string
  close: number
}

export interface IntradayData {
  code: string
  bars: IntradayBar[]
  count: number
  openingRange: { high: number; low: number } | null
  dayHigh: number | null
  dayLow: number | null
}

const client = new Client()

export class Realtime {
  static async getQuote(code: string): Promise<RealtimeQuote> {
    const clean = code.trim().toUpperCase()
    try {
      const res = await client.get(
        `https://www.idx.co.id/primary/home/GetStockInfo?code=${clean}`
      )
      if (!res.ok) {
        return { code: clean, price: null, change: null, changePct: null, volume: null, value: null, vwap: null, frequency: null }
      }
      const j = (await res.json()) as Record<string, unknown>
      const price = typeof j.Price === 'number' ? j.Price : null
      const change = typeof j.Change === 'number' ? j.Change : null
      const changePct = typeof j.Percent === 'number' ? j.Percent / 100 : null
      const volume = typeof j.Volume === 'number' ? j.Volume : null
      const value = typeof j.Value === 'number' ? j.Value : null
      const vwap = volume != null && volume > 0 && value != null ? value / volume : null
      return { code: clean, price, change, changePct, volume, value, vwap, frequency: typeof j.Frequency === 'number' ? j.Frequency : null }
    } catch {
      return { code: clean, price: null, change: null, changePct: null, volume: null, value: null, vwap: null, frequency: null }
    }
  }

  static async getIntraday(code: string): Promise<IntradayData> {
    const clean = code.trim().toUpperCase()
    try {
      const res = await client.get(
        `https://www.idx.co.id/primary/helper/GetStockChart?indexCode=${clean}&period=1D`
      )
      if (!res.ok) {
        return { code: clean, bars: [], count: 0, openingRange: null, dayHigh: null, dayLow: null }
      }
      const j = (await res.json()) as { ChartData?: { Date: number; XLabel: string; Close: number }[] }
      const raw = j.ChartData ?? []
      const bars: IntradayBar[] = raw.map((b) => ({
        time: b.Date,
        label: b.XLabel,
        close: b.Close
      }))
      let dayHigh: number | null = null
      let dayLow: number | null = null
      for (const b of bars) {
        if (dayHigh == null || b.close > dayHigh) dayHigh = b.close
        if (dayLow == null || b.close < dayLow) dayLow = b.close
      }
      // Opening range: first ~30 min of bars (≈ first 600 bars at tick level)
      let openingRange: { high: number; low: number } | null = null
      const openingBars = bars.slice(0, Math.min(600, bars.length))
      if (openingBars.length > 0) {
        let orHigh = openingBars[0]!.close
        let orLow = openingBars[0]!.close
        for (const b of openingBars) {
          if (b.close > orHigh) orHigh = b.close
          if (b.close < orLow) orLow = b.close
        }
        openingRange = { high: orHigh, low: orLow }
      }
      return { code: clean, bars, count: bars.length, openingRange, dayHigh, dayLow }
    } catch {
      return { code: clean, bars: [], count: 0, openingRange: null, dayHigh: null, dayLow: null }
    }
  }
}
