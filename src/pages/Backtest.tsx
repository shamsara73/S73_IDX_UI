/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useState } from 'react'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

type Strategy = 'momentum' | 'rsi' | 'value' | 'dividend' | 'quality' | 'foreignFlow' | 'breakout' | 'meanReversion' | 'custom'

const STRATEGY_LABEL: Record<Strategy, string> = {
  momentum: 'Momentum (beli yang kuat)',
  rsi: 'RSI (beli oversold)',
  value: 'Value (PER rendah)',
  dividend: 'Dividend (yield tinggi)',
  quality: 'Quality (ROE tinggi, DER rendah)',
  foreignFlow: 'Foreign Flow (beli asing terbanyak)',
  breakout: 'Breakout (52w high)',
  meanReversion: 'Mean Reversion (jatuh terdalam)',
  custom: 'Custom (atur sendiri)'
}

function EquityChart({
  equity
}: {
  equity: { date: number; strategy: number; benchmark: number }[]
}) {
  if (equity.length === 0) {
    return <p className='text-text-muted py-8 text-center'>Belum ada data kurva.</p>
  }
  const width = 860
  const height = 280
  const pad = 12
  const all = equity.flatMap((p) => [p.strategy, p.benchmark])
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const x = (i: number) => pad + (i / Math.max(equity.length - 1, 1)) * (width - pad * 2)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const line = (key: 'strategy' | 'benchmark') =>
    equity.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const last = equity[equity.length - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }} role='img'>
        <polyline
          points={line('benchmark')}
          fill='none'
          stroke='#94a3b8'
          strokeWidth={1.5}
          strokeDasharray='4 3'
        />
        <polyline points={line('strategy')} fill='none' stroke='#39ff14' strokeWidth={2.5} />
      </svg>
      <div className='flex items-center gap-3 text-xs text-text-muted mt-2'>
        <span className='flex items-center gap-1'>
          <span className='w-2 h-2 rounded-full bg-accent' /> Strategi
        </span>
        <span className='flex items-center gap-1'>
          <span className='w-2 h-2 rounded-full bg-slate-400' /> Benchmark (rata-rata pasar)
        </span>
        {last != null && (
          <span className='ml-auto'>
            Terakhir: {Utils.Format.formatNum(last.date, 0)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Backtest() {
  const [strategy, setStrategy] = useState<Strategy>('momentum')
  const [topN, setTopN] = useState(10)
  const [rebalanceWeeks, setRebalanceWeeks] = useState<4 | 12 | 26>(4)
  const [startDate, setStartDate] = useState('20240811')
  const [minValue, setMinValue] = useState('1000000000')
  const [excludeNotation, setExcludeNotation] = useState(true)
  const [customPerMax, setCustomPerMax] = useState('')
  const [customRoeMin, setCustomRoeMin] = useState('')
  const [customDerMax, setCustomDerMax] = useState('')
  const [customYieldMin, setCustomYieldMin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Types.BacktestResult | null>(null)

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, unknown> = {
        strategy,
        topN,
        rebalanceWeeks,
        startDate: startDate === '' ? undefined : Number(startDate),
        minValue: minValue === '' ? undefined : Number(minValue),
        excludeNotation
      }
      if (strategy === 'custom') {
        if (customPerMax !== '') params.perMax = Number(customPerMax)
        if (customRoeMin !== '') params.roeMin = Number(customRoeMin)
        if (customDerMax !== '') params.derMax = Number(customDerMax)
        if (customYieldMin !== '') params.yieldMin = Number(customYieldMin)
      }
      const res = await Hooks.fetchApi<Types.BacktestResult>('/api/backtest', params)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menjalankan backtest')
    } finally {
      setLoading(false)
    }
  }, [strategy, topN, rebalanceWeeks, startDate, minValue, excludeNotation, customPerMax, customRoeMin, customDerMax, customYieldMin])

  const stats = result?.stats
  const fmtPct = (v: number | undefined) => Utils.Format.formatPct(v != null ? v * 100 : null)
  const fmtX = (v: number | undefined) => `${(v != null ? v * 100 : 0).toFixed(1)}%`

  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-4xl mx-auto px-4 py-8'>
        <h1 className='text-2xl font-bold'>Backtest Strategi</h1>
        <p className='text-text-muted'>
          Uji aturan screening terhadap 2 tahun data historis. Rebalance berkala, portofolio
          equal-weight, dibandingkan dengan benchmark IHSG (COMPOSITE) atau rata-rata pasar bila
          data indeks belum tersedia. Strategi value memakai PER dari laporan keuangan kuartalan
          historis.
        </p>

        <div className='rounded-lg border border-border bg-surface p-4 mb-6'>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted' htmlFor='bt-strategy'>
                Strategi
              </label>
              <select
                id='bt-strategy'
                className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text'
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as Strategy)}
              >
                {Object.entries(STRATEGY_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted' htmlFor='bt-topn'>
                Top N
              </label>
              <input
                id='bt-topn'
                type='number'
                className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text'
                min={1}
                max={50}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value) || 10)}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted' htmlFor='bt-rebalance'>
                Rebalance (minggu)
              </label>
              <select
                id='bt-rebalance'
                className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text'
                value={rebalanceWeeks}
                onChange={(e) => setRebalanceWeeks(Number(e.target.value) as 4 | 12 | 26)}
              >
                <option value={4}>4 minggu</option>
                <option value={12}>12 minggu</option>
                <option value={26}>26 minggu</option>
              </select>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted' htmlFor='bt-start'>
                Mulai (yyyymmdd)
              </label>
              <input
                id='bt-start'
                type='text'
                className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted' htmlFor='bt-minvalue'>
                Min Value (Rp)
              </label>
              <input
                id='bt-minvalue'
                type='text'
                className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text'
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-text-muted'>
                <input
                  type='checkbox'
                  checked={excludeNotation}
                  onChange={(e) => setExcludeNotation(e.target.checked)}
                />{' '}
                Exclude Notation
              </label>
            </div>
            <div className='flex flex-col gap-1'>
              <button
                type='button'
                className='h-9 rounded-md bg-accent px-4 text-sm font-semibold text-background'
                disabled={loading}
                onClick={handleRun}
              >
                {loading ? 'Menjalankan...' : 'Jalankan Backtest'}
              </button>
            </div>
          </div>
          {error != null && <p className='text-red-500 text-sm mt-2'>{error}</p>}

          {/* Custom strategy parameters */}
          {strategy === 'custom' && (
            <div className='mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3'>
              <p className='text-xs font-semibold text-accent mb-2'>Parameter Custom</p>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                {[
                  { label: 'PER Max', value: customPerMax, set: setCustomPerMax, placeholder: '15' },
                  { label: 'ROE Min (%)', value: customRoeMin, set: setCustomRoeMin, placeholder: '15' },
                  { label: 'DER Max', value: customDerMax, set: setCustomDerMax, placeholder: '1' },
                  { label: 'Yield Min (%)', value: customYieldMin, set: setCustomYieldMin, placeholder: '3' }
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label} className='flex flex-col gap-0.5'>
                    <label className='text-[10px] text-text-dim'>{label}</label>
                    <input
                      type='number'
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className='h-7 rounded border border-border bg-surface px-2 text-xs text-text placeholder:text-text-dim focus:border-accent focus:outline-none'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {result != null && stats != null && (
          <>
            <div className='rounded-lg border border-border bg-surface p-4 mb-6'>
              <h2 className='text-lg font-semibold text-text mb-3'>Hasil ({STRATEGY_LABEL[strategy]})</h2>
              <div className='grid grid-cols-3 sm:grid-cols-6 gap-3'>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Return Strategi</span>
                  <span className='text-sm font-medium text-text'>{fmtX(stats.strategyTotal)}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Return Benchmark</span>
                  <span className='text-sm font-medium text-text'>{fmtX(stats.benchmarkTotal)}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Excess</span>
                  <span
                    className={`text-sm font-medium ${
                      stats.excess >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {fmtX(stats.excess)}
                  </span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Annualized</span>
                  <span className='text-sm font-medium text-text'>{fmtPct(stats.annualized)}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Max Drawdown</span>
                  <span className='text-sm font-medium text-text'>{fmtPct(-stats.maxDrawdown)}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Win Rate</span>
                  <span className='text-sm font-medium text-text'>{fmtPct(stats.winRate)}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Periode</span>
                  <span className='text-sm font-medium text-text'>{stats.periods}</span>
                </div>
                <div className='flex flex-col'>
                  <span className='text-xs text-text-muted'>Benchmark</span>
                  <span className='text-sm font-medium text-text'>{result.benchmarkLabel}</span>
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-border bg-surface p-4 mb-6'>
              <h2 className='text-lg font-semibold text-text mb-3'>Kurva Equity</h2>
              <EquityChart equity={result.equity} />
            </div>

            <div className='rounded-lg border border-border bg-surface p-4'>
              <h2 className='text-lg font-semibold text-text mb-3'>
                Holdings Terakhir (Top {result.params.topN})
              </h2>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm text-left'>
                  <thead>
                    <tr>
                      <th className='px-3 py-2 font-medium text-text'>Kode</th>
                      <th className='px-3 py-2 text-text-muted'>Nama</th>
                      <th className='px-3 py-2 text-right text-text-muted'>
                        {strategy === 'rsi' ? 'RSI' : strategy === 'value' ? 'PER' : 'Momentum'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lastHoldings.map((h) => (
                      <tr key={h.code} className='border-t border-border'>
                        <td className='px-3 py-2'>
                          <span className='font-semibold text-text'>{h.code}</span>
                        </td>
                        <td className='px-3 py-2 text-text-muted'>{h.name ?? '-'}</td>
                        <td className='px-3 py-2 text-right text-text'>
                          {Utils.Format.formatNum(h.metric, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
