/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Risk Management, Position Sizing, Volatility Targeting & Drawdown Limits.
 */

export interface RiskInput {
  portfolioNav: number
  stockPrice: number
  atr14: number | null
  volatility60d?: number | null
  targetRiskPerTradePct?: number // e.g., 0.01 = 1% NAV risk
  maxSectorExposurePct?: number // e.g., 0.25 = 25% max in one sector
  targetAnnualVol?: number // e.g., 0.15 = 15% target portfolio vol
}

export interface PositionSizingResult {
  shares: number
  lots: number // 1 lot = 100 shares on IDX
  positionValue: number
  portfolioWeight: number
  stopLossPrice: number
  takeProfitPrice: number
  riskRewardRatio: number
  maxLossRp: number
  volatilityRegime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH'
  suggestedAction: 'BUY_FULL' | 'BUY_HALF' | 'REDUCE_SIZE' | 'AVOID'
}

export class RiskManager {
  /**
   * Calculates volatility-adjusted position size using ATR-based risk budgeting.
   */
  static calculatePosition(input: RiskInput): PositionSizingResult {
    const nav = Math.max(1_000_000, input.portfolioNav)
    const price = Math.max(1, input.stockPrice)
    const riskPerTradePct = input.targetRiskPerTradePct ?? 0.01 // 1% default max loss of total capital
    const maxRiskBudgetRp = nav * riskPerTradePct

    // ATR-based stop distance (1.5x ATR)
    const rawAtr = input.atr14 && input.atr14 > 0 ? input.atr14 : price * 0.03
    const stopDistance = rawAtr * 1.5
    const stopLossPrice = Math.max(1, Math.round(price - stopDistance))
    const takeProfitPrice = Math.round(price + stopDistance * 2.5) // 1 : 2.5 risk-to-reward

    // Max shares based on risk budget
    const riskPerShare = price - stopLossPrice
    let targetShares = riskPerShare > 0 ? Math.floor(maxRiskBudgetRp / riskPerShare) : 0

    // Apply IDX 100-shares lot rule
    let targetLots = Math.floor(targetShares / 100)

    // Position size caps: Never allocate more than 15% of total NAV to a single name
    const maxPositionBudget = nav * 0.15
    const maxLotsByNav = Math.floor(maxPositionBudget / (price * 100))
    targetLots = Math.min(targetLots, maxLotsByNav)
    targetShares = targetLots * 100

    const positionValue = targetShares * price
    const portfolioWeight = positionValue / nav
    const maxLossRp = targetShares * riskPerShare

    // Volatility Regime Classification
    const atrPct = (rawAtr / price) * 100
    let regime: PositionSizingResult['volatilityRegime'] = 'NORMAL'
    let action: PositionSizingResult['suggestedAction'] = 'BUY_FULL'

    if (atrPct < 2.0) {
      regime = 'LOW'
      action = 'BUY_FULL'
    } else if (atrPct <= 4.5) {
      regime = 'NORMAL'
      action = 'BUY_FULL'
    } else if (atrPct <= 7.5) {
      regime = 'ELEVATED'
      action = 'BUY_HALF'
    } else {
      regime = 'HIGH'
      action = 'REDUCE_SIZE'
    }

    if (targetLots === 0) {
      action = 'AVOID'
    }

    return {
      shares: targetShares,
      lots: targetLots,
      positionValue,
      portfolioWeight,
      stopLossPrice,
      takeProfitPrice,
      riskRewardRatio: 2.5,
      maxLossRp,
      volatilityRegime: regime,
      suggestedAction: action
    }
  }

  /**
   * Portfolio-level drawdown circuit breaker check.
   */
  static evaluateCircuitBreaker(peakNav: number, currentNav: number): { halted: boolean; maxDrawdownPct: number; message: string } {
    if (peakNav <= 0) return { halted: false, maxDrawdownPct: 0, message: 'Normal' }
    const dd = (peakNav - currentNav) / peakNav
    const ddPct = dd * 100

    if (ddPct >= 10.0) {
      return {
        halted: true,
        maxDrawdownPct: ddPct,
        message: `🚨 CIRCUIT BREAKER TRIGGERED: Portfolio drawdown ${ddPct.toFixed(1)}% exceeds 10% safety cap. Trading halted.`
      }
    }
    if (ddPct >= 6.0) {
      return {
        halted: false,
        maxDrawdownPct: ddPct,
        message: `⚠️ WARNING: Portfolio drawdown ${ddPct.toFixed(1)}% in caution zone. Position sizes halved.`
      }
    }
    return {
      halted: false,
      maxDrawdownPct: ddPct,
      message: `✅ Normal Operations. Max Drawdown: ${ddPct.toFixed(1)}%`
    }
  }
}

export default RiskManager
