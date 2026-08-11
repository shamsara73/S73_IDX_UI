/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import type { Context } from '@neabyte/deserve'
import { desc, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import Utils from '@app/server/Utils.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import * as Services from '@app/server/services/index.ts'
import type * as Types from '@app/server/Types.ts'

export async function GET(ctx: Context) {
  const dateParsed = Utils.parseDate(Utils.queryString(ctx.get.query('date')))
  const dateInt = dateParsed ?? Services.CronDate.todayDateInt()
  const minValueRaw = ctx.get.query('minValue')
  const minVolumeRaw = ctx.get.query('minVolume')
  const excludeNotationRaw = ctx.get.query('excludeNotation')
  const excludeCorpActionRaw = ctx.get.query('excludeCorpAction')
  const excludeUmaRaw = ctx.get.query('excludeUma')
  let minValue = Utils.parseNumber(Utils.queryString(minValueRaw))
  const minVolume = Utils.parseNumber(Utils.queryString(minVolumeRaw))
  let excludeNotation = Utils.parseBoolean(Utils.queryString(excludeNotationRaw))
  let excludeCorpAction = Utils.parseBoolean(Utils.queryString(excludeCorpActionRaw))
  let excludeUma = Utils.parseBoolean(Utils.queryString(excludeUmaRaw))
  const perMinRaw = ctx.get.query('perMin')
  const perMaxRaw = ctx.get.query('perMax')
  const roeMinRaw = ctx.get.query('roeMin')
  const derMaxRaw = ctx.get.query('derMax')
  const momentumWeekRaw = ctx.get.query('momentumWeek')
  const momentumMinRaw = ctx.get.query('momentumMin')
  const perMin = Utils.parseNumber(Utils.queryString(perMinRaw))
  let perMax = Utils.parseNumber(Utils.queryString(perMaxRaw))
  let roeMin = Utils.parseNumber(Utils.queryString(roeMinRaw))
  let derMax = Utils.parseNumber(Utils.queryString(derMaxRaw))
  let momentumMin = Utils.parseNumber(Utils.queryString(momentumMinRaw))
  let momentumWeek = Utils.parseWeek(Utils.queryString(momentumWeekRaw))
  const divYieldMin = Utils.parseNumber(Utils.queryString(ctx.get.query('divYieldMin')))
  const divYearsMin = Utils.parseNumber(Utils.queryString(ctx.get.query('divYearsMin')))
  const defaultFilter = Utils.parseBoolean(Utils.queryString(ctx.get.query('defaultFilter')))
  if (defaultFilter) {
    if (!Utils.queryParamSent(excludeNotationRaw)) {
      excludeNotation = true
    }
    if (!Utils.queryParamSent(excludeCorpActionRaw)) {
      excludeCorpAction = true
    }
    if (!Utils.queryParamSent(excludeUmaRaw)) {
      excludeUma = true
    }
    if (!Utils.queryParamSent(perMaxRaw)) {
      perMax = 25
    }
    if (!Utils.queryParamSent(roeMinRaw)) {
      roeMin = 0
    }
    if (!Utils.queryParamSent(derMaxRaw)) {
      derMax = 2
    }
    if (!Utils.queryParamSent(momentumMinRaw)) {
      momentumMin = 0
    }
    if (!Utils.queryParamSent(momentumWeekRaw)) {
      momentumWeek = 26
    }
    // Professional default: require meaningful liquidity (Rp 500jt daily value)
    if (!Utils.queryParamSent(minValueRaw)) {
      minValue = 500000000
    }
  }
  const { limit, offset } = Utils.parseLimitOffset(
    Utils.queryString(ctx.get.query('limit')),
    Utils.queryString(ctx.get.query('offset'))
  )
  const withSectorRank = Utils.parseBoolean(Utils.queryString(ctx.get.query('withSectorRank')))
  const valueWeightRaw = ctx.get.query('vw')
  const qualityWeightRaw = ctx.get.query('qw')
  const momentumWeightRaw = ctx.get.query('mw')
  const valueWeight = Utils.parseWeight(Utils.queryString(valueWeightRaw))
  const qualityWeight = Utils.parseWeight(Utils.queryString(qualityWeightRaw))
  const momentumWeight = Utils.parseWeight(Utils.queryString(momentumWeightRaw))
  const compositeWeights = Utils.buildCompositeWeights(
    valueWeight,
    qualityWeight,
    momentumWeight
  ) as Types.CompositeWeights | undefined
  let summaryDate = dateInt
  let summaryRows = await Database.select({
    stockCode: Schemas.summary.stockCode,
    value: Schemas.summary.value,
    volume: Schemas.summary.volume,
    change: Schemas.summary.change,
    previous: Schemas.summary.previous,
    priceClose: Schemas.summary.priceClose
  })
    .from(Schemas.summary)
    .where(eq(Schemas.summary.date, dateInt))
  if (summaryRows.length === 0) {
    const latestRows = await Database.select({ date: Schemas.summary.date })
      .from(Schemas.summary)
      .orderBy(desc(Schemas.summary.date))
      .limit(1)
    const latestDate = latestRows[0]?.date
    if (latestDate != null && Number.isFinite(latestDate)) {
      summaryDate = Number(latestDate)
      summaryRows = await Database.select({
        stockCode: Schemas.summary.stockCode,
        value: Schemas.summary.value,
        volume: Schemas.summary.volume,
        change: Schemas.summary.change,
        previous: Schemas.summary.previous,
        priceClose: Schemas.summary.priceClose
      })
        .from(Schemas.summary)
        .where(eq(Schemas.summary.date, summaryDate))
    }
  }
  const codeToLiquidity = new Map<string, Types.LiquiditySnapshot>()
  const codeToChangePct = new Map<string, number | null>()
  const codeToLastClose = new Map<string, number>()
  for (const row of summaryRows) {
    codeToLiquidity.set(row.stockCode, {
      value: row.value,
      volume: row.volume
    })
    const changePct = Utils.changePctFromPrevious(row.change, row.previous)
    codeToChangePct.set(row.stockCode, changePct)
    if (row.priceClose != null && Number.isFinite(row.priceClose) && row.priceClose > 0) {
      codeToLastClose.set(row.stockCode, row.priceClose)
    }
  }
  const divRows = await Database.select({
    code: Schemas.dividends.code,
    cashDividend: Schemas.dividends.cashDividend,
    recordDate: Schemas.dividends.recordDate
  }).from(Schemas.dividends)
  const nowTs = Date.now()
  const cutoff365 = nowTs - 365 * 86400000
  const cutoff4y = nowTs - 4 * 365 * 86400000
  const codeToDivSum365 = new Map<string, number>()
  const codeToDivYears = new Map<string, Set<number>>()
  for (const d of divRows) {
    if (d.recordDate == null || d.recordDate === '') {
      continue
    }
    const ts = Number.isFinite(Number(d.recordDate))
      ? Number(d.recordDate)
      : new Date(d.recordDate).getTime()
    if (!Number.isFinite(ts)) {
      continue
    }
    if (ts >= cutoff365) {
      codeToDivSum365.set(d.code, (codeToDivSum365.get(d.code) ?? 0) + (d.cashDividend ?? 0))
    }
    if (ts >= cutoff4y) {
      const year = new Date(ts).getFullYear()
      const set = codeToDivYears.get(d.code) ?? new Set<number>()
      set.add(year)
      codeToDivYears.set(d.code, set)
    }
  }
  const codeToDividend = new Map<
    string,
    { divYield: number | null; divYears: number }
  >()
  for (const code of new Set([...codeToDivSum365.keys(), ...codeToDivYears.keys()])) {
    const sum = codeToDivSum365.get(code) ?? 0
    const lastClose = codeToLastClose.get(code)
    const divYield = lastClose != null && lastClose > 0 ? sum / lastClose : null
    codeToDividend.set(code, {
      divYield,
      divYears: codeToDivYears.get(code)?.size ?? 0
    })
  }
  // Financial ratio trends: compare the two most recent quarterly ROE/PER per code
  const ratioRows = await Database.select({
    code: Schemas.financialRatios.code,
    period: Schemas.financialRatios.period,
    roe: Schemas.financialRatios.roe,
    per: Schemas.financialRatios.per
  }).from(Schemas.financialRatios)
  const ratioByCode = new Map<
    string,
    { period: number; roe: number | null; per: number | null }[]
  >()
  for (const r of ratioRows) {
    if (r.period == null) {
      continue
    }
    const arr = ratioByCode.get(r.code) ?? []
    arr.push({ period: r.period, roe: r.roe, per: r.per })
    ratioByCode.set(r.code, arr)
  }
  const codeToRatioTrend = new Map<
    string,
    { roeTrend: -1 | 0 | 1 | null; perTrend: -1 | 0 | 1 | null }
  >()
  for (const [code, arr] of ratioByCode) {
    arr.sort((a, b) => a.period - b.period)
    const last = arr[arr.length - 1]
    if (last == null) {
      continue
    }
    const prev = arr[arr.length - 2]
    const trend = (
      cur: number | null | undefined,
      prevv: number | null | undefined
    ): -1 | 0 | 1 | null => {
      if (cur == null || prevv == null || !Number.isFinite(cur) || !Number.isFinite(prevv)) {
        return null
      }
      if (cur > prevv) {
        return 1
      }
      if (cur < prevv) {
        return -1
      }
      return 0
    }
    codeToRatioTrend.set(code, {
      roeTrend: trend(last.roe, prev?.roe),
      perTrend: trend(last.per, prev?.per)
    })
  }
  const screenerRows = await Database.select({
    code: Schemas.screener.code,
    name: Schemas.screener.name,
    sector: Schemas.screener.sector,
    per: Schemas.screener.per,
    pbv: Schemas.screener.pbv,
    roa: Schemas.screener.roa,
    roe: Schemas.screener.roe,
    der: Schemas.screener.der,
    week26PC: Schemas.screener.week26PC,
    week52PC: Schemas.screener.week52PC,
    notation: Schemas.screener.notation,
    corpAction: Schemas.screener.corpAction,
    umaDate: Schemas.screener.umaDate
  }).from(Schemas.screener)
  const fundamentalFilter = {
    ...(perMin != null && { perMin }),
    ...(perMax != null && { perMax }),
    ...(roeMin != null && { roeMin }),
    ...(derMax != null && { derMax }),
    ...(momentumMin != null && { momentumMin }),
    momentumWeek
  }
  const filteredScreenerRows = screenerRows.filter((row) =>
    Utils.screenerPassesFundamentalFilter(row, fundamentalFilter)
  )
  const rowsForScore: Types.ScreenerRow[] = filteredScreenerRows.map((row) => ({
    code: row.code,
    name: row.name,
    sector: row.sector,
    per: row.per,
    pbv: row.pbv,
    roa: row.roa,
    roe: row.roe,
    der: row.der,
    week26PC: row.week26PC,
    week52PC: row.week52PC
  }))
  const rankedRows = Services.Composite.computeRanked(rowsForScore, compositeWeights)
  const codeToFlags = new Map<string, Types.CodeFlags>()
  for (const row of filteredScreenerRows) {
    codeToFlags.set(row.code, {
      notation: row.notation,
      corpAction: row.corpAction,
      umaDate: row.umaDate
    })
  }
  const codeToFundamentals = Utils.toFundamentalsMap(filteredScreenerRows)
  const withFlagsAndLiquidity: Types.CandidateRow[] = rankedRows.map((row) => {
    const flags = codeToFlags.get(row.code)
    const hasNotation = Utils.isNonEmptyString(flags?.notation)
    const hasCorpAction = Utils.isNonEmptyString(flags?.corpAction)
    const hasUma = Utils.isNonEmptyString(flags?.umaDate)
    const liquidity = codeToLiquidity.get(row.code)
    const transactionValue = liquidity?.value ?? null
    const volume = liquidity?.volume ?? null
    const fundamentals = codeToFundamentals.get(row.code)
    const changePct = codeToChangePct.get(row.code) ?? null
    const dividend = codeToDividend.get(row.code)
    const ratioTrend = codeToRatioTrend.get(row.code)
    return {
      ...row,
      hasNotation,
      hasCorpAction,
      hasUma,
      per: fundamentals?.per ?? null,
      roe: fundamentals?.roe ?? null,
      der: fundamentals?.der ?? null,
      week26PC: fundamentals?.week26PC ?? null,
      week52PC: fundamentals?.week52PC ?? null,
      value: transactionValue,
      volume,
      changePct,
      compositePercentile: 0,
      divYield: dividend?.divYield ?? null,
      divYears: dividend?.divYears ?? 0,
      roeTrend: ratioTrend?.roeTrend ?? null,
      perTrend: ratioTrend?.perTrend ?? null
    }
  })
  let withSectorRankApplied: Types.CandidateRow[] | Types.CandidateRowWithSectorRank[] =
    withFlagsAndLiquidity
  if (withSectorRank) {
    const bySector = new Map<string, Types.CandidateRow[]>()
    for (const row of withFlagsAndLiquidity) {
      Utils.pushToMapList(bySector, row.sector ?? '', row)
    }
    const candidatesWithSectorRank: Types.CandidateRowWithSectorRank[] = []
    for (const sectorRows of bySector.values()) {
      sectorRows.sort((a, b) => b.compositeScore - a.compositeScore)
      const sectorCount = sectorRows.length
      sectorRows.forEach((candidateRow, index) => {
        const sectorRank = index + 1
        const sectorPercentile = Utils.sectorPercentile(sectorRank, sectorCount)
        candidatesWithSectorRank.push({
          ...candidateRow,
          sectorRank,
          sectorPercentile
        })
      })
    }
    candidatesWithSectorRank.sort((a, b) => b.compositeScore - a.compositeScore)
    withSectorRankApplied = candidatesWithSectorRank
  }
  let filteredCandidates = withSectorRankApplied
  if (excludeNotation) {
    filteredCandidates = filteredCandidates.filter((row) => !row.hasNotation)
  }
  if (excludeCorpAction) {
    filteredCandidates = filteredCandidates.filter((row) => !row.hasCorpAction)
  }
  if (excludeUma) {
    filteredCandidates = filteredCandidates.filter((row) => !row.hasUma)
  }
  if (minValue != null) {
    filteredCandidates = filteredCandidates.filter((row) => (row.value ?? 0) >= minValue)
  }
  if (minVolume != null) {
    filteredCandidates = filteredCandidates.filter((row) => (row.volume ?? 0) >= minVolume)
  }
  if (divYieldMin != null) {
    filteredCandidates = filteredCandidates.filter(
      (row) => ((row.divYield ?? 0) * 100) >= divYieldMin
    )
  }
  if (divYearsMin != null) {
    filteredCandidates = filteredCandidates.filter((row) => (row.divYears ?? 0) >= divYearsMin)
  }
  const sectorParam = Utils.queryString(ctx.get.query('sector'))?.trim()
  if (sectorParam !== undefined && sectorParam !== '') {
    filteredCandidates = filteredCandidates.filter(
      (row) => row.sector != null && row.sector.trim() === sectorParam
    )
  }
  const searchParam = Utils.queryString(ctx.get.query('search'))?.trim().toLowerCase()
  if (searchParam !== undefined && searchParam !== '') {
    filteredCandidates = filteredCandidates.filter((row) => {
      const code = row.code?.toLowerCase() ?? ''
      const name = row.name?.toLowerCase() ?? ''
      const sector = row.sector?.toLowerCase() ?? ''
      return (
        code.includes(searchParam) || name.includes(searchParam) || sector.includes(searchParam)
      )
    })
  }
  // Server-side column sorting (whitelist)
  const sortByParam = Utils.queryString(ctx.get.query('sortBy'))?.trim()
  const sortDirParam = Utils.queryString(ctx.get.query('sortDir'))?.trim().toLowerCase()
  const sortWhitelist: Record<string, (row: Types.CandidateRow) => number | null> = {
    per: (row) => row.per ?? null,
    roe: (row) => row.roe ?? null,
    der: (row) => row.der ?? null,
    week26PC: (row) => row.week26PC ?? null,
    week52PC: (row) => row.week52PC ?? null,
    divYield: (row) => (row.divYield != null ? row.divYield * 100 : null),
    divYears: (row) => row.divYears ?? null,
    compositeScore: (row) => row.compositeScore ?? null,
    valueScore: (row) => row.valueScore ?? null,
    qualityScore: (row) => row.qualityScore ?? null,
    momentumScore: (row) => row.momentumScore ?? null,
    changePct: (row) => row.changePct ?? null
  }
  if (sortByParam != null && sortByParam in sortWhitelist) {
    const accessor = sortWhitelist[sortByParam]!
    const dir = sortDirParam === 'asc' ? 1 : -1
    filteredCandidates = [...filteredCandidates].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (av == null && bv == null) {
        return 0
      }
      if (av == null) {
        return 1
      }
      if (bv == null) {
        return -1
      }
      return dir * (av - bv)
    })
  }
  const totalCount = filteredCandidates.length
  const withPercentile = filteredCandidates.map((row, index) => ({
    ...row,
    compositePercentile: Utils.compositePercentile(index, totalCount)
  }))
  const { data } = Utils.applyPagination(withPercentile, offset, limit)
  const response: Types.CandidatesResponse = {
    date: summaryDate,
    totalCount,
    limit,
    offset,
    serverTimestamp: new Date().toISOString(),
    data
  }
  return ctx.send.json(response)
}
