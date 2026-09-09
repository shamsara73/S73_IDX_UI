/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Daily Feature Store — computes 50+ factors per stock/date for ML training.
 * Run after daily sync (17:05 WIB) to materialize point-in-time features.
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { and, desc, gte, lte } from 'drizzle-orm'

const TA = {
  // Simple Moving Average
  sma(values: number[], period: number): number[] {
    const out: number[] = []
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) { out.push(NaN); continue }
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      out.push(sum / period)
    }
    return out
  },

  // Exponential Moving Average
  ema(values: number[], period: number): number[] {
    const out: number[] = []
    const k = 2 / (period + 1)
    let emaVal = NaN
    for (let i = 0; i < values.length; i++) {
      if (isNaN(emaVal)) emaVal = values[i]
      else emaVal = values[i] * k + emaVal * (1 - k)
      out.push(emaVal)
    }
    return out
  },

  // RSI
  rsi(values: number[], period: number): number[] {
    const gains: number[] = []
    const losses: number[] = []
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1]
      gains.push(diff > 0 ? diff : 0)
      losses.push(diff < 0 ? -diff : 0)
    }
    const out: number[] = [NaN] // first value has no change
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = 0; i < gains.length; i++) {
      if (i >= period) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period
      }
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      out.push(100 - 100 / (1 + rs))
    }
    return out
  },

  // MACD
  macd(values: number[], fast: number, slow: number, signal: number): { macd: number[]; signal: number[]; hist: number[] } {
    const emaFast = TA.ema(values, fast)
    const emaSlow = TA.ema(values, slow)
    const macdLine = emaFast.map((f, i) => f - emaSlow[i])
    const signalLine = TA.ema(macdLine, signal)
    const hist = macdLine.map((m, i) => m - signalLine[i])
    return { macd: macdLine, signal: signalLine, hist }
  },

  // Bollinger Bands
  bollinger(values: number[], period: number, stdMult: number): { upper: number[]; middle: number[]; lower: number[]; width: number[]; pctB: number[] } {
    const sma = TA.sma(values, period)
    const out = { upper: [] as number[], middle: sma, lower: [] as number[], width: [] as number[], pctB: [] as number[] }
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        out.upper.push(NaN); out.lower.push(NaN); out.width.push(NaN); out.pctB.push(NaN)
        continue
      }
      const slice = values.slice(i - period + 1, i + 1)
      const mean = sma[i]
      const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
      out.upper.push(mean + stdMult * std)
      out.lower.push(mean - stdMult * std)
      out.width.push((out.upper[i] - out.lower[i]) / mean)
      out.pctB.push((values[i] - out.lower[i]) / (out.upper[i] - out.lower[i]))
    }
    return out
  },

  // ATR
  atr(high: number[], low: number[], close: number[], period: number): number[] {
    const tr: number[] = []
    for (let i = 0; i < close.length; i++) {
      if (i === 0) { tr.push(high[0] - low[0]); continue }
      const hl = high[i] - low[i]
      const hc = Math.abs(high[i] - close[i - 1])
      const lc = Math.abs(low[i] - close[i - 1])
      tr.push(Math.max(hl, hc, lc))
    }
    return TA.sma(tr, period)
  },

  // Standard deviation
  std(values: number[], period: number): number[] {
    const out: number[] = []
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) { out.push(NaN); continue }
      const slice = values.slice(i - period + 1, i + 1)
      const mean = slice.reduce((a, b) => a + b, 0) / period
      out.push(Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period))
    }
    return out
  },

  // Z-score
  zscore(values: number[], period: number): number[] {
    const sma = TA.sma(values, period)
    const std = TA.std(values, period)
    return values.map((v, i) => std[i] === 0 ? 0 : (v - sma[i]) / std[i])
  },

  // Stochastic
  stochastic(high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number): { k: number[]; d: number[] } {
    const k: number[] = []
    for (let i = 0; i < close.length; i++) {
      if (i < kPeriod - 1) { k.push(NaN); continue }
      const hh = Math.max(...high.slice(i - kPeriod + 1, i + 1))
      const ll = Math.min(...low.slice(i - kPeriod + 1, i + 1))
      k.push(hh === ll ? 50 : (close[i] - ll) / (hh - ll) * 100)
    }
    const d = TA.sma(k, dPeriod)
    return { k, d }
  },

  // ADX
  adx(high: number[], low: number[], close: number[], period: number): number[] {
    const plusDM: number[] = []
    const minusDM: number[] = []
    const tr: number[] = []
    for (let i = 1; i < close.length; i++) {
      const up = high[i] - high[i - 1]
      const down = low[i - 1] - low[i]
      plusDM.push(up > down && up > 0 ? up : 0)
      minusDM.push(down > up && down > 0 ? down : 0)
      const hl = high[i] - low[i]
      const hc = Math.abs(high[i] - close[i - 1])
      const lc = Math.abs(low[i] - close[i - 1])
      tr.push(Math.max(hl, hc, lc))
    }
    const atrVal = TA.sma(tr, period)
    const plusDI = plusDM.map((dm, i) => atrVal[i] === 0 ? 0 : dm / atrVal[i] * 100)
    const minusDI = minusDM.map((dm, i) => atrVal[i] === 0 ? 0 : dm / atrVal[i] * 100)
    const dx = plusDI.map((p, i) => p + minusDI[i] === 0 ? 0 : Math.abs(p - minusDI[i]) / (p + minusDI[i]) * 100)
    return TA.sma(dx, period)
  },

  // OBV
  obv(close: number[], volume: number[]): number[] {
    const out: number[] = [0]
    for (let i = 1; i < close.length; i++) {
      if (close[i] > close[i - 1]) out.push(out[i - 1] + volume[i])
      else if (close[i] < close[i - 1]) out.push(out[i - 1] - volume[i])
      else out.push(out[i - 1])
    }
    return out
  },

  // CMF
  cmf(high: number[], low: number[], close: number[], volume: number[], period: number): number[] {
    const mfm: number[] = []
    const mfv: number[] = []
    for (let i = 0; i < close.length; i++) {
      const hl = high[i] - low[i]
      mfm.push(hl === 0 ? 0 : ((close[i] - low[i]) - (high[i] - close[i])) / hl)
      mfv.push(mfm[i] * volume[i])
    }
    const out: number[] = []
    for (let i = 0; i < close.length; i++) {
      if (i < period - 1) { out.push(NaN); continue }
      const sumMfv = mfv.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      const sumVol = volume.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      out.push(sumVol === 0 ? 0 : sumMfv / sumVol)
    }
    return out
  },

  // MFI
  mfi(high: number[], low: number[], close: number[], volume: number[], period: number): number[] {
    const tp = high.map((h, i) => (h + low[i] + close[i]) / 3)
    const rmf = tp.map((t, i) => t * volume[i])
    const posMf: number[] = []
    const negMf: number[] = []
    for (let i = 1; i < tp.length; i++) {
      posMf.push(tp[i] > tp[i - 1] ? rmf[i] : 0)
      negMf.push(tp[i] < tp[i - 1] ? rmf[i] : 0)
    }
    const out: number[] = []
    for (let i = 0; i < tp.length; i++) {
      if (i < period) { out.push(NaN); continue }
      const posSum = posMf.slice(i - period, i).reduce((a, b) => a + b, 0)
      const negSum = negMf.slice(i - period, i).reduce((a, b) => a + b, 0)
      const mfr = negSum === 0 ? 100 : posSum / negSum
      out.push(100 - 100 / (1 + mfr))
    }
    return out
  },

  // Parkinson volatility (high-low)
  parkinson(high: number[], low: number[], period: number): number[] {
    const out: number[] = []
    const k = 1 / (4 * Math.log(2))
    for (let i = 0; i < high.length; i++) {
      if (i < period - 1) { out.push(NaN); continue }
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        if (high[j] > 0 && low[j] > 0) {
          sum += Math.pow(Math.log(high[j] / low[j]), 2)
        }
      }
      out.push(Math.sqrt(k * sum / period))
    }
    return out
  }
}

