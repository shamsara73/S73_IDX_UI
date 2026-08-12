/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React, { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

export const sectorPalette = [
  '#6b9bc4',
  '#8b7aa8',
  '#a87a8b',
  '#7a9b7a',
  '#6b9b8b',
  '#6b8b9b',
  '#9b8b6b',
  '#8b6b9b',
  '#9b9b6b',
  '#6b8b8b',
  '#8b9b7a',
  '#9b6b8b',
  '#6b7a9b',
  '#7a9b6b',
  '#9b6b7a',
  '#7a8b9b',
  '#9b8b7a',
  '#8b7a9b',
  '#9b9b7a',
  '#6b9b7a',
  '#7a9b8b',
  '#9b7a8b',
  '#8b9b6b',
  '#8b6b7a',
  '#7a9b9b',
  '#9b8b8b',
  '#8b9b8b',
  '#7a7a9b',
  '#6b9b9b',
  '#9b9b8b'
]

export default function SectorStrength({
  data,
  loading,
  week,
  onWeekChange
}: Types.SectorStrengthProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    return data
      .filter((sectorRow) => sectorRow.count > 0)
      .map((sectorRow, index) => ({
        sector: sectorRow.sector,
        count: sectorRow.count,
        avgMomentum: sectorRow.avgMomentum,
        fill: sectorPalette[index % sectorPalette.length]
      }))
  }, [data])

  return (
    <div className='rounded-lg border border-border bg-surface p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-extrabold text-text flex items-center gap-2'>
          <Layers size={20} aria-hidden />
          <span>Kekuatan Sektor</span>
        </h3>
        <div className='flex gap-1 bg-surface-elevated p-1 rounded-lg'>
          <button
            type='button'
            className={`text-sm font-bold py-2 px-4 rounded-md border-none bg-transparent text-text-muted cursor-pointer transition-all duration-200 hover:text-text ${week === 26 ? 'bg-accent text-background' : ''}`}
            onClick={() => onWeekChange(26)}
          >
            26w
          </button>
          <button
            type='button'
            className={`text-sm font-bold py-2 px-4 rounded-md border-none bg-transparent text-text-muted cursor-pointer transition-all duration-200 hover:text-text ${week === 52 ? 'bg-accent text-background' : ''}`}
            onClick={() => onWeekChange(52)}
          >
            52w
          </button>
        </div>
      </div>
      {loading && <div className='text-center py-12 px-6 text-text-muted text-sm font-semibold'>Memuat...</div>}
      {!loading && data && data.length === 0 && (
        <p className='text-text-muted m-0 py-4'>Tidak ada data sektor.</p>
      )}
      {!loading && data && data.length > 0 && (
        <>
          <div className='min-w-0 w-full mb-4'>
            <ResponsiveContainer width='100%' height={260}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={chartData}
                  dataKey='count'
                  nameKey='sector'
                  cx='50%'
                  cy='50%'
                  innerRadius='50%'
                  outerRadius='80%'
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {chartData.map((pieSegment) => (
                    <Cell key={pieSegment.sector} fill={pieSegment.fill ?? '#999'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    cellValue: unknown,
                    _name: unknown,
                    tooltipItem: { payload?: Types.SectorStrengthTooltipPayload }
                  ) => {
                    const payload = tooltipItem?.payload
                    const count = typeof cellValue === 'number' ? cellValue : 0
                    const sector = payload?.sector ?? ''
                    const avgMomentum = payload?.avgMomentum ?? 0
                    return [
                      `${Utils.Format.formatTitleCase(sector)}: ${
                        Utils.Format.formatPct(
                          avgMomentum
                        )
                      } (${count} ${Utils.Format.formatTitleCase('emiten')})`,
                      ''
                    ]
                  }}
                  contentStyle={{
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text)',
                    borderRadius: 12,
                    fontSize: 11
                  }}
                />
                <Legend
                  layout='vertical'
                  align='right'
                  verticalAlign='middle'
                  formatter={(legendLabel) => legendLabel}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className='list-none m-0 p-0'>
            {data
              .filter((sectorRow) => sectorRow.count > 0)
              .map((sectorRow) => {
                const isUp = sectorRow.avgMomentum >= 0
                const isDown = sectorRow.avgMomentum < 0
                const rowClassName = isUp
                  ? 'bg-up-bg text-up'
                  : isDown
                  ? 'bg-down-bg text-down'
                  : 'bg-surface-elevated text-text-muted'
                return (
                  <li key={sectorRow.sector} className={`flex items-center justify-between py-3 px-4 rounded-md mb-1.5 text-sm font-semibold ${rowClassName}`}>
                    <span>{sectorRow.sector}</span>
                    <span className='font-extrabold'>
                      {Utils.Format.formatPct(sectorRow.avgMomentum)}
                    </span>
                  </li>
                )
              })}
          </ul>
        </>
      )}
    </div>
  )
}
