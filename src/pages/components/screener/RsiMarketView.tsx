/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React, { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sectorPalette } from '@app/pages/components/screener/SectorStrength.tsx'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

function sectorAvgRsi(items: Types.ScreenerRsiItem[]): number | null {
  const valid = items.filter((x) => x.rsi != null && Number.isFinite(x.rsi)) as { rsi: number }[]
  if (valid.length === 0) {
    return null
  }
  const sum = valid.reduce((a, x) => a + x.rsi, 0)
  return sum / valid.length
}

export default function RsiMarketView({
  data,
  loading,
  error,
  onRefetch
}: Types.RsiMarketViewProps) {
  const chartData = useMemo(() => {
    if (!data?.data?.bySector) {
      return []
    }
    const entries = Object.entries(data.data.bySector)
      .filter(([, items]) => items.length > 0)
      .map(([sector, items]) => {
        const avg = sectorAvgRsi(items)
        const withRsi = items.filter((x) => x.rsi != null).length
        return {
          sector: sector || '(Tanpa sektor)',
          count: items.length,
          withRsi,
          avg: avg ?? 0,
          avgLabel: avg != null ? Utils.Format.formatNum(avg, 1) : '-'
        }
      })
    return entries.sort((a, b) => b.avg - a.avg)
  }, [data])

  if (loading) {
    return (
      <div className='rounded-lg border border-border bg-surface p-6 text-center'>
        <p className='text-text-muted m-0'>Memuat RSI market...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className='text-down mt-4 p-4 bg-down-bg rounded-md text-sm font-semibold'>
        {error}
        <button type='button' className='inline-flex items-center justify-center gap-2 text-sm font-bold py-2.5 px-5 rounded-lg border border-border bg-surface text-text cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:border-accent hover:text-accent mt-2' onClick={onRefetch}>
          Coba lagi
        </button>
      </div>
    )
  }
  if (!data) {
    return null
  }

  return (
    <div className='rounded-lg border border-border bg-surface px-6 py-4'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-extrabold text-text flex items-center gap-2'>
          <Activity size={20} aria-hidden />
          <span>Relative Strength (Per Sektor)</span>
        </h3>
      </div>
      {chartData.length === 0
        ? <p className='text-text-muted m-0'>Tidak ada data RSI.</p>
        : (
          <div className='min-w-0 w-full min-h-80 overflow-visible'>
            <ResponsiveContainer width='100%' height={Math.max(360, chartData.length * 36)}>
              <BarChart
                data={chartData}
                layout='vertical'
                margin={{ top: 12, right: 16, bottom: 24, left: 4 }}
                barCategoryGap={8}
                barGap={2}
              >
                <XAxis
                  type='number'
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <YAxis
                  type='category'
                  dataKey='sector'
                  width={180}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => (val.length > 18 ? `${val.slice(0, 16)}…` : val)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null
                    }
                    const p = payload[0]?.payload
                    if (!p) {
                      return null
                    }
                    return (
                      <div className='bg-surface-elevated text-text p-2 px-3 rounded-md text-sm shadow-lg'>
                        <div className='font-extrabold mb-1'>
                          {Utils.Format.formatTitleCase(p.sector)}
                        </div>
                        <div>
                          {Utils.Format.formatTitleCase('RSI (rata)')}: {p.avgLabel}
                        </div>
                        <div>
                          {Utils.Format.formatTitleCase('Emiten')}: {p.withRsi}/{p.count}
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey='avg' fill='var(--color-text-muted)' isAnimationActive={false}>
                  {chartData.map((row, index) => (
                    <Cell
                      key={row.sector}
                      fill={sectorPalette[index % sectorPalette.length] ?? '#999'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
    </div>
  )
}
