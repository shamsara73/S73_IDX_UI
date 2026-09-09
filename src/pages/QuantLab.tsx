/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Cpu, TrendingUp, BarChart2, ShieldCheck, Activity, Target, Wallet, AlertOctagon, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import * as ScreenerComps from '@app/pages/components/screener/index.ts'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'

interface QuantData {
  date: number
  totalStocks: number
  topPicks: Array<{
    code: string
    date: number
    close: number | null
    sector: string | null
    predFwd5d: number | null
    aiScore5d: number | null
    predFwd10d: number | null
    aiScore10d: number | null
    probTop10: number | null
    signalGrade: string | null
  }>
  allPicks: Array<{
    code: string
    date: number
    close: number | null
    sector: string | null
    predFwd5d: number | null
    aiScore5d: number | null
    predFwd10d: number | null
    aiScore10d: number | null
    probTop10: number | null
    signalGrade: string | null
  }>
}

interface PaperData {
  portfolio: {
    id: string
    name: string
    initialCash: number
    cash: number
    nav: number
    peakNav: number
  }
  positions: Array<{
    id: number
    code: string
    shares: number
    avgBuyPrice: number
    currentPrice: number
    stopLoss: number | null
    takeProfit: number | null
    signalGrade: string | null
    unrealizedPnl: number
    unrealizedPnlPct: number
  }>
  trades: Array<{
    id: number
    code: string
    side: 'BUY' | 'SELL'
    shares: number
    price: number
    totalValue: number
    realizedPnl: number | null
    realizedPnlPct: number | null
    reason: string | null
    timestamp: number
  }>
  totalPnl: number
  totalPnlPct: number
  circuitBreaker: {
    halted: boolean
    maxDrawdownPct: number
    message: string
  }
}

