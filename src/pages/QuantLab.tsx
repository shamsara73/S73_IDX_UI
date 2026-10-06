/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Cpu, TrendingUp, BarChart2, ShieldCheck, Activity, Target, Wallet, AlertOctagon, CheckCircle2, ArrowUpRight, ArrowDownRight, Sun, Moon } from 'lucide-react'
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

interface DayNightItem {
  rank: number
  code: string
  name: string | null
  sector: string | null
  lastClose: number | null
  volume20dAvg: number | null
  rvol: number | null
  closeLocationPct: number | null
  pbsjScore: number | null
  pbsjWinRate20d: number | null
  pbsjWinRate60d: number | null
  pbsjAvgRet20d: number | null
  pbsjAvgRet60d: number | null
  avgIntradayRange20d: number | null
  sbpjScore: number | null
  sbpjWinRate20d: number | null
  sbpjWinRate60d: number | null
  sbpjAvgRet20d: number | null
  sbpjAvgRet60d: number | null
}

export function QuantLab() {
  const [data, setData] = useState<QuantData | null>(null)
  const [paper, setPaper] = useState<PaperData | null>(null)
  const [dayNightList, setDayNightList] = useState<DayNightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'alpha' | 'pbsj' | 'sbpj' | 'paper'>('alpha')
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
      const [quantRes, paperRes, dnRes] = await Promise.all([
        Hooks.fetchApi<{ ok: boolean; topPicks?: any[]; date?: number; totalStocks?: number; allPicks?: any[] }>('/api/quant/rankings'),
        Hooks.fetchApi<{ ok: boolean; data?: PaperData }>('/api/quant/paper'),
        Hooks.fetchApi<{ ok: boolean; data?: DayNightItem[] }>(`/api/quant/day-night?type=${activeTab === 'sbpj' ? 'sbpj' : 'pbsj'}&limit=60`)
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
      if (dnRes.ok && dnRes.data) {
        setDayNightList(dnRes.data)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [activeTab])

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

  const handlePaperBuy = async (code: string, price: number | null, signalGrade: string | null, reason: string = 'QUANT_ENSEMBLE_PICK') => {
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
          reason
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
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-text flex items-center gap-2'>
            <Cpu className='text-accent' size={24} /> Quant AI & Day/Night Alpha Lab
          </h1>
          <p className='text-sm text-text-muted'>
            Machine Learning Ensemble + Anomaly Day/Night Screeners (Pagi Beli Sore Jual & Sore Beli Pagi Jual) with Volatility Risk Management.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => setActiveTab('alpha')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'alpha' ? 'bg-accent text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            ⚡ Alpha Ensemble
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('pbsj')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'pbsj' ? 'bg-amber-400 text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            <Sun size={13} className='text-amber-400' /> Pagi Beli Sore Jual
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('sbpj')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'sbpj' ? 'bg-indigo-400 text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            <Moon size={13} className='text-indigo-400' /> Sore Beli Pagi Jual
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('paper')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${activeTab === 'paper' ? 'bg-accent text-bg-base' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
          >
            <Wallet size={13} /> Paper Sandbox
          </button>
        </div>
      </div>

      {orderMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${orderMsg.type === 'ok' ? 'bg-accent/10 border border-accent/30 text-accent' : 'bg-down/10 border border-down/30 text-down'}`}>
          {orderMsg.text}
        </div>
      )}

      {/* Mode Overview Banner */}
      {activeTab === 'pbsj' && (
        <div className='p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-amber-500/20 text-amber-400'>
              <Sun size={24} />
            </div>
            <div>
              <h3 className='text-sm font-bold text-amber-300'>Pagi Beli Sore Jual (PBSJ - Intraday Momentum)</h3>
              <p className='text-xs text-text-muted'>
                Screens stocks with highest historical probability of closing higher than open: <span className='text-text font-mono font-bold'>P(Close &gt; Open) &gt; 65%</span> with high intraday range.
              </p>
            </div>
          </div>
          <div className='text-right'>
            <span className='text-[11px] text-text-dim uppercase'>Execution Window</span>
            <p className='text-xs font-bold text-text font-mono'>Entry 09:00–09:10 WIB → Exit 15:45–15:50 WIB</p>
          </div>
        </div>
      )}

      {activeTab === 'sbpj' && (
        <div className='p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400'>
              <Moon size={24} />
            </div>
            <div>
              <h3 className='text-sm font-bold text-indigo-300'>Sore Beli Pagi Jual (SBPJ - Overnight Gap Anomaly)</h3>
              <p className='text-xs text-text-muted'>
                Screens stocks with end-of-day accumulation closing near high of day (<span className='text-text font-mono font-bold'>Close Loc &gt; 80%</span>) and high overnight gap win-rate.
              </p>
            </div>
          </div>
          <div className='text-right'>
            <span className='text-[11px] text-text-dim uppercase'>Execution Window</span>
            <p className='text-xs font-bold text-text font-mono'>Entry 15:35–15:55 WIB → Exit 09:01–09:05 WIB Next Day</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'alpha' && (
        <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-text flex items-center gap-2'>
              <TrendingUp size={16} className='text-accent' />
              Ranked Ensemble Signals ({activeHorizon.toUpperCase()} Horizon)
            </h2>
            <div className='flex gap-1.5'>
              <button
                type='button'
                onClick={() => setActiveHorizon('5d')}
                className={`text-xs px-2.5 py-1 rounded font-mono font-bold transition ${activeHorizon === '5d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
              >
                5D Target
              </button>
              <button
                type='button'
                onClick={() => setActiveHorizon('10d')}
                className={`text-xs px-2.5 py-1 rounded font-mono font-bold transition ${activeHorizon === '10d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
              >
                10D Target
              </button>
            </div>
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
                    <th className='py-2.5 px-3 font-medium text-right'>Predicted {activeHorizon.toUpperCase()}</th>
                    <th className='py-2.5 px-3 font-medium text-right'>Ensemble Score</th>
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
                            onClick={() => handlePaperBuy(r.code, r.close, r.signalGrade, 'QUANT_ALPHA_PICK')}
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
      )}

      {/* PBSJ / SBPJ Tables */}
      {(activeTab === 'pbsj' || activeTab === 'sbpj') && (
        <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-text flex items-center gap-2'>
              {activeTab === 'pbsj' ? <Sun size={16} className='text-amber-400' /> : <Moon size={16} className='text-indigo-400' />}
              {activeTab === 'pbsj' ? 'Top Candidates — Pagi Beli Sore Jual (Intraday Alpha)' : 'Top Candidates — Sore Beli Pagi Jual (Overnight Gap Alpha)'}
            </h2>
            <span className='text-xs text-text-dim'>Sorted by composite strategy score (Win Rate + Expected Return + Extension)</span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border bg-surface-elevated/40 text-left text-[11px] text-text-muted'>
                  <th className='py-2.5 pl-4 pr-2 font-medium w-12'>Rank</th>
                  <th className='py-2.5 px-3 font-medium'>Kode</th>
                  <th className='py-2.5 px-3 font-medium'>Sektor</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Harga</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Win Rate (20D)</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Avg Ret (20D)</th>
                  <th className='py-2.5 px-3 font-medium text-right'>{activeTab === 'pbsj' ? 'Intraday Range' : 'Close Location'}</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Strategy Score</th>
                  <th className='py-2.5 pr-4 font-medium text-right'>Paper Action</th>
                </tr>
              </thead>
              <tbody>
                {dayNightList.map((r, idx) => {
                  const winRate = activeTab === 'pbsj' ? r.pbsjWinRate20d : r.sbpjWinRate20d
                  const avgRet = activeTab === 'pbsj' ? r.pbsjAvgRet20d : r.sbpjAvgRet20d
                  const score = activeTab === 'pbsj' ? r.pbsjScore : r.sbpjScore
                  const extraMetric = activeTab === 'pbsj' ? `${r.avgIntradayRange20d?.toFixed(1)}%` : `${r.closeLocationPct?.toFixed(0)}% at High`

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
                      <td className='py-2.5 px-3 text-text-muted text-xs truncate max-w-[140px]'>{r.sector ?? '—'}</td>
                      <td className='py-2.5 px-3 text-right font-mono tabular-nums'>
                        {r.lastClose != null ? `Rp${r.lastClose.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className='py-2.5 px-3 text-right font-mono font-bold text-accent tabular-nums'>
                        {winRate != null ? `${winRate.toFixed(1)}%` : '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${(avgRet ?? 0) >= 0 ? 'text-up font-semibold' : 'text-down'}`}>
                        {avgRet != null ? `${avgRet >= 0 ? '+' : ''}${avgRet.toFixed(2)}%` : '—'}
                      </td>
                      <td className='py-2.5 px-3 text-right font-mono text-xs text-text-muted tabular-nums'>
                        {extraMetric}
                      </td>
                      <td className='py-2.5 px-3 text-right'>
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${activeTab === 'pbsj' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-indigo-400/10 text-indigo-400 border border-indigo-400/30'}`}>
                          {score != null ? score.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className='py-2.5 pr-4 text-right'>
                        <button
                          type='button'
                          disabled={orderSubmitting}
                          onClick={() => handlePaperBuy(r.code, r.lastClose, 'A', activeTab === 'pbsj' ? 'PBSJ_DAYTRADE' : 'SBPJ_OVERNIGHT')}
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
        </div>
      )}

      {/* Paper Tab */}
      {activeTab === 'paper' && (
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
              <div className='py-12 text-center text-sm text-text-dim'>No open positions. Buy top signals from the Alpha or PBSJ/SBPJ tabs.</div>
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
                      <th className='py-2.5 px-3 font-medium'>Reason</th>
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
                        <td className='py-2 px-3 text-xs font-mono text-text-dim'>{t.reason ?? '—'}</td>
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
