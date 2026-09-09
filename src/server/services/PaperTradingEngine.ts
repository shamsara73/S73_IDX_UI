/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Paper Trading Engine — simulated automated execution, P&L accounting, & risk constraints.
 */

import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { eq, desc, and } from 'drizzle-orm'
import { RiskManager } from '@app/server/services/RiskManager.ts'

const DEFAULT_PORTFOLIO_ID = 'main_quant_fund'
const INITIAL_CASH = 100_000_000 // Rp 100 Juta default sandbox capital
const BUY_FEE_PCT = 0.0015 // 0.15% IDX Broker + Levy fee
const SELL_FEE_PCT = 0.0025 // 0.25% IDX Broker + Levy + 0.1% Final Tax

export class PaperTradingEngine {
  /**
   * Ensure default paper portfolio exists
   */
  static async getOrCreatePortfolio(portfolioId: string = DEFAULT_PORTFOLIO_ID) {
    const existing = await Database.select()
      .from(Schemas.paperPortfolios)
      .where(eq(Schemas.paperPortfolios.id, portfolioId))
      .limit(1)

    const now = Date.now()
    if (existing.length === 0) {
      const p = {
        id: portfolioId,
        name: 'Quant Alpha Fund Sandbox',
        initialCash: INITIAL_CASH,
        cash: INITIAL_CASH,
        nav: INITIAL_CASH,
        peakNav: INITIAL_CASH,
        createdAt: now,
        updatedAt: now
      }
      await Database.insert(Schemas.paperPortfolios).values(p)
      return p
    }
    return existing[0]!
  }

  /**
   * Execute Paper Buy Order with Risk-Adjusted Position Sizing
   */
  static async executeBuy(code: string, price: number, atr14: number | null, signalGrade: string = 'AAA', reason: string = 'QUANT_ALPHA_SIGNAL') {
    const cleanCode = code.trim().toUpperCase()
    const portfolio = await PaperTradingEngine.getOrCreatePortfolio()

    // 1. Evaluate Circuit Breaker
    const cb = RiskManager.evaluateCircuitBreaker(portfolio.peakNav, portfolio.nav)
    if (cb.halted) {
      throw new Error(`Execution rejected: ${cb.message}`)
    }

    // 2. Position Sizing
    const sizing = RiskManager.calculatePosition({
      portfolioNav: portfolio.nav,
      stockPrice: price,
      atr14,
      targetRiskPerTradePct: 0.01
    })

    if (sizing.shares === 0) {
      throw new Error(`Position sizing returned 0 lots for ${cleanCode} at Rp${price}`)
    }

    const tradeValue = sizing.shares * price
    const fee = tradeValue * BUY_FEE_PCT
    const totalCost = tradeValue + fee

    if (portfolio.cash < totalCost) {
      throw new Error(`Insufficient cash. Required: Rp${totalCost.toLocaleString('id-ID')}, Available: Rp${portfolio.cash.toLocaleString('id-ID')}`)
    }

    const now = Date.now()

    // 3. Update or Insert Position
    const existingPos = await Database.select()
      .from(Schemas.paperPositions)
      .where(and(eq(Schemas.paperPositions.portfolioId, portfolio.id), eq(Schemas.paperPositions.code, cleanCode)))
      .limit(1)

    if (existingPos.length > 0) {
      const pos = existingPos[0]!
      const totalShares = pos.shares + sizing.shares
      const totalValueSpent = pos.shares * pos.avgBuyPrice + tradeValue
      const newAvgPrice = totalValueSpent / totalShares

      await Database.update(Schemas.paperPositions)
        .set({
          shares: totalShares,
          avgBuyPrice: newAvgPrice,
          currentPrice: price,
          stopLoss: sizing.stopLossPrice,
          takeProfit: sizing.takeProfitPrice,
          signalGrade,
          unrealizedPnl: (price - newAvgPrice) * totalShares,
          unrealizedPnlPct: ((price - newAvgPrice) / newAvgPrice) * 100,
          updatedAt: now
        })
        .where(eq(Schemas.paperPositions.id, pos.id))
    } else {
      await Database.insert(Schemas.paperPositions).values({
        portfolioId: portfolio.id,
        code: cleanCode,
        shares: sizing.shares,
        avgBuyPrice: price,
        currentPrice: price,
        stopLoss: sizing.stopLossPrice,
        takeProfit: sizing.takeProfitPrice,
        signalGrade,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        updatedAt: now
      })
    }

    // 4. Log Trade History
    await Database.insert(Schemas.paperTrades).values({
      portfolioId: portfolio.id,
      code: cleanCode,
      side: 'BUY',
      shares: sizing.shares,
      price,
      fee,
      totalValue: tradeValue,
      realizedPnl: null,
      realizedPnlPct: null,
      reason,
      timestamp: now
    })

    // 5. Deduct Cash & Rebalance NAV
    const newCash = portfolio.cash - totalCost
    await PaperTradingEngine.recalcPortfolioNav(portfolio.id, newCash)

    return {
      ok: true,
      code: cleanCode,
      lots: sizing.lots,
      shares: sizing.shares,
      price,
      totalCost,
      stopLoss: sizing.stopLossPrice,
      takeProfit: sizing.takeProfitPrice
    }
  }