export class DailyFeature {
  static async computeForDate(targetDate: number): Promise<void> {
    // Get all stocks with summary data up to targetDate
    const summaryRows = await Database.select()
      .from(Schemas.summary)
      .where(and(
        lte(Schemas.summary.date, targetDate),
        gte(Schemas.summary.date, targetDate - 30000) // ~3 years back
      ))
      .orderBy(Schemas.summary.stockCode, Schemas.summary.date)

    // Group by code
    const byCode = new Map<string, typeof summaryRows>()
    for (const r of summaryRows) {
      const arr = byCode.get(r.stockCode) ?? []
      arr.push(r)
      byCode.set(r.stockCode, arr)
    }

    // Get fundamental data (point-in-time: latest available period <= targetDate's year*100+quarter proxy)
    const fundamentalRows = await Database.select()
      .from(Schemas.financialRatios)
      .orderBy(Schemas.financialRatios.code, desc(Schemas.financialRatios.period))

    const fundamentalByCode = new Map<string, typeof fundamentalRows[0]>()
    for (const r of fundamentalRows) {
      if (!fundamentalByCode.has(r.code)) fundamentalByCode.set(r.code, r)
    }

    // Get sector info + dividend yield proxy from screener (has week*PC, roe, per etc already)
    const screenerRows = await Database.select().from(Schemas.screener)
    const sectorMap = new Map(screenerRows.map(r => [r.code, r.sector ?? '']))
    const screenerByCode = new Map(screenerRows.map(r => [r.code, r]))

    const now = Date.now()
    let processed = 0

    for (const [code, rows] of byCode) {
      if (rows.length < 60) continue // need minimum history

      // Sort by date ascending
      rows.sort((a, b) => a.date - b.date)

      // Build arrays
      const dates = rows.map(r => r.date)
      const close = rows.map(r => r.priceClose ?? 0)
      const high = rows.map(r => r.priceHigh ?? 0)
      const low = rows.map(r => r.priceLow ?? 0)
      const open = rows.map(r => r.priceOpen ?? 0)
      const volume = rows.map(r => r.volume ?? 0)
      const value = rows.map(r => r.value ?? 0)
      const previous = rows.map(r => r.previous ?? 0)
      const foreignBuy = rows.map(r => r.foreignBuy ?? 0)
      const foreignSell = rows.map(r => r.foreignSell ?? 0)
      const listedShares = rows.map(r => r.listedShares ?? 0)

      // Returns
      const ret1d = close.map((c, i) => i === 0 ? NaN : (c - close[i - 1]) / close[i - 1])
      const ret5d = close.map((c, i) => i < 5 ? NaN : (c - close[i - 5]) / close[i - 5])
      const ret20d = close.map((c, i) => i < 20 ? NaN : (c - close[i - 20]) / close[i - 20])
      const ret60d = close.map((c, i) => i < 60 ? NaN : (c - close[i - 60]) / close[i - 60])
      const ret120d = close.map((c, i) => i < 120 ? NaN : (c - close[i - 120]) / close[i - 120])

      // Volume MA & RVOL
      const volMA20 = TA.sma(volume, 20)
      const rvol20 = volume.map((v, i) => volMA20[i] === 0 || isNaN(volMA20[i]) ? NaN : v / volMA20[i])

      // Turnover (volume / listed shares) & Amihud illiquidity (|ret| / value)
      const turnover = volume.map((v, i) => listedShares[i] > 0 ? v / listedShares[i] : NaN)
      const amihud = ret1d.map((r, i) => value[i] > 0 && !isNaN(r) ? Math.abs(r) / value[i] * 1e9 : NaN)

      // ATR & ATR%
      const atr14 = TA.atr(high, low, close, 14)
      const atrPct = atr14.map((a, i) => close[i] > 0 ? a / close[i] * 100 : NaN)

      // Volatility
      const std20 = TA.std(close, 20)
      const std60 = TA.std(close, 60)
      const parkinsonHL = TA.parkinson(high, low, 20)

      // Moving averages
      const sma20 = TA.sma(close, 20)
      const sma50 = TA.sma(close, 50)
      const sma200 = TA.sma(close, 200)
      const ema12 = TA.ema(close, 12)
      const ema26 = TA.ema(close, 26)

      // MACD
      const { macd, signal: macdSignal, hist: macdHist } = TA.macd(close, 12, 26, 9)

      // RSI
      const rsi14 = TA.rsi(close, 14)

      // Stochastic
      const { k: stochK, d: stochD } = TA.stochastic(high, low, close, 14, 3)

      // Momentum
      const mom10d = close.map((c, i) => i < 10 ? NaN : c / close[i - 10] - 1)
      const mom20d = close.map((c, i) => i < 20 ? NaN : c / close[i - 20] - 1)

      // ADX
      const adx14 = TA.adx(high, low, close, 14)

      // Bollinger Bands
      const { upper: bbUpper, middle: bbMiddle, lower: bbLower, width: bbWidth, pctB: bbPctB } = TA.bollinger(close, 20, 2)

      // Z-score
      const zscore20 = TA.zscore(close, 20)

      // Volume-price: VWAP proxy = value/volume for the day (intraday VWAP not available historically)
      const vwap = value.map((v, i) => volume[i] > 0 ? v / volume[i] : NaN)
      const vwapDist = close.map((c, i) => vwap[i] && vwap[i] > 0 ? (c - vwap[i]) / vwap[i] : NaN)
      const obv = TA.obv(close, volume)
      const cmf20 = TA.cmf(high, low, close, volume, 20)
      const mfi14 = TA.mfi(high, low, close, volume, 14)

      // Gap (open vs previous close)
      const gapPct = rows.map((r, i) => previous[i] > 0 ? (open[i] - previous[i]) / previous[i] * 100 : NaN)
      const gapAtrAdj = gapPct.map((g, i) => atrPct[i] > 0 ? g / atrPct[i] : NaN)

      // VWAP reclaim
      const vwapReclaim = close.map((c, i) => vwap[i] && vwap[i] > 0 ? (c > vwap[i] ? 1 : c < vwap[i] ? -1 : 0) : 0)

      // Forward returns (targets)
      const fwdRet5d = close.map((c, i) => i + 5 >= close.length ? NaN : (close[i + 5] - c) / c)
      const fwdRet10d = close.map((c, i) => i + 10 >= close.length ? NaN : (close[i + 10] - c) / c)
      const fwdRet20d = close.map((c, i) => i + 20 >= close.length ? NaN : (close[i + 20] - c) / c)

      // Fundamentals (latest known snapshot — point-in-time approximation)
      const fund = fundamentalByCode.get(code)
      const scr = screenerByCode.get(code)
      const per = fund?.per ?? scr?.per ?? null
      const pbv = fund?.pbv ?? scr?.pbv ?? null
      const roe = fund?.roe ?? scr?.roe ?? null
      const roa = fund?.roa ?? scr?.roa ?? null
      const der = fund?.der ?? scr?.der ?? null
      const npm = fund?.npm ?? scr?.npm ?? null
      const marketCap = scr?.marketCapital ?? null
      const revenue = fund?.sales ?? scr?.totalRevenue ?? null
      const eps = fund?.eps ?? null
      const bvps = fund?.bookValue ?? null

      // Foreign flow (daily net buy in value terms)
      const foreignNetBuy = foreignBuy.map((fb, i) => fb - foreignSell[i])
      const foreignPct = listedShares.map((ls, i) => ls > 0 ? (foreignBuy[i] - foreignSell[i]) / ls : NaN)

      // Sector
      const sector = sectorMap.get(code) ?? ''

      // Insert features for each date (only last N days to avoid huge inserts)
      const targetIdx = dates.findIndex(d => d === targetDate)
      if (targetIdx === -1) continue

      const startIdx = Math.max(0, targetIdx - 10) // last 10 days including target
      const featuresToInsert = []

      for (let i = startIdx; i <= targetIdx; i++) {
        const d = dates[i]
        featuresToInsert.push({
          code,
          date: d,
          close: close[i] || null,
          ret_1d: isNaN(ret1d[i]) ? null : ret1d[i],
          ret_5d: isNaN(ret5d[i]) ? null : ret5d[i],
          ret_20d: isNaN(ret20d[i]) ? null : ret20d[i],
          ret_60d: isNaN(ret60d[i]) ? null : ret60d[i],
          ret_120d: isNaN(ret120d[i]) ? null : ret120d[i],
          volume: volume[i] || null,
          value: value[i] || null,
          volume_ma_20: isNaN(volMA20[i]) ? null : volMA20[i],
          rvol_20: isNaN(rvol20[i]) ? null : rvol20[i],
          turnover: isNaN(turnover[i]) ? null : turnover[i],
          amihud_illiq: isNaN(amihud[i]) ? null : amihud[i],
          atr_14: isNaN(atr14[i]) ? null : atr14[i],
          atr_pct: isNaN(atrPct[i]) ? null : atrPct[i],
          std_20: isNaN(std20[i]) ? null : std20[i],
          std_60: isNaN(std60[i]) ? null : std60[i],
          parkinson_hl: isNaN(parkinsonHL[i]) ? null : parkinsonHL[i],
          sma_20: isNaN(sma20[i]) ? null : sma20[i],
          sma_50: isNaN(sma50[i]) ? null : sma50[i],
          sma_200: isNaN(sma200[i]) ? null : sma200[i],
          ema_12: isNaN(ema12[i]) ? null : ema12[i],
          ema_26: isNaN(ema26[i]) ? null : ema26[i],
          macd: isNaN(macd[i]) ? null : macd[i],
          macd_signal: isNaN(macdSignal[i]) ? null : macdSignal[i],
          macd_hist: isNaN(macdHist[i]) ? null : macdHist[i],
          rsi_14: isNaN(rsi14[i]) ? null : rsi14[i],
          stoch_k: isNaN(stochK[i]) ? null : stochK[i],
          stoch_d: isNaN(stochD[i]) ? null : stochD[i],
          mom_10d: isNaN(mom10d[i]) ? null : mom10d[i],
          mom_20d: isNaN(mom20d[i]) ? null : mom20d[i],
          adx_14: isNaN(adx14[i]) ? null : adx14[i],
          bb_upper: isNaN(bbUpper[i]) ? null : bbUpper[i],
          bb_middle: isNaN(bbMiddle[i]) ? null : bbMiddle[i],
          bb_lower: isNaN(bbLower[i]) ? null : bbLower[i],
          bb_width: isNaN(bbWidth[i]) ? null : bbWidth[i],
          bb_pct_b: isNaN(bbPctB[i]) ? null : bbPctB[i],
          zscore_20: isNaN(zscore20[i]) ? null : zscore20[i],
          vwap: isNaN(vwap[i]) ? null : vwap[i],
          vwap_dist: isNaN(vwapDist[i]) ? null : vwapDist[i],
          obv: isNaN(obv[i]) ? null : obv[i],
          cmf_20: isNaN(cmf20[i]) ? null : cmf20[i],
          mfi_14: isNaN(mfi14[i]) ? null : mfi14[i],
          gap_pct: isNaN(gapPct[i]) ? null : gapPct[i],
          gap_atr_adj: isNaN(gapAtrAdj[i]) ? null : gapAtrAdj[i],
          vwap_reclaim: vwapReclaim[i],
          per, pbv, roe, roa, der, npm, div_yield: null,
          market_cap: marketCap, revenue_ttm: revenue, eps_ttm: eps, bvps,
          foreign_net_buy: isNaN(foreignNetBuy[i]) ? null : foreignNetBuy[i],
          foreign_pct: isNaN(foreignPct[i]) ? null : foreignPct[i],
          sector, sector_ret_20d: null, market_ret_20d: null,
          beta_60d: null, sector_strength: null,
          fwd_ret_5d: isNaN(fwdRet5d[i]) ? null : fwdRet5d[i],
          fwd_ret_10d: isNaN(fwdRet10d[i]) ? null : fwdRet10d[i],
          fwd_ret_20d: isNaN(fwdRet20d[i]) ? null : fwdRet20d[i],
          created_at: now, updated_at: now
        })
      }

      // Upsert batch
      for (const f of featuresToInsert) {
        await Database.insert(Schemas.dailyFeatures)
          .values(f)
          .onConflictDoUpdate({
            target: [Schemas.dailyFeatures.code, Schemas.dailyFeatures.date],
            set: f
          })
      }

      processed++
    }

    console.log(`✅ Daily features computed for ${targetDate}: ${processed} stocks`)
  }

  static async backfill(startDate: number, endDate: number): Promise<void> {
    const dates = await Database.select({ date: Schemas.summary.date })
      .from(Schemas.summary)
      .where(and(gte(Schemas.summary.date, startDate), lte(Schemas.summary.date, endDate)))
      .groupBy(Schemas.summary.date)
      .orderBy(Schemas.summary.date)

    for (const { date } of dates) {
      await DailyFeature.computeForDate(date)
    }
  }
}

export default DailyFeature