export function QuantLab() {
  const [data, setData] = useState<QuantData | null>(null)
  const [paper, setPaper] = useState<PaperData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'alpha' | 'paper'>('alpha')
  const [activeHorizon, setActiveHorizon] = useState<'5d' | '10d'>('5d')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    fetchDetail,
    clearDetail
  } = Hooks.useStockDetail()

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [quantRes, paperRes] = await Promise.all([
        Hooks.fetchApi<{ ok: boolean; topPicks?: any[]; date?: number; totalStocks?: number; allPicks?: any[] }>('/api/quant/rankings'),
        Hooks.fetchApi<{ ok: boolean; data?: PaperData }>('/api/quant/paper')
      ])

      if (quantRes.ok && quantRes.topPicks) {
        setData({
          date: quantRes.date ?? 0,
          totalStocks: quantRes.totalStocks ?? 0,
          topPicks: quantRes.topPicks,
          allPicks: quantRes.allPicks ?? quantRes.topPicks
        })
      }
      if (paperRes.ok && paperRes.data) {
        setPaper(paperRes.data)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRowClick = useCallback((code: string) => {
    setSelectedStock(code)
    const endDate = data?.date ?? parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10)
    const startDate = Utils.Format.addDaysToDateInt(endDate, -90)
    fetchDetail(code, startDate, endDate, data?.date)
  }, [data?.date, fetchDetail])

  const handleCloseModal = useCallback(() => {
    setSelectedStock(null)
    clearDetail()
  }, [clearDetail])

  const handlePaperBuy = async (code: string, price: number | null, signalGrade: string | null) => {
    if (!price || price <= 0) return
    try {
      setOrderSubmitting(true)
      setOrderMsg(null)
      const res = await fetch('/api/quant/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUY',
          code,
          price,
          signalGrade: signalGrade ?? 'AAA',
          reason: 'QUANT_ENSEMBLE_PICK'
        })
      })
      const json = await res.json()
      if (json.ok) {
        setOrderMsg({ type: 'ok', text: `✅ Paper Buy Executed: ${json.trade.lots} lots ${code} @ Rp${price}` })
        await loadAll()
      } else {
        setOrderMsg({ type: 'err', text: `❌ Order Rejected: ${json.error}` })
      }
    } catch (e) {
      setOrderMsg({ type: 'err', text: String(e) })
    } finally {
      setOrderSubmitting(false)
    }
  }

  const handlePaperSell = async (code: string, price: number) => {
    try {
      setOrderSubmitting(true)
      setOrderMsg(null)
      const res = await fetch('/api/quant/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELL',
          code,
          price,
          reason: 'PROFIT_TAKE_OR_STOP'
        })
      })
      const json = await res.json()
      if (json.ok) {
        setOrderMsg({ type: 'ok', text: `✅ Paper Sell Executed: ${code} @ Rp${price}` })
        await loadAll()
      } else {
        setOrderMsg({ type: 'err', text: `❌ Sell Rejected: ${json.error}` })
      }
    } catch (e) {
      setOrderMsg({ type: 'err', text: String(e) })
    } finally {
      setOrderSubmitting(false)
    }
  }

  const sortedList = (data?.allPicks ?? []).slice().sort((a, b) => {
    if (activeHorizon === '5d') {
      return (b.aiScore5d ?? 0) - (a.aiScore5d ?? 0)
    }
    return (b.aiScore10d ?? 0) - (a.aiScore10d ?? 0)
  })

  return (
    <div className='container mx-auto max-w-7xl px-4 py-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-text flex items-center gap-2'>
            <Cpu className='text-accent' size={24} /> Quant AI & Paper Trading Lab
          </h1>
          <p className='text-sm text-text-muted'>
            Multi-Model Ensemble (LightGBM 5D/10D + Top-Decile Classifier) paired with Volatility Risk Budgeting & Real-time Paper Trading Sandbox.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('alpha')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'alpha' ? 'bg-accent text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            ⚡ Alpha Ensemble
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('paper')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'paper' ? 'bg-accent text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            <Wallet size={14} /> Paper Sandbox
          </button>
        </div>
      </div>

      {orderMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${orderMsg.type === 'ok' ? 'bg-accent/10 border border-accent/30 text-accent' : 'bg-down/10 border border-down/30 text-down'}`}>
          {orderMsg.text}
        </div>
      )}

      {/* Overview Cards */}
      {activeTab === 'alpha' ? (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <Target size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Ensemble Architecture</span>
              <p className='text-sm font-bold text-text'>35% Reg5D + 25% Reg10D + 25% Clf90 + 15% Rule</p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Circuit Breaker</span>
              <p className='text-sm font-bold font-mono text-text'>{paper?.circuitBreaker.message ?? 'Active'}</p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <BarChart2 size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Auto-Retrain Schedule</span>
              <p className='text-sm font-semibold text-text'>Every Sunday 19:00 WIB</p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <Activity size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Alpha Horizon</span>
              <div className='flex gap-1.5 mt-1'>
                <button
                  type='button'
                  onClick={() => setActiveHorizon('5d')}
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold transition ${activeHorizon === '5d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
                >
                  5D Target
                </button>
                <button
                  type='button'
                  onClick={() => setActiveHorizon('10d')}
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold transition ${activeHorizon === '10d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
                >
                  10D Target
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <Wallet size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Portfolio NAV</span>
              <p className='text-lg font-bold font-mono text-text'>Rp{(paper?.portfolio.nav ?? 0).toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <TrendingUp size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Total Realized + Unrealized</span>
              <p className={`text-lg font-bold font-mono ${(paper?.totalPnl ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
                {(paper?.totalPnlPct ?? 0) >= 0 ? '+' : ''}{(paper?.totalPnlPct ?? 0).toFixed(2)}%
                <span className='text-xs font-normal text-text-dim ml-1'>({(paper?.totalPnl ?? 0) >= 0 ? '+' : ''}Rp{(paper?.totalPnl ?? 0).toLocaleString('id-ID')})</span>
              </p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Available Cash</span>
              <p className='text-lg font-bold font-mono text-text'>Rp{(paper?.portfolio.cash ?? 0).toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
              <AlertOctagon size={20} />
            </div>
            <div>
              <span className='text-[11px] font-semibold text-text-dim uppercase'>Max Drawdown Limit</span>
              <p className='text-sm font-bold font-mono text-text'>
                {paper?.circuitBreaker.maxDrawdownPct.toFixed(1)}% / 10.0% Max Cap
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'alpha' ? (
        <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-text flex items-center gap-2'>
              <TrendingUp size={16} className='text-accent' />
              Ranked Ensemble Signals ({activeHorizon.toUpperCase()} Horizon)
            </h2>
            <span className='text-xs text-text-dim'>Click any row to inspect or execute risk-budgeted paper trade</span>
          </div>

          {loading && <div className='py-12 text-center text-sm text-text-muted'>Computing Ensemble Alpha...</div>}
          {error && <div className='py-12 text-center text-sm text-down'>{error}</div>}

          {!loading && !error && (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-border bg-surface-elevated/40 text-left text-[11px] text-text-muted'>
                    <th className='py-2.5 pl-4 pr-2 font-medium w-12'>Rank</th>
                    <th className='py-2.5 px-3 font-medium'>Kode</th>
                    <th className='py-2.5 px-3 font-medium'>Grade</th>
                    <th className='py-2.5 px-3 font-medium'>Sektor</th>
                    <th className='py-2.5 px-3 font-medium text-right'>Harga</th>
                    <th className='py-2.5 px-3 font-medium text-right'>Predicted 5D</th>
                    <th className='py-2.5 px-3 font-medium text-right'>Ensemble Alpha Score</th>
                    <th className='py-2.5 pr-4 font-medium text-right'>Paper Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.slice(0, 50).map((r, idx) => {
                    const score = activeHorizon === '5d' ? r.aiScore5d : r.aiScore10d
                    const pred = activeHorizon === '5d' ? r.predFwd5d : r.predFwd10d
                    const grade = r.signalGrade ?? 'A'
                    const gradeColor = grade === 'AAA' ? 'bg-accent/15 text-accent border-accent/40' : grade === 'AA' ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40' : 'bg-surface-elevated text-text-muted border-border'

                    return (
                      <tr
                        key={r.code}
                        className={`border-b border-border-subtle transition hover:bg-accent/5 ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/20'}`}
                      >
                        <td className='py-2.5 pl-4 pr-2 font-mono text-text-dim text-xs'>#{idx + 1}</td>
                        <td
                          onClick={() => handleRowClick(r.code)}
                          className='py-2.5 px-3 font-bold text-text tabular-nums cursor-pointer hover:text-accent'
                        >
                          {r.code}
                        </td>
                        <td className='py-2.5 px-3'>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${gradeColor}`}>
                            {grade}
                          </span>
                        </td>
                        <td className='py-2.5 px-3 text-text-muted text-xs truncate max-w-[150px]'>{r.sector ?? '—'}</td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums'>
                          {r.close != null ? `Rp${r.close.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${(pred ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
                          {pred != null ? `${pred >= 0 ? '+' : ''}${(pred * 100).toFixed(2)}%` : '—'}
                        </td>
                        <td className='py-2.5 px-3 text-right'>
                          <span className='inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-accent/10 text-accent'>
                            {score != null ? score.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className='py-2.5 pr-4 text-right'>
                          <button
                            type='button'
                            disabled={orderSubmitting}
                            onClick={() => handlePaperBuy(r.code, r.close, r.signalGrade)}
                            className='text-xs font-bold px-2.5 py-1 rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-bg-base transition disabled:opacity-30'
                          >
                            + Buy Size
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Paper Portfolio Tab */
        <div className='space-y-6'>
          {/* Positions Table */}
          <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
            <div className='p-4 border-b border-border flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-text flex items-center gap-2'>
                <Wallet size={16} className='text-accent' />
                Open Paper Positions ({paper?.positions.length ?? 0})
              </h2>
              <span className='text-xs text-text-dim'>Volatility-Sized with Active Stop Loss / Take Profit</span>
            </div>
            {(!paper?.positions || paper.positions.length === 0) ? (
              <div className='py-12 text-center text-sm text-text-dim'>No open positions. Buy top signals from the Alpha tab.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border bg-surface-elevated/40 text-left text-[11px] text-text-muted'>
                      <th className='py-2.5 pl-4 pr-3 font-medium'>Kode</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Lots</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Avg Buy</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Price</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Stop Loss</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Take Profit</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Unrealized P&L</th>
                      <th className='py-2.5 pr-4 font-medium text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paper.positions.map((pos, idx) => (
                      <tr key={pos.id} className={`border-b border-border-subtle ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/20'}`}>
                        <td
                          onClick={() => handleRowClick(pos.code)}
                          className='py-2.5 pl-4 pr-3 font-bold text-text cursor-pointer hover:text-accent'
                        >
                          {pos.code}
                        </td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums'>{(pos.shares / 100).toFixed(0)} lots</td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums'>Rp{pos.avgBuyPrice.toLocaleString('id-ID')}</td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums'>Rp{pos.currentPrice.toLocaleString('id-ID')}</td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums text-down'>Rp{pos.stopLoss?.toLocaleString('id-ID') ?? '—'}</td>
                        <td className='py-2.5 px-3 text-right font-mono tabular-nums text-up'>Rp{pos.takeProfit?.toLocaleString('id-ID') ?? '—'}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${pos.unrealizedPnl >= 0 ? 'text-up' : 'text-down'}`}>
                          {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
                          <span className='block text-[10px] font-normal text-text-dim'>Rp{pos.unrealizedPnl.toLocaleString('id-ID')}</span>
                        </td>
                        <td className='py-2.5 pr-4 text-right'>
                          <button
                            type='button'
                            disabled={orderSubmitting}
                            onClick={() => handlePaperSell(pos.code, pos.currentPrice)}
                            className='text-xs font-bold px-2.5 py-1 rounded bg-down/10 border border-down/30 text-down hover:bg-down hover:text-bg-base transition disabled:opacity-30'
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trade History */}
          <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
            <div className='p-4 border-b border-border flex items-center justify-between'>
              <h2 className='text-sm font-semibold text-text'>Recent Executions & Fill Ledger</h2>
              <span className='text-xs text-text-dim'>Includes 0.15% Buy & 0.25% Sell Broker + Tax Fees</span>
            </div>
            {(!paper?.trades || paper.trades.length === 0) ? (
              <div className='py-8 text-center text-sm text-text-dim'>No executed trades yet.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-border bg-surface-elevated/40 text-left text-[11px] text-text-muted'>
                      <th className='py-2.5 pl-4 pr-3 font-medium'>Side</th>
                      <th className='py-2.5 px-3 font-medium'>Kode</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Lots</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Fill Price</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Total Value</th>
                      <th className='py-2.5 px-3 font-medium text-right'>Realized P&L</th>
                      <th className='py-2.5 pr-4 font-medium text-right'>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paper.trades.map((t) => (
                      <tr key={t.id} className='border-b border-border-subtle'>
                        <td className='py-2 pl-4 pr-3'>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${t.side === 'BUY' ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                            {t.side === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {t.side}
                          </span>
                        </td>
                        <td className='py-2 px-3 font-bold text-text'>{t.code}</td>
                        <td className='py-2 px-3 text-right font-mono tabular-nums'>{(t.shares / 100).toFixed(0)}</td>
                        <td className='py-2 px-3 text-right font-mono tabular-nums'>Rp{t.price.toLocaleString('id-ID')}</td>
                        <td className='py-2 px-3 text-right font-mono tabular-nums'>Rp{t.totalValue.toLocaleString('id-ID')}</td>
                        <td className={`py-2 px-3 text-right font-mono tabular-nums ${t.realizedPnl != null ? (t.realizedPnl >= 0 ? 'text-up' : 'text-down') : 'text-text-dim'}`}>
                          {t.realizedPnl != null ? `${t.realizedPnl >= 0 ? '+' : ''}Rp${t.realizedPnl.toLocaleString('id-ID')}` : '—'}
                        </td>
                        <td className='py-2 pr-4 text-right text-xs text-text-dim font-mono'>
                          {new Date(t.timestamp).toLocaleTimeString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Detail Modal */}
      {selectedStock && (
        <ScreenerComps.StockDetailModal
          detail={detailData}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