  /**
   * Execute Paper Sell Order
   */
  static async executeSell(code: string, price: number, sharesToSell?: number, reason: string = 'TAKE_PROFIT') {
    const cleanCode = code.trim().toUpperCase()
    const portfolio = await PaperTradingEngine.getOrCreatePortfolio()

    const existingPos = await Database.select()
      .from(Schemas.paperPositions)
      .where(and(eq(Schemas.paperPositions.portfolioId, portfolio.id), eq(Schemas.paperPositions.code, cleanCode)))
      .limit(1)

    if (existingPos.length === 0 || existingPos[0]!.shares <= 0) {
      throw new Error(`No open position found for ${cleanCode}`)
    }

    const pos = existingPos[0]!
    const shares = sharesToSell ? Math.min(sharesToSell, pos.shares) : pos.shares
    const tradeValue = shares * price
    const fee = tradeValue * SELL_FEE_PCT
    const netProceeds = tradeValue - fee

    const costBasis = shares * pos.avgBuyPrice
    const realizedPnl = (tradeValue - costBasis) - fee
    const realizedPnlPct = (realizedPnl / costBasis) * 100

    const now = Date.now()

    // 1. Update or Delete Position
    if (shares >= pos.shares) {
      await Database.delete(Schemas.paperPositions).where(eq(Schemas.paperPositions.id, pos.id))
    } else {
      const remainingShares = pos.shares - shares
      await Database.update(Schemas.paperPositions)
        .set({
          shares: remainingShares,
          currentPrice: price,
          unrealizedPnl: (price - pos.avgBuyPrice) * remainingShares,
          unrealizedPnlPct: ((price - pos.avgBuyPrice) / pos.avgBuyPrice) * 100,
          updatedAt: now
        })
        .where(eq(Schemas.paperPositions.id, pos.id))
    }

    // 2. Log Trade
    await Database.insert(Schemas.paperTrades).values({
      portfolioId: portfolio.id,
      code: cleanCode,
      side: 'SELL',
      shares,
      price,
      fee,
      totalValue: tradeValue,
      realizedPnl,
      realizedPnlPct,
      reason,
      timestamp: now
    })

    // 3. Update Cash & Recalculate NAV
    const newCash = portfolio.cash + netProceeds
    await PaperTradingEngine.recalcPortfolioNav(portfolio.id, newCash)

    return {
      ok: true,
      code: cleanCode,
      shares,
      price,
      realizedPnl,
      realizedPnlPct
    }
  }

  /**
   * Recalculate Portfolio NAV from current open positions + cash
   */
  static async recalcPortfolioNav(portfolioId: string, cash: number) {
    const positions = await Database.select()
      .from(Schemas.paperPositions)
      .where(eq(Schemas.paperPositions.portfolioId, portfolioId))

    const positionsValue = positions.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0)
    const currentNav = cash + positionsValue

    const portfolio = await Database.select()
      .from(Schemas.paperPortfolios)
      .where(eq(Schemas.paperPortfolios.id, portfolioId))
      .limit(1)

    const peakNav = portfolio.length > 0 ? Math.max(portfolio[0]!.peakNav, currentNav) : currentNav
    const now = Date.now()

    await Database.update(Schemas.paperPortfolios)
      .set({
        cash,
        nav: currentNav,
        peakNav,
        updatedAt: now
      })
      .where(eq(Schemas.paperPortfolios.id, portfolioId))
  }

  /**
   * Summary overview including circuit breaker health check
   */
  static async getSummary(portfolioId: string = DEFAULT_PORTFOLIO_ID) {
    const portfolio = await PaperTradingEngine.getOrCreatePortfolio(portfolioId)
    const positions = await Database.select()
      .from(Schemas.paperPositions)
      .where(eq(Schemas.paperPositions.portfolioId, portfolio.id))
      .orderBy(desc(Schemas.paperPositions.unrealizedPnl))

    const trades = await Database.select()
      .from(Schemas.paperTrades)
      .where(eq(Schemas.paperTrades.portfolioId, portfolio.id))
      .orderBy(desc(Schemas.paperTrades.timestamp))
      .limit(25)

    const circuitBreaker = RiskManager.evaluateCircuitBreaker(portfolio.peakNav, portfolio.nav)
    const totalPnl = portfolio.nav - portfolio.initialCash
    const totalPnlPct = (totalPnl / portfolio.initialCash) * 100

    return {
      portfolio,
      positions,
      trades,
      totalPnl,
      totalPnlPct,
      circuitBreaker
    }
  }
}

export default PaperTradingEngine
