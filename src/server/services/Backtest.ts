/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Price-based backtester over the stock_summary history (2 years backfilled).
 * Strategies:
 *  - momentum: relative price change over the rebalance window (buy strong)
 *  - rsi:      mean-reversion, buys the most oversold (RSI-14)
 *  - value:    buys the cheapest PER — uses the CURRENT screener snapshot,
 *              an honest limitation (no historical fundamentals in the DB)
 * Benchmark: equal-weight average of the whole universe (market proxy).
 */

import { asc, eq, gte } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'

export type BacktestStrategy = 'momentum' | 'rsi' | 'value' | 'dividend' | 'quality' | 'foreignFlow' | 'breakout' | 'meanReversion' | 'custom'

export interface BacktestCustomParams {
  perMax?: number
  roeMin?: number
  derMax?: number
  momentumMin?: number
  yieldMin?: number
}
export type RebalanceWeeks = 4 | 12 | 26

export interface BacktestParams {
  strategy: BacktestStrategy
  topN: number
  rebalanceWeeks: RebalanceWeeks
  startDate: number
  minValue?: number
  excludeNotation?: boolean
  custom?: BacktestCustomParams
}

interface Point {
  date: number
  close: number
}

export interface BacktestResult {
  params: BacktestParams
  benchmarkLabel: string
  equity: { date: number; strategy: number; benchmark: number }[]
  stats: {
    strategyTotal: number
    benchmarkTotal: number
    excess: number
    annualized: number
    benchmarkAnnualized: number
    maxDrawdown: number
    winRate: number
    periods: number
  }
  lastHoldings: { code: string; name: string | null; metric: number | null }[]
}

/** yyyymmdd int (stock_summary.date) -> epoch ms */
function dateIntToTs(d: number): number {
  const y = Math.floor(d / 10000)
  const m = Math.floor(d / 100) % 100
  const day = d % 100
  return Date.UTC(y, m - 1, day)
}

