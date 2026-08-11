/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useState } from 'react'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

type Strategy = 'momentum' | 'rsi' | 'value'

const STRATEGY_LABEL: Record<Strategy, string> = {
  momentum: 'Momentum (beli yang kuat)',
  rsi: 'RSI (beli yang oversold)',
  value: 'Value (PER kuartalan terendah, historis)'
}

function EquityChart({
  equity
}: {
  equity: { date: number; strategy: number; benchmark: number }[]
}) {
  if (equity.length === 0) {
    return <p className='idx-muted'>Belum ada data kurva.</p>
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
        <polyline points={line('strategy')} fill='none' stroke='#2563eb' strokeWidth={2.5} />
      </svg>
      <div className='idx-legend'>
        <span className='idx-legend-item'>
          <span className='idx-legend-dot idx-legend-dot-strategy' /> Strategi
        </span>
        <span className='idx-legend-item'>
          <span className='idx-legend-dot idx-legend-dot-benchmark' /> Benchmark (rata-rata pasar)
        </span>
        {last != null && (
          <span className='idx-legend-date'>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Types.BacktestResult | null>(null)

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await Hooks.fetchApi<Types.BacktestResult>('/api/backtest', {
        strategy,
        topN,
        rebalanceWeeks,
        startDate: startDate === '' ? undefined : Number(startDate),
        minValue: minValue === '' ? undefined : Number(minValue),
        excludeNotation
      })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menjalankan backtest')
    } finally {
      setLoading(false)
    }
  }, [strategy, topN, rebalanceWeeks, startDate, minValue, excludeNotation])

  const stats = result?.stats
  const fmtPct = (v: number | undefined) => Utils.Format.formatPct(v != null ? v * 100 : null)
  const fmtX = (v: number | undefined) => `${(v != null ? v * 100 : 0).toFixed(1)}%`

  return (
    <div className='idx-page'>
      <div className='idx-main'>
        <h1 className='idx-h1'>Backtest Strategi</h1>
        <p className='idx-muted'>
          Uji aturan screening terhadap 2 tahun data historis. Rebalance berkala, portofolio
          equal-weight, dibandingkan dengan benchmark IHSG (COMPOSITE) atau rata-rata pasar bila
          data indeks belum tersedia. Strategi value memakai PER dari laporan keuangan kuartalan
          historis.
        </p>

        <div className='idx-card idx-mb-24'>
          <div className='idx-backtest-controls'>
            <div className='idx-form-group'>
              <label className='idx-form-label' htmlFor='bt-strategy'>
                Strategi
              </label>
              <select
                id='bt-strategy'
                className='idx-select'
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as Strategy)}
              >
                <option value='momentum'>Momentum</option>
                <option value='rsi'>RSI (oversold)</option>
                <option value='value'>Value (PER)</option>
              </select>
            </div>
            <div className='idx-form-group'>
              <label className='idx-form-label' htmlFor='bt-topn'>
                Top N
              </label>
              <input
                id='bt-topn'
                type='number'
                className='idx-input'
                min={1}
                max={50}
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value) || 10)}
              />
            </div>
            <div className='idx-form-group'>
              <label className='idx-form-label' htmlFor='bt-rebalance'>
                Rebalance (minggu)
              </label>
              <select
                id='bt-rebalance'
                className='idx-select'
                value={rebalanceWeeks}
                onChange={(e) => setRebalanceWeeks(Number(e.target.value) as 4 | 12 | 26)}
              >
                <option value={4}>4 minggu</option>
                <option value={12}>12 minggu</option>
                <option value={26}>26 minggu</option>
              </select>
            </div>
            <div className='idx-form-group'>
              <label className='idx-form-label' htmlFor='bt-start'>
                Mulai (yyyymmdd)
              </label>
              <input
                id='bt-start'
                type='text'
                className='idx-input'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className='idx-form-group'>
              <label className='idx-form-label' htmlFor='bt-minvalue'>
                Min Value (Rp)
              </label>
              <input
                id='bt-minvalue'
                type='text'
                className='idx-input'
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
            <div className='idx-form-group'>
              <label className='idx-form-label'>
                <input
                  type='checkbox'
                  checked={excludeNotation}
                  onChange={(e) => setExcludeNotation(e.target.checked)}
                />{' '}
                Exclude Notation
              </label>
            </div>
            <div className='idx-form-group'>
              <button
                type='button'
                className='idx-btn'
                disabled={loading}
                onClick={handleRun}
              >
                {loading ? 'Menjalankan...' : 'Jalankan Backtest'}
              </button>
            </div>
          </div>
          {error != null && <p className='idx-error'>{error}</p>}
        </div>

        {result != null && stats != null && (
          <>
            <div className='idx-card idx-mb-24'>
              <h2 className='idx-card-title'>Hasil ({STRATEGY_LABEL[strategy]})</h2>
              <div className='idx-backtest-stats'>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Return Strategi</span>
                  <span className='idx-stat-value'>{fmtX(stats.strategyTotal)}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Return Benchmark</span>
                  <span className='idx-stat-value'>{fmtX(stats.benchmarkTotal)}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Excess</span>
                  <span
                    className={`idx-stat-value ${
                      stats.excess >= 0 ? 'idx-pct-up' : 'idx-pct-down'
                    }`}
                  >
                    {fmtX(stats.excess)}
                  </span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Annualized</span>
                  <span className='idx-stat-value'>{fmtPct(stats.annualized)}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Max Drawdown</span>
                  <span className='idx-stat-value'>{fmtPct(-stats.maxDrawdown)}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Win Rate</span>
                  <span className='idx-stat-value'>{fmtPct(stats.winRate)}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Periode</span>
                  <span className='idx-stat-value'>{stats.periods}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Benchmark</span>
                  <span className='idx-stat-value'>{result.benchmarkLabel}</span>
                </div>
              </div>
            </div>

            <div className='idx-card idx-mb-24'>
              <h2 className='idx-card-title'>Kurva Equity</h2>
              <EquityChart equity={result.equity} />
            </div>

            <div className='idx-card'>
              <h2 className='idx-card-title'>
                Holdings Terakhir (Top {result.params.topN})
              </h2>
              <div className='idx-table-wrap'>
                <table className='idx-table'>
                  <thead>
                    <tr>
                      <th className='idx-table-col-kode'>Kode</th>
                      <th className='idx-table-col-nama'>Nama</th>
                      <th className='idx-table-th-right'>
                        {strategy === 'rsi' ? 'RSI' : strategy === 'value' ? 'PER' : 'Momentum'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lastHoldings.map((h) => (
                      <tr key={h.code}>
                        <td className='idx-table-col-kode'>
                          <span className='idx-table-code-bold'>{h.code}</span>
                        </td>
                        <td className='idx-table-col-nama'>{h.name ?? '-'}</td>
                        <td className='idx-table-td-right'>
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
