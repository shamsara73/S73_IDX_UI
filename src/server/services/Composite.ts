/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import type * as Types from '@app/server/services/Types.ts'

export class Composite {
  private static readonly defaultValueWeight = 0.4
  private static readonly defaultQualityWeight = 0.3
  private static readonly defaultMomentumWeight = 0.3

  private static resolveWeights(weights?: Types.CompositeWeights): Types.CompositeResolvedWeights {
    if (weights == null) {
      return {
        valueWeight: Composite.defaultValueWeight,
        qualityWeight: Composite.defaultQualityWeight,
        momentumWeight: Composite.defaultMomentumWeight
      }
    }
    const valueWeightNum = Number.isFinite(Number(weights.valueWeight))
      ? Number(weights.valueWeight)
      : Composite.defaultValueWeight
    const qualityWeightNum = Number.isFinite(Number(weights.qualityWeight))
      ? Number(weights.qualityWeight)
      : Composite.defaultQualityWeight
    const momentumWeightNum = Number.isFinite(Number(weights.momentumWeight))
      ? Number(weights.momentumWeight)
      : Composite.defaultMomentumWeight
    const weightSum = valueWeightNum + qualityWeightNum + momentumWeightNum
    if (weightSum <= 0) {
      return {
        valueWeight: Composite.defaultValueWeight,
        qualityWeight: Composite.defaultQualityWeight,
        momentumWeight: Composite.defaultMomentumWeight
      }
    }
    return {
      valueWeight: valueWeightNum / weightSum,
      qualityWeight: qualityWeightNum / weightSum,
      momentumWeight: momentumWeightNum / weightSum
    }
  }

  /** Rank-based percentile (0..1) — robust to outliers, unlike min-max. */
  private static percentileRank(values: number[]): Map<number, number> {
    const finite = values.filter((value) => Number.isFinite(value))
    if (finite.length === 0) {
      return new Map()
    }
    const sorted = [...finite].sort((a, b) => a - b)
    const n = sorted.length
    const rank = new Map<number, number>()
    for (const value of values) {
      if (!Number.isFinite(value)) {
        continue
      }
      let lo = 0
      let hi = n - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (sorted[mid]! <= value) {
          ans = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      rank.set(value, (ans + 1) / n)
    }
    return rank
  }

  /** Sanitize a momentum value: implausible extremes (data glitches) -> null. */
  private static sanitizePc(value: number | null): number | null {
    if (value == null || !Number.isFinite(value)) {
      return null
    }
    return Math.abs(value) <= 20 ? value : null
  }

  private static averageOf(values: number[]): number {
    const finiteValues = values.filter((value) => Number.isFinite(value))
    if (finiteValues.length === 0) {
      return 0
    }
    return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
  }

  static computeRanked(
    rows: Types.ScreenerRow[],
    weights?: Types.CompositeWeights
  ): Types.RankedRow[] {
    if (rows.length === 0) {
      return []
    }
    const { valueWeight, qualityWeight, momentumWeight } = Composite.resolveWeights(weights)
    const perNorm = Composite.percentileRank(rows.map((row) => (row.per != null && row.per > 0 ? row.per : NaN)))
    const pbvNorm = Composite.percentileRank(rows.map((row) => (row.pbv != null && row.pbv > 0 ? row.pbv : NaN)))
    const roeNorm = Composite.percentileRank(rows.map((row) => row.roe ?? NaN))
    const roaNorm = Composite.percentileRank(rows.map((row) => row.roa ?? NaN))
    const derNorm = Composite.percentileRank(rows.map((row) => (row.der != null && row.der >= 0 ? row.der : NaN)))
    const week26Norm = Composite.percentileRank(rows.map((row) => Composite.sanitizePc(row.week26PC) ?? NaN))
    const week52Norm = Composite.percentileRank(rows.map((row) => Composite.sanitizePc(row.week52PC) ?? NaN))
    const scoredRows: Types.RankedRow[] = rows.map((row) => {
      const perScore = row.per != null && row.per > 0 ? 1 - (perNorm.get(row.per) ?? 0) : 0
      const pbvScore = row.pbv != null && row.pbv > 0 ? 1 - (pbvNorm.get(row.pbv) ?? 0) : 0
      const valueParts = [perScore, pbvScore].filter(
        (_, i) => [row.per, row.pbv][i] != null && ([row.per, row.pbv][i] as number) > 0
      )
      const valueScore = valueParts.length > 0 ? Composite.averageOf(valueParts) : 0
      const roeScore = row.roe != null ? (roeNorm.get(row.roe) ?? 0) : 0
      const roaScore = row.roa != null ? (roaNorm.get(row.roa) ?? 0) : 0
      const derScore = row.der != null && row.der >= 0 ? 1 - (derNorm.get(row.der) ?? 0) : 0
      const qualityParts = [roeScore, roaScore, derScore].filter(
        (_, i) => [row.roe, row.roa, row.der][i] != null
      )
      const qualityScore = qualityParts.length > 0 ? Composite.averageOf(qualityParts) : 0
      const week26Score = row.week26PC != null ? (week26Norm.get(row.week26PC) ?? 0) : 0
      const week52Score = row.week52PC != null ? (week52Norm.get(row.week52PC) ?? 0) : 0
      const momentumParts = [week26Score, week52Score].filter(
        (_, i) => [row.week26PC, row.week52PC][i] != null
      )
      const momentumScore = momentumParts.length > 0 ? Composite.averageOf(momentumParts) : 0
      const compositeScore = valueWeight * valueScore + qualityWeight * qualityScore +
        momentumWeight * momentumScore
      return {
        code: row.code,
        name: row.name,
        sector: row.sector,
        valueScore: Math.round(valueScore * 1000) / 1000,
        qualityScore: Math.round(qualityScore * 1000) / 1000,
        momentumScore: Math.round(momentumScore * 1000) / 1000,
        compositeScore: Math.round(compositeScore * 1000) / 1000,
        rank: 0
      }
    })
    scoredRows.sort((a, b) => b.compositeScore - a.compositeScore)
    scoredRows.forEach((row, index) => {
      row.rank = index + 1
    })
    return scoredRows
  }
}
