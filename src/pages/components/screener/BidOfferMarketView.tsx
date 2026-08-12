/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React, { useMemo } from 'react'
import { BarChart2 } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

export default function BidOfferMarketView({
  data,
  loading,
  error,
  onRefetch
}: Types.BidOfferMarketViewProps) {
  const chartData = useMemo(() => {
    if (!data?.data?.length) {
      return []
    }
    return [...data.data].sort(
      (a, b) => b.bidVolume + b.offerVolume - (a.bidVolume + a.offerVolume)
    )
  }, [data])

  if (loading) {
    return (
      <div className='rounded-lg border border-border bg-surface p-6 text-center'>
        <p className='text-text-muted m-0'>Memuat bid/offer market...</p>
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
          <BarChart2 size={20} aria-hidden />
          <span>Bid vs Offer (Per Sektor)</span>
        </h3>
      </div>
      {chartData.length === 0
        ? <p className='text-text-muted m-0'>Tidak ada data bid/offer.</p>
        : (
          <div className='min-w-0 w-full min-h-80 overflow-visible'>
            <ResponsiveContainer width='100%' height={Math.max(360, chartData.length * 36)}>
              <BarChart
                data={chartData}
                layout='vertical'
                margin={{ top: 12, right: 16, bottom: 24, left: 4 }}
                barCategoryGap={8}
                barGap={4}
              >
                <XAxis
                  type='number'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => Utils.Format.formatNum(v, 0)}
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
                    const p = payload[0]?.payload as Types.ScreenerBidOfferItem | undefined
                    if (!p) {
                      return null
                    }
                    return (
                      <div className='bg-surface-elevated text-text p-2 px-3 rounded-md text-sm shadow-lg'>
                        <div className='font-extrabold mb-1'>
                          {Utils.Format.formatTitleCase(p.sector)}
                        </div>
                        <div>
                          {Utils.Format.formatTitleCase('Bid')}:{' '}
                          {Utils.Format.formatNum(p.bidVolume, 0)}
                        </div>
                        <div>
                          {Utils.Format.formatTitleCase('Offer')}:{' '}
                          {Utils.Format.formatNum(p.offerVolume, 0)}
                        </div>
                        <div>
                          {Utils.Format.formatTitleCase('Emiten')}: {p.count}
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey='bidVolume' name='Bid' fill='#047857' isAnimationActive={false} />
                <Bar
                  dataKey='offerVolume'
                  name='Offer'
                  fill='var(--color-down)'
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
    </div>
  )
}
