/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart2, LineChart as LineChartIcon, Sparkles, TrendingUp, X } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

const foreignPeriodOptions: Types.ForeignPeriodOption[] = [
  { days: 30, label: '1 bln' },
  { days: 60, label: '2 bln' },
  { days: 90, label: '3 bln' },
  { days: 180, label: '6 bln' },
  { days: 360, label: '1 tahun' }
]

function buildRsiChartData(rsiData: Types.RsiResponse | null): {
  chartData: Types.RsiChartPoint[]
  hasSector: boolean
} {
  if (!rsiData?.data?.length) {
    return { chartData: [], hasSector: false }
  }
  const byDate = new Map<string, Types.RsiChartPoint>()
  for (const row of rsiData.data) {
    const dateStr = Utils.Format.formatDateInt(row.date)
    byDate.set(dateStr, {
      date: dateStr,
      rsi: row.rsi ?? 0,
      sectorRsi: null
    })
  }
  if (rsiData.sectorData?.length) {
    for (const row of rsiData.sectorData) {
      const dateStr = Utils.Format.formatDateInt(row.date)
      const existing = byDate.get(dateStr)
      const sectorVal = row.rsi != null && Number.isFinite(row.rsi) ? row.rsi : null
      if (existing) {
        existing.sectorRsi = sectorVal
      } else {
        byDate.set(dateStr, { date: dateStr, rsi: 0, sectorRsi: sectorVal })
      }
    }
  }
  const chartData = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date, 'en'))
  const hasSector = chartData.some((d) => d.sectorRsi != null)
  return { chartData, hasSector }
}

function IntradayChart({ code }: { code: string }) {
  const [bars, setBars] = useState<{ time: string; close: number }[]>([])
  const [vwap, setVwap] = useState<number | null>(null)
  const [openingRange, setOpeningRange] = useState<{ high: number; low: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (code === '') { setLoading(false); return }
    let cancelled = false
    Promise.all([
      fetch(`/api/${encodeURIComponent(code)}/intraday`).then((r) => r.json()),
      fetch(`/api/${encodeURIComponent(code)}/realtime`).then((r) => r.json())
    ]).then(([intraday, realtime]) => {
      if (cancelled) return
      const raw = intraday.bars ?? []
      // Downsample to ~1-min for rendering (take every Nth bar)
      const step = Math.max(1, Math.floor(raw.length / 400))
      const sampled = raw.filter((_: unknown, i: number) => i % step === 0).map((b: { label: string; close: number }) => ({ time: b.label, close: b.close }))
      setBars(sampled)
      setVwap(realtime.vwap ?? null)
      setOpeningRange(intraday.openingRange ?? null)
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code])

  if (loading) return <p className='text-text-muted text-sm'>Memuat chart intraday...</p>
  if (bars.length === 0) return <p className='text-text-muted text-sm'>Data intraday tidak tersedia.</p>

  const orHigh = openingRange?.high ?? null
  const orLow = openingRange?.low ?? null

  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-4 mb-4'>
      <label className='text-xs font-medium text-text-muted'>Chart Intraday Hari Ini ({bars.length} titik)</label>
      <ResponsiveContainer width='100%' height={200}>
        <AreaChart data={bars} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--idx-border, #e2e8f0)' />
          <XAxis dataKey='time' tick={{ fontSize: 10 }} interval={Math.floor(bars.length / 6)} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={55} />
          <Tooltip
            contentStyle={{ fontSize: 12, background: 'var(--idx-surface, #fff)', border: '1px solid var(--idx-border, #e2e8f0)' }}
            formatter={(value: number) => [`${value.toLocaleString('id-ID')}`, 'Harga']}
          />
          {orHigh != null && orLow != null && (
            <ReferenceArea y1={orLow} y2={orHigh} fill='rgba(34,197,94,0.08)' stroke='none' />
          )}
          {vwap != null && (
            <ReferenceLine y={vwap} stroke='#8b5cf6' strokeDasharray='4 4' strokeWidth={1.5} label={{ value: `VWAP ${vwap.toLocaleString('id-ID')}`, position: 'right', fontSize: 10, fill: '#8b5cf6' }} />
          )}
          <Area type='monotone' dataKey='close' stroke='var(--idx-accent, #2563eb)' fill='var(--idx-accent-light, rgba(37,99,235,0.08))' strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      {orHigh != null && orLow != null && (
        <p className='text-text-muted text-xs mt-1'>
          Opening Range (30 menit pertama): {orLow.toLocaleString('id-ID')} – {orHigh.toLocaleString('id-ID')}
        </p>
      )}
    </div>
  )
}

