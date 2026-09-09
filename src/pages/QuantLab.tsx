/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Cpu, TrendingUp, BarChart2, ShieldCheck, Activity, Target } from 'lucide-react'
import * as ScreenerComps from '@app/pages/components/screener/index.ts'
import * as Hooks from '@app/pages/hooks/index.ts'

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
  }>
}

export function QuantLab() {
  const [data, setData] = useState<QuantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [activeHorizon, setActiveHorizon] = useState<'5d' | '10d'>('5d')

  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    fetchDetail,
    clearDetail
  } = Hooks.useStockDetail()

  const handleRowClick = useCallback((code: string) => {
    setSelectedStock(code)
    fetchDetail(code)
  }, [fetchDetail])

  const handleCloseModal = useCallback(() => {
    setSelectedStock(null)
    clearDetail()
  }, [clearDetail])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await Hooks.fetchApi<{ ok: boolean; data?: QuantData; topPicks?: any[]; date?: number; totalStocks?: number; allPicks?: any[] }>('/api/quant/rankings')
        if (res.ok && res.topPicks) {
          setData({
            date: res.date ?? 0,
            totalStocks: res.totalStocks ?? 0,
            topPicks: res.topPicks,
            allPicks: res.allPicks ?? res.topPicks
          })
        } else {
          setError('Model inferences not generated yet.')
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
            <Cpu className='text-accent' size={24} /> Quant AI Alpha Lab
          </h1>
          <p className='text-sm text-text-muted'>
            Walk-Forward Machine Learning (LightGBM) factor ensemble trained on 50+ technical, liquidity, volatility & fundamental signals.
          </p>
        </div>
        {data && (
          <div className='flex items-center gap-2 text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-md'>
            <span className='text-text-dim'>Inference Date:</span>
            <span className='text-accent font-bold'>{data.date}</span>
            <span className='text-border'>|</span>
            <span className='text-text-dim'>Universe:</span>
            <span className='text-text'>{data.totalStocks} Stocks</span>
          </div>
        )}
      </div>

      {/* Model Performance Overview Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
          <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
            <Target size={20} />
          </div>
          <div>
            <span className='text-[11px] font-semibold text-text-dim uppercase'>5D Model Rank IC</span>
            <p className='text-lg font-bold font-mono text-text'>+0.052 <span className='text-xs text-up font-normal'>(Peak +0.131)</span></p>
          </div>
        </div>
        <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
          <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className='text-[11px] font-semibold text-text-dim uppercase'>Cross-Validation</span>
            <p className='text-lg font-bold font-mono text-text'>5-Fold Purged <span className='text-xs text-text-muted font-normal'>(20D Embargo)</span></p>
          </div>
        </div>
        <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
          <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
            <BarChart2 size={20} />
          </div>
          <div>
            <span className='text-[11px] font-semibold text-text-dim uppercase'>Top Alpha Factors</span>
            <p className='text-sm font-semibold text-text truncate'>PBV, Ret120D, VWAP_Dist, Amihud</p>
          </div>
        </div>
        <div className='p-4 bg-surface border border-border rounded-xl flex items-center gap-3'>
          <div className='p-2.5 rounded-lg bg-accent/10 text-accent'>
            <Activity size={20} />
          </div>
          <div>
            <span className='text-[11px] font-semibold text-text-dim uppercase'>Target Horizons</span>
            <div className='flex gap-1.5 mt-1'>
              <button
                type='button'
                onClick={() => setActiveHorizon('5d')}
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold transition ${activeHorizon === '5d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
              >
                5D Forward
              </button>
              <button
                type='button'
                onClick={() => setActiveHorizon('10d')}
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold transition ${activeHorizon === '10d' ? 'bg-accent text-bg-base' : 'bg-surface-elevated text-text-muted'}`}
              >
                10D Forward
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className='p-0 overflow-hidden border border-border rounded-xl bg-surface'>
        <div className='p-4 border-b border-border flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-text flex items-center gap-2'>
            <TrendingUp size={16} className='text-accent' />
            Ranked Quant Signals ({activeHorizon.toUpperCase()} Horizon)
          </h2>
          <span className='text-xs text-text-dim'>Sorted by Model Decile Percentile (Top 50)</span>
        </div>

        {loading && <div className='py-12 text-center text-sm text-text-muted'>Calculating Alpha Scores...</div>}
        {error && <div className='py-12 text-center text-sm text-down'>{error}</div>}

        {!loading && !error && (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border bg-surface-elevated/40 text-left text-[11px] text-text-muted'>
                  <th className='py-2.5 pl-4 pr-2 font-medium w-12'>Rank</th>
                  <th className='py-2.5 px-3 font-medium'>Kode</th>
                  <th className='py-2.5 px-3 font-medium'>Sektor</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Harga Terakhir</th>
                  <th className='py-2.5 px-3 font-medium text-right'>Predicted Alpha</th>
                  <th className='py-2.5 pr-4 font-medium text-right'>AI Percentile Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.slice(0, 50).map((r, idx) => {
                  const score = activeHorizon === '5d' ? r.aiScore5d : r.aiScore10d
                  const pred = activeHorizon === '5d' ? r.predFwd5d : r.predFwd10d
                  return (
                    <tr
                      key={r.code}
                      onClick={() => handleRowClick(r.code)}
                      className={`cursor-pointer border-b border-border-subtle transition hover:bg-accent/5 ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/20'}`}
                    >
                      <td className='py-2.5 pl-4 pr-2 font-mono text-text-dim text-xs'>#{idx + 1}</td>
                      <td className='py-2.5 px-3 font-bold text-text tabular-nums flex items-center gap-1.5'>
                        {r.code}
                      </td>
                      <td className='py-2.5 px-3 text-text-muted text-xs truncate max-w-[150px]'>{r.sector ?? '—'}</td>
                      <td className='py-2.5 px-3 text-right font-mono tabular-nums'>
                        {r.close != null ? `Rp${r.close.toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${(pred ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
                        {pred != null ? `${pred >= 0 ? '+' : ''}${(pred * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td className='py-2.5 pr-4 text-right'>
                        <span className='inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-accent/10 text-accent'>
                          {score != null ? score.toFixed(1) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