/** epoch ms -> yyyymmdd int */
function dateIntFromTs(epochMs: number): number {
  const d = new Date(epochMs)
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function lastCloseAt(points: Point[], date: number): number | null {
  let lo = 0
  let hi = points.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (points[mid]!.date <= date) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans >= 0 ? points[ans]!.close : null
}

function rsiAt(points: Point[], date: number, period = 14): number | null {
  let end = points.length - 1
  for (let i = 0; i < points.length; i++) {
    if (points[i]!.date > date) {
      end = i - 1
      break
    }
  }
  if (end < period) {
    return null
  }
  let gain = 0
  let loss = 0
  for (let i = end - period + 1; i <= end; i++) {
    const d = points[i]!.close - points[i - 1]!.close
    if (d >= 0) {
      gain += d
    } else {
      loss -= d
    }
  }
  if (gain + loss === 0) {
    return 50
  }
  const avgGain = gain / period
  const avgLoss = loss / period
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export class Backtest {
  static async run(params: BacktestParams): Promise<BacktestResult> {
    const { strategy, topN, rebalanceWeeks, startDate, minValue, excludeNotation } = params

    const rows = await Database.select({
      date: Schemas.summary.date,
      stockCode: Schemas.summary.stockCode,
      priceClose: Schemas.summary.priceClose,
      value: Schemas.summary.value
    })
      .from(Schemas.summary)
      .where(gte(Schemas.summary.date, startDate))

    const series = new Map<string, Point[]>()
    const valueSum = new Map<string, number>()
    const valueCnt = new Map<string, number>()
    for (const r of rows) {
      if (r.priceClose == null || r.priceClose <= 0) {
        continue
      }
      const arr = series.get(r.stockCode) ?? []
      arr.push({ date: r.date, close: r.priceClose })
      series.set(r.stockCode, arr)
      if (r.value != null && r.value > 0) {
        valueSum.set(r.stockCode, (valueSum.get(r.stockCode) ?? 0) + r.value)
        valueCnt.set(r.stockCode, (valueCnt.get(r.stockCode) ?? 0) + 1)
      }
    }
    for (const arr of series.values()) {
      arr.sort((a, b) => a.date - b.date)
    }

    // Split adjustment: multiply pre-split closes by 1/ratio (newest -> oldest)
    // so momentum is not distorted across corporate actions.
    const splitRows = await Database.select({
      code: Schemas.stockSplits.code,
      ratio: Schemas.stockSplits.ratio,
      listingDate: Schemas.stockSplits.listingDate
    }).from(Schemas.stockSplits)
    const splitByCode = new Map<string, { ratio: number; listingDate: number }[]>()
    for (const s of splitRows) {
      if (s.ratio == null || s.ratio <= 0 || s.listingDate == null) {
        continue
      }
      const arr = splitByCode.get(s.code) ?? []
      arr.push({ ratio: s.ratio, listingDate: s.listingDate })
      splitByCode.set(s.code, arr)
    }
    for (const [code, arr] of splitByCode) {
      const pts = series.get(code)
      if (!pts || pts.length === 0) {
        continue
      }
      arr.sort((a, b) => a.listingDate - b.listingDate)
      for (const s of [...arr].reverse()) {
        const splitYmd = dateIntFromTs(s.listingDate)
        const factor = 1 / s.ratio
        for (const p of pts) {
          if (p.date < splitYmd) {
            p.close *= factor
          }
        }
      }
    }

    const screenerRows = await Database.select({
      code: Schemas.screener.code,
      name: Schemas.screener.name,
      per: Schemas.screener.per,
      roe: Schemas.screener.roe,
      der: Schemas.screener.der,
      divYield: Schemas.screener.divYield,
      week26PC: Schemas.screener.week26PC,
      week52PC: Schemas.screener.week52PC,
      notation: Schemas.screener.notation
    }).from(Schemas.screener)
    const codeToInfo = new Map(
      screenerRows.map((r) => [r.code, { name: r.name, per: r.per, roe: r.roe, der: r.der, divYield: r.divYield, week26PC: r.week26PC, week52PC: r.week52PC, notation: r.notation }])
    )
    const excluded = new Set<string>()
    if (excludeNotation) {
      for (const [code, info] of codeToInfo) {
        if (info.notation != null && info.notation !== '') {
          excluded.add(code)
        }
      }
    }
    // Foreign flow data for foreignFlow strategy (latest date)
    const foreignDate = await Database.select({ date: Schemas.summary.date }).from(Schemas.summary).orderBy(desc(Schemas.summary.date)).limit(1)
    const foreignDateInt = foreignDate[0]?.date ?? 0
    const foreignFlowMap = new Map<string, number>()
    if (foreignDateInt > 0) {
      const foreignRows = await Database.select({
        code: Schemas.summary.stockCode,
        foreignBuy: Schemas.summary.foreignBuy,
        foreignSell: Schemas.summary.foreignSell
      }).from(Schemas.summary).where(eq(Schemas.summary.date, foreignDateInt))
      for (const r of foreignRows) {
        foreignFlowMap.set(r.code, (r.foreignBuy ?? 0) - (r.foreignSell ?? 0))
      }
    }

    const avgValue = (code: string): number => {
      const s = valueSum.get(code)
      const c = valueCnt.get(code)
      return s != null && c != null && c > 0 ? s / c : 0
    }

    // Historical PER (financial_ratios) for the value strategy
    const ratioRows = await Database.select({
      code: Schemas.financialRatios.code,
      period: Schemas.financialRatios.period,
      per: Schemas.financialRatios.per
    }).from(Schemas.financialRatios)
    const ratioSeries = new Map<string, { ymd: number; per: number | null }[]>()
    for (const r of ratioRows) {
      if (r.period == null) {
        continue
      }
      const arr = ratioSeries.get(r.code) ?? []
      arr.push({ ymd: dateIntFromTs(r.period), per: r.per })
      ratioSeries.set(r.code, arr)
    }
    for (const arr of ratioSeries.values()) {
      arr.sort((a, b) => a.ymd - b.ymd)
    }
    const perAt = (code: string, date: number): number | null => {
      const arr = ratioSeries.get(code)
      if (!arr || arr.length === 0) {
        return null
      }
      let lo = 0
      let hi = arr.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (arr[mid]!.ymd <= date) {
          ans = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      return ans >= 0 ? arr[ans]!.per : null
    }
    // IHSG COMPOSITE levels for the benchmark
    const idxRows = await Database.select({
      date: Schemas.indexDaily.date,
      value: Schemas.indexDaily.value
    })
      .from(Schemas.indexDaily)
      .where(eq(Schemas.indexDaily.code, 'COMPOSITE'))
      .orderBy(asc(Schemas.indexDaily.date))
    const idxPoints = idxRows.map((r) => ({ date: r.date, value: r.value }))
    const idxAt = (date: number): number | null => {
      if (idxPoints.length === 0) {
        return null
      }
      let lo = 0
      let hi = idxPoints.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (idxPoints[mid]!.date <= date) {
          ans = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      return ans >= 0 ? idxPoints[ans]!.value : null
    }

    const dates = [...new Set(rows.map((r) => r.date))].sort((a, b) => a - b)
    const step = Math.max(5, Math.round(rebalanceWeeks * 5))
    const rebalanceIdx: number[] = []
    for (let i = 0; i < dates.length; i += step) {
      rebalanceIdx.push(i)
    }
    if (rebalanceIdx[rebalanceIdx.length - 1] !== dates.length - 1) {
      rebalanceIdx.push(dates.length - 1)
    }
    const empty: BacktestResult = {
      params,
      benchmarkLabel: 'Equal-weight market',
      equity: [],
      stats: {
        strategyTotal: 0,
        benchmarkTotal: 0,
        excess: 0,
        annualized: 0,
        benchmarkAnnualized: 0,
        maxDrawdown: 0,
        winRate: 0,
        periods: 0
      },
      lastHoldings: []
    }
    if (rebalanceIdx.length < 3) {
      return empty
    }

    const metricAt = (code: string, date: number): number | null => {
      const pts = series.get(code)
      if (!pts || pts.length < 30) {
        return null
      }
      if (strategy === 'momentum') {
        const close = lastCloseAt(pts, date)
        const past = lastCloseAt(pts, date - step)
        if (close == null || past == null || past <= 0) {
          return null
        }
        return close / past - 1
      }
      if (strategy === 'rsi') {
        return rsiAt(pts, date)
      }
      if (strategy === 'value') {
        return perAt(code, date)
      }
      // Snapshot-based strategies (use current screener data)
      const info = codeToInfo.get(code)
      if (strategy === 'dividend') {
        return info?.divYield ?? null
      }
      if (strategy === 'quality') {
        const roe = info?.roe ?? 0
        const der = info?.der ?? 0
        return roe > 0 && der >= 0 ? roe / Math.max(der, 0.1) : null
      }
      if (strategy === 'foreignFlow') {
        return foreignFlowMap.get(code) ?? null
      }
      if (strategy === 'breakout') {
        return info?.week52PC ?? null
      }
      if (strategy === 'meanReversion') {
        return info?.week26PC ?? null
      }
      if (strategy === 'custom') {
        // Custom: filter by params, then rank by composite (value+quality+momentum)
        const c = custom
        if (c?.perMax != null && (info?.per ?? 999) > c.perMax) return null
        if (c?.roeMin != null && (info?.roe ?? 0) < c.roeMin) return null
        if (c?.derMax != null && (info?.der ?? 999) > c.derMax) return null
        if (c?.yieldMin != null && (info?.divYield ?? 0) * 100 < c.yieldMin) return null
        // Composite: value (low PER) + quality (high ROE/DER) + momentum (26w return)
        const perScore = info?.per != null && info.per > 0 ? 1 / info.per : 0
        const qualScore = (info?.roe ?? 0) / Math.max(info?.der ?? 1, 0.1)
        const momScore = (info?.week26PC ?? 0) / 100
        return perScore * 0.4 + qualScore * 0.3 + momScore * 0.3
      }
      return null
    }

    const equity: BacktestResult['equity'] = []
    let stratNav = 1
    let benchNav = 1
    let peak = 1
    let maxDrawdown = 0
    let wins = 0
    let periods = 0
    let indexPeriods = 0
    let lastHoldings: BacktestResult['lastHoldings'] = []

    for (let k = 0; k < rebalanceIdx.length - 1; k++) {
      const ri = rebalanceIdx[k]!
      const rn = rebalanceIdx[k + 1]!
      const date = dates[ri]!
      const nextDate = dates[rn]!
      const idx0 = idxAt(date)
      const idx1 = idxAt(nextDate)
      const useIndex = idx0 != null && idx1 != null && idx0 > 0
      const universe: string[] = []
      for (const [code, pts] of series) {
        if (excluded.has(code)) {
          continue
        }
        if (minValue != null && avgValue(code) < minValue) {
          continue
        }
        if (lastCloseAt(pts, date) == null || lastCloseAt(pts, nextDate) == null) {
          continue
        }
        universe.push(code)
      }
      if (universe.length === 0) {
        continue
      }
      let benchRet = 0
      const scored: { code: string; metric: number | null; fwd: number }[] = []
      for (const code of universe) {
        const c0 = lastCloseAt(series.get(code)!, date)!
        const c1 = lastCloseAt(series.get(code)!, nextDate)!
        const fwd = c1 / c0 - 1
        if (!useIndex) {
          benchRet += fwd
        }
        scored.push({ code, metric: metricAt(code, date), fwd })
      }
      const benchAvg = useIndex ? idx1! / idx0! - 1 : benchRet / universe.length
      benchNav *= 1 + benchAvg
      if (useIndex) {
        indexPeriods++
      }
      const descStrategies = new Set(['momentum', 'dividend', 'quality', 'foreignFlow', 'breakout', 'custom'])
      const dir = descStrategies.has(strategy) ? -1 : 1
      const ranked = scored
        .filter(
          (s) =>
            s.metric != null &&
            Number.isFinite(s.metric) &&
            (strategy !== 'value' || (s.metric as number) > 0)
        )
        .sort((a, b) => dir * ((a.metric as number) - (b.metric as number)))
      const picks = ranked.slice(0, topN)
      if (picks.length > 0) {
        const stratRet = picks.reduce((acc, p) => acc + p.fwd, 0) / picks.length
        stratNav *= 1 + stratRet
        periods++
        if (stratRet > benchAvg) {
          wins++
        }
        lastHoldings = picks.map((p) => ({
          code: p.code,
          name: codeToInfo.get(p.code)?.name ?? null,
          metric: p.metric
        }))
      }
      peak = Math.max(peak, stratNav)
      maxDrawdown = Math.max(maxDrawdown, 1 - stratNav / peak)
      equity.push({ date: nextDate, strategy: stratNav, benchmark: benchNav })
    }

    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]
    if (firstDate == null || lastDate == null) {
      return empty
    }
    const firstTs = dateIntToTs(firstDate)
    const lastTs = dateIntToTs(lastDate)
    const years = Math.max((lastTs - firstTs) / 31536000000, 0.01)
    const totalReturn = stratNav - 1
    const benchTotal = benchNav - 1
    const annualized = Math.pow(1 + totalReturn, 1 / years) - 1
    const benchmarkAnnualized = Math.pow(1 + benchTotal, 1 / years) - 1

    const benchmarkLabel =
      indexPeriods === periods && periods > 0
        ? 'IHSG (COMPOSITE)'
        : indexPeriods > 0
          ? 'IHSG (1Y) + equal-weight (earlier)'
          : 'Equal-weight market'

    return {
      params,
      benchmarkLabel,
      equity,
      stats: {
        strategyTotal: totalReturn,
        benchmarkTotal: benchTotal,
        excess: totalReturn - benchTotal,
        annualized,
        benchmarkAnnualized,
        maxDrawdown,
        winRate: periods > 0 ? wins / periods : 0,
        periods
      },
      lastHoldings
    }
  }
}