function AiExplainView({ code }: { code: string }) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (code === '') {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setText(null)
    fetch(`/api/explain?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((json: { text?: string; error?: string }) => {
        if (cancelled) {
          return
        }
        if (json.error != null && json.error !== '') {
          setError(json.error)
        } else {
          setText(json.text ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Gagal memuat analisis AI')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-4'>
      {loading ? (
        <p className='text-text-muted text-sm'>Menyusun analisis AI...</p>
      ) : error != null ? (
        <p className='text-text-muted text-sm'>{error}</p>
      ) : (
        <p className='text-text text-sm leading-relaxed whitespace-pre-wrap'>{text ?? 'Tidak ada analisis tersedia.'}</p>
      )}
    </div>
  )
}

export default function StockDetailModal({
  detail,
  loading,
  error,
  onClose
}: Types.StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Types.DetailTab>('fundamental')
  const [foreignPeriodDays, setForeignPeriodDays] = useState<Types.ForeignPeriodDays>(90)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)
  const {
    data: rsiData,
    loading: rsiLoading,
    error: rsiError
  } = Hooks.useRSI(detail?.code ?? null, foreignPeriodDays)
  const {
    data: ohlcData,
    loading: ohlcLoading,
    error: ohlcError
  } = Hooks.useOHLC(detail?.code ?? null, foreignPeriodDays)
  const {
    data: foreignData,
    loading: foreignLoading,
    error: foreignError
  } = Hooks.useForeign(detail?.code ?? null, foreignPeriodDays)
  const chartData = detail?.ohlc?.map((ohlcRow: Types.StockDetailOhlcRow) => ({
    date: Utils.Format.formatDateInt(ohlcRow.date),
    close: ohlcRow.close ?? 0
  })) ?? []
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) {
      return undefined
    }
    const closes = chartData
      .map((chartPoint: Types.PriceLinePoint) => chartPoint.close)
      .filter((closePrice: number) => closePrice > 0)
    if (closes.length === 0) {
      return undefined
    }
    const minClose = Math.min(...closes)
    const maxClose = Math.max(...closes)
    return [Math.max(minClose, 1), maxClose]
  }, [chartData])

  const rsiChartData = useMemo(() => buildRsiChartData(rsiData ?? null), [rsiData])

  useEffect(() => {
    if (!detail) {
      return
    }
    previousActiveRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => {
      previousActiveRef.current?.focus?.()
    }
  }, [detail])

  const handleClose = useCallback(() => {
    previousActiveRef.current?.focus?.()
    onClose()
  }, [onClose])

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm' onClick={handleClose} role='presentation'>
      <div
        className='max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl'
        onClick={(event) => event.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-border'>
          <h2 className='text-lg font-semibold text-text flex items-center gap-2'>
            <LineChartIcon size={22} aria-hidden />
            <span>{detail ? `${detail.code}: ${detail.name ?? ''}` : 'Detail Saham'}</span>
          </h2>
          <button
            ref={closeButtonRef}
            type='button'
            className='text-text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-surface-elevated'
            onClick={handleClose}
            aria-label='Tutup Modal'
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className='p-6'>
          {loading && <div className='flex items-center justify-center py-8 text-text-muted text-sm'>Memuat...</div>}
          {error && <div className='text-down text-sm p-4 rounded-lg border border-down/30 bg-down/10'>{error}</div>}
          {detail && !loading && (
            <>
              <div className='flex gap-1 mb-4'>
                <button
                  type='button'
                  className={`px-4 py-2 text-sm rounded-lg text-text-muted transition-colors cursor-pointer border-b-2 border-transparent ${
                    activeTab === 'fundamental' ? 'text-accent border-accent bg-accent/10' : ''
                  }`}
                  onClick={() => setActiveTab('fundamental')}
                >
                  <BarChart2 size={16} aria-hidden />
                  <span>Analisa Fundamental</span>
                </button>
                <button
                  type='button'
                  className={`px-4 py-2 text-sm rounded-lg text-text-muted transition-colors cursor-pointer border-b-2 border-transparent ${
                    activeTab === 'technical' ? 'text-accent border-accent bg-accent/10' : ''
                  }`}
                  onClick={() => setActiveTab('technical')}
                >
                  <TrendingUp size={16} aria-hidden />
                  <span>Analisa Teknikal</span>
                </button>
                <button
                  type='button'
                  className={`px-4 py-2 text-sm rounded-lg text-text-muted transition-colors cursor-pointer border-b-2 border-transparent ${
                    activeTab === 'ai' ? 'text-accent border-accent bg-accent/10' : ''
                  }`}
                  onClick={() => setActiveTab('ai')}
                >
                  <Sparkles size={16} aria-hidden />
                  <span>AI</span>
                </button>
              </div>
              {activeTab === 'fundamental' && (
                <>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                    <section className='rounded-lg border border-border bg-surface-elevated p-4'>
                      <h4 className='text-xs font-semibold text-text-muted uppercase tracking-wider mb-3'>Klasifikasi</h4>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1 col-span-2'>
                          <label className='text-xs font-medium text-text-muted'>Sektor / Industri</label>
                          <span className='text-text text-sm'>{[detail.sector ?? '-', detail.industry ?? '-'].join(' / ')}</span>
                        </div>
                      </div>
                    </section>
                    <section className='rounded-lg border border-border bg-surface-elevated p-4'>
                      <h4 className='text-xs font-semibold text-text-muted uppercase tracking-wider mb-3'>Valuasi</h4>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>PER</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.per, 1)}</span>
                        </div>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>PBV</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.pbv, 1)}</span>
                        </div>
                      </div>
                    </section>
                    <section className='rounded-lg border border-border bg-surface-elevated p-4'>
                      <h4 className='text-xs font-semibold text-text-muted uppercase tracking-wider mb-3'>Profitabilitas</h4>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>ROE</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.roe, 1)}</span>
                        </div>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>ROA</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.roa, 1)}</span>
                        </div>
                      </div>
                    </section>
                    <section className='rounded-lg border border-border bg-surface-elevated p-4'>
                      <h4 className='text-xs font-semibold text-text-muted uppercase tracking-wider mb-3'>Leverage</h4>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>DER</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.der, 1)}</span>
                        </div>
                      </div>
                    </section>
                    <section className='rounded-lg border border-border bg-surface-elevated p-4'>
                      <h4 className='text-xs font-semibold text-text-muted uppercase tracking-wider mb-3'>Likuiditas</h4>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>Value</label>
                          <span className='text-text text-sm'>{Utils.Format.formatRp(detail.value)}</span>
                        </div>
                        <div className='space-y-1'>
                          <label className='text-xs font-medium text-text-muted'>Volume</label>
                          <span className='text-text text-sm'>{Utils.Format.formatNum(detail.volume, 0)}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                  <div className='rounded-lg border border-border bg-surface-elevated p-4'>
                    <label className='text-xs font-medium text-text-muted'>Skor</label>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr>
                          <th className='text-left text-text-muted'>Value</th>
                          <th className='text-left text-text-muted'>Quality</th>
                          <th className='text-left text-text-muted'>Momentum</th>
                          <th className='text-left text-text-muted'>Composite</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className='text-text'>{Utils.Format.formatNum(detail.valueScore, 3)}</td>
                          <td className='text-text'>{Utils.Format.formatNum(detail.qualityScore, 3)}</td>
                          <td className='text-text'>{Utils.Format.formatNum(detail.momentumScore, 3)}</td>
                          <td className='font-semibold text-accent'>
                            {Utils.Format.formatNum(detail.compositeScore, 3)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className='rounded-lg border border-border bg-surface-elevated p-4'>
                    <label className='text-xs font-medium text-text-muted'>Momentum</label>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr>
                          <th className='text-left text-text-muted'>4w</th>
                          <th className='text-left text-text-muted'>13w</th>
                          <th className='text-left text-text-muted'>26w</th>
                          <th className='text-left text-text-muted'>52w</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td
                            className={detail.week4PC != null
                              ? detail.week4PC >= 0 ? 'text-up' : 'text-down'
                              : ''}
                          >
                            {Utils.Format.formatPct(detail.week4PC ?? null)}
                          </td>
                          <td
                            className={detail.week13PC != null
                              ? detail.week13PC >= 0 ? 'text-up' : 'text-down'
                              : ''}
                          >
                            {Utils.Format.formatPct(detail.week13PC ?? null)}
                          </td>
                          <td
                            className={detail.week26PC != null
                              ? detail.week26PC >= 0 ? 'text-up' : 'text-down'
                              : ''}
                          >
                            {Utils.Format.formatPct(detail.week26PC ?? null)}
                          </td>
                          <td
                            className={detail.week52PC != null
                              ? detail.week52PC >= 0 ? 'text-up' : 'text-down'
                              : ''}
                          >
                            {Utils.Format.formatPct(detail.week52PC ?? null)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {chartData.length > 0 && (
                    <>
                      <label className='text-xs font-medium text-text-muted'>Pergerakan Harga (Close)</label>
                      <div className='rounded-lg border border-border bg-surface-elevated p-4 h-64'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id='detailChartGrad' x1='0' y1='0' x2='0' y2='1'>
                                <stop
                                  offset='5%'
                                  stopColor='#00ff88'
                                  stopOpacity={0.2}
                                />
                                <stop offset='95%' stopColor='#00ff88' stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey='date'
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <YAxis
                              orientation='right'
                              scale={yDomain ? 'log' : 'linear'}
                              {...(yDomain !== undefined && { domain: yDomain })}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Tooltip
                              contentStyle={{
                                background: '#0f172a',
                                color: 'white',
                                borderRadius: 12,
                                fontSize: 12
                              }}
                            />
                            <Area
                              type='monotone'
                              dataKey='close'
                              stroke='#00ff88'
                              strokeWidth={2}
                              fill='url(#detailChartGrad)'
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </>
              )}
              {activeTab === 'technical' && (
                <>
                  <IntradayChart code={detail?.code ?? ''} />
                  <div className='flex items-center gap-4 mb-4'>
                    <label className='text-xs font-medium text-text-muted'>Periode</label>
                    <div className='flex gap-1'>
                      {foreignPeriodOptions.map(({ days, label }) => (
                        <button
                          key={days}
                          type='button'
                          className={`px-4 py-2 text-sm rounded-lg text-text-muted transition-colors cursor-pointer border-b-2 border-transparent ${
                            foreignPeriodDays === days ? 'text-accent border-accent bg-accent/10' : ''
                          }`}
                          onClick={() => setForeignPeriodDays(days)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className='rounded-lg border border-border bg-surface-elevated p-4 mb-4'>
                    <label className='text-xs font-medium text-text-muted'>
                      RSI (14)
                      {rsiData?.sector != null && rsiData.sector !== '' && (
                        <span className='text-text-muted ml-1'>vs Sektor {rsiData.sector}</span>
                      )}
                    </label>
                    {rsiLoading && <div className='flex items-center justify-center py-8 text-text-muted text-sm'>Memuat RSI...</div>}
                    {rsiError && <div className='text-down text-sm p-4 rounded-lg border border-down/30 bg-down/10'>{rsiError}</div>}
                    {!rsiLoading && !rsiError && rsiChartData.chartData.length > 0 && (
                      <div className='rounded-lg border border-border bg-surface-elevated p-4 h-64'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <LineChart
                            data={rsiChartData.chartData}
                            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            <XAxis
                              dataKey='date'
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              orientation='right'
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length || !label) {
                                  return null
                                }
                                const p = payload[0]?.payload
                                if (p == null) {
                                  return null
                                }
                                return (
                                  <div className='bg-surface-elevated border border-border rounded-lg p-3 shadow-lg text-sm'>
                                    <div className='font-semibold text-text mb-2'>
                                      {Utils.Format.formatTitleCase(String(label))}
                                    </div>
                                    <div className='flex items-center gap-2'>
                                      <span className='w-3 h-3 rounded-full inline-block bg-accent' />
                                      <span className='text-text text-sm'>
                                        {Utils.Format.formatTitleCase('RSI (emiten)')}:{' '}
                                        {Utils.Format.formatNum(p.rsi, 2)}
                                      </span>
                                    </div>
                                    {p.sectorRsi != null && (
                                      <div className='flex items-center gap-2'>
                                        <span className='w-3 h-3 rounded-full inline-block bg-text-muted' />
                                        <span className='text-text text-sm'>
                                          {Utils.Format.formatTitleCase('RSI sektor (rata)')}:{' '}
                                          {Utils.Format.formatNum(p.sectorRsi, 2)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              }}
                            />
                            <ReferenceLine
                              y={30}
                              stroke='var(--idx-text-muted)'
                              strokeDasharray='2 2'
                            />
                            <ReferenceLine
                              y={70}
                              stroke='var(--idx-text-muted)'
                              strokeDasharray='2 2'
                            />
                            <Line
                              type='monotone'
                              dataKey='rsi'
                              name='Emiten'
                              stroke='var(--idx-primary)'
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                            {rsiChartData.hasSector && (
                              <Line
                                type='monotone'
                                dataKey='sectorRsi'
                                name='Sektor'
                                stroke='var(--idx-text-secondary)'
                                strokeWidth={1.5}
                                strokeDasharray='4 2'
                                dot={false}
                                isAnimationActive={false}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {!rsiLoading && !rsiError && rsiData && rsiData.data.length === 0 && (
                      <p className='text-text-muted text-sm'>Tidak ada data RSI untuk periode ini.</p>
                    )}
                  </div>
                  <div className='rounded-lg border border-border bg-surface-elevated p-4 mb-4'>
                    <label className='text-xs font-medium text-text-muted'>Volume (Bid vs Offer)</label>
                    {ohlcLoading && <div className='flex items-center justify-center py-8 text-text-muted text-sm'>Memuat volume...</div>}
                    {ohlcError && <div className='text-down text-sm p-4 rounded-lg border border-down/30 bg-down/10'>{ohlcError}</div>}
                    {!ohlcLoading && !ohlcError && ohlcData && ohlcData.length > 0 && (
                      <div className='rounded-lg border border-border bg-surface-elevated p-4 h-64'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart
                            data={ohlcData.map((row) => ({
                              date: Utils.Format.formatDateInt(row.date),
                              bidVolume: row.bidVolume ?? 0,
                              offerVolume: row.offerVolume ?? 0
                            }))}
                            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          >
                            <XAxis
                              dataKey='date'
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <YAxis
                              orientation='right'
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 10 }}
                              tickFormatter={(v) => Utils.Format.formatNum(v, 0)}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length || !label) {
                                  return null
                                }
                                const row = payload[0]?.payload
                                if (row == null) {
                                  return null
                                }
                                const bid = row.bidVolume ?? 0
                                const offer = row.offerVolume ?? 0
                                return (
                                  <div className='bg-surface-elevated border border-border rounded-lg p-3 shadow-lg text-sm'>
                                    <div className='font-semibold text-text mb-2'>
                                      {Utils.Format.formatTitleCase(String(label))}
                                    </div>
                                    <div className='flex items-center gap-2'>
                                      <span className='w-3 h-3 rounded-full inline-block bg-up' />
                                      <span className='text-text text-sm'>
                                        {Utils.Format.formatTitleCase('Bid')}:{' '}
                                        {Utils.Format.formatNum(bid, 0)}
                                      </span>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                      <span className='w-3 h-3 rounded-full inline-block bg-down' />
                                      <span className='text-text text-sm'>
                                        {Utils.Format.formatTitleCase('Offer')}:{' '}
                                        {Utils.Format.formatNum(offer, 0)}
                                      </span>
                                    </div>
                                    <div className='text-text text-sm'>
                                      {Utils.Format.formatTitleCase('Total')}:{' '}
                                      {Utils.Format.formatNum(bid + offer, 0)}
                                    </div>
                                  </div>
                                )
                              }}
                            />
                            <Bar
                              dataKey='bidVolume'
                              name='Bid'
                              stackId='vol'
                              fill='var(--idx-up)'
                              isAnimationActive={false}
                            />
                            <Bar
                              dataKey='offerVolume'
                              name='Offer'
                              stackId='vol'
                              fill='var(--idx-down)'
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {!ohlcLoading && !ohlcError && ohlcData && ohlcData.length === 0 && (
                      <p className='text-text-muted text-sm'>Tidak ada data volume untuk periode ini.</p>
                    )}
                  </div>
                  <div className='rounded-lg border border-border bg-surface-elevated p-4 mb-3'>
                    <label className='text-xs font-medium text-text-muted'>Aliran Asing (Net)</label>
                    {foreignLoading && <div className='flex items-center justify-center py-8 text-text-muted text-sm'>Memuat aliran asing...</div>}
                    {foreignError && <div className='text-down text-sm p-4 rounded-lg border border-down/30 bg-down/10'>{foreignError}</div>}
                    {!foreignLoading && !foreignError && foreignData && (
                      <>
                        {foreignData.summary.dayCount > 0 && (
                          <p className='text-text-muted text-sm mb-2'>
                            Total NET Flow Dalam {foreignData.summary.dayCount} Hari:{' '}
                            <span
                              className={foreignData.summary.totalNet >= 0
                                ? 'text-up'
                                : 'text-down'}
                            >
                              {Utils.Format.formatRp(foreignData.summary.totalNet)}
                            </span>
                          </p>
                        )}
                        {foreignData.data.length > 0
                          ? (
                            <div className='rounded-lg border border-border bg-surface-elevated p-4 h-64'>
                              <ResponsiveContainer width='100%' height='100%'>
                                <BarChart
                                  data={foreignData.data.map((row) => ({
                                    date: Utils.Format.formatDateInt(row.date),
                                    buy: row.buy ?? 0,
                                    sell: row.sell ?? 0,
                                    net: row.net ?? 0
                                  }))}
                                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                >
                                  <XAxis
                                    dataKey='date'
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                  />
                                  <YAxis
                                    orientation='right'
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(v) => Utils.Format.formatRp(v)}
                                  />
                                  <Tooltip
                                    content={({ active, payload, label }) => {
                                      if (!active || !payload?.length || !label) {
                                        return null
                                      }
                                      const row = payload[0]?.payload
                                      if (row == null) {
                                        return null
                                      }
                                      return (
                                        <div className='bg-surface-elevated border border-border rounded-lg p-3 shadow-lg text-sm'>
                                          <div className='font-semibold text-text mb-2'>
                                            {Utils.Format.formatTitleCase(String(label))}
                                          </div>
                                          <div className='text-text text-sm'>
                                            {Utils.Format.formatTitleCase('Beli')}:{' '}
                                            {Utils.Format.formatRp(row.buy)}
                                          </div>
                                          <div className='text-text text-sm'>
                                            {Utils.Format.formatTitleCase('Jual')}:{' '}
                                            {Utils.Format.formatRp(row.sell)}
                                          </div>
                                          <div className='text-text text-sm'>
                                            {Utils.Format.formatTitleCase('Net')}:{' '}
                                            <span
                                              className={
                                                (row.net ?? 0) >= 0 ? 'text-up' : 'text-down'
                                              }
                                            >
                                              {Utils.Format.formatRp(row.net)}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    }}
                                  />
                                  <Bar
                                    dataKey='net'
                                    radius={[4, 4, 0, 0]}
                                    isAnimationActive={false}
                                  >
                                    {foreignData.data.map((row) => (
                                      <Cell
                                        key={row.date}
                                        fill={(row.net ?? 0) >= 0
                                          ? 'var(--idx-up)'
                                          : 'var(--idx-down)'}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )
                          : <p className='text-text-muted text-sm'>Tidak ada data untuk periode ini.</p>}
                      </>
                    )}
                  </div>
                </>
              )}
              {activeTab === 'ai' && (
                <AiExplainView code={detail?.code ?? ''} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
