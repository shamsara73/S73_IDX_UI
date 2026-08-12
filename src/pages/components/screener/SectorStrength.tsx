/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Sector strength — compact horizontal bar (no pie chart).
 */

import React from 'react'
import { Layers } from 'lucide-react'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

export const sectorPalette = [
  '#6b9bc4', '#8b7aa8', '#a87a8b', '#7a9b7a', '#6b9b8b', '#6b8b9b',
  '#9b8b6b', '#8b6b9b', '#9b9b6b', '#6b8b8b', '#8b9b7a', '#9b6b8b',
  '#6b7a9b', '#7a9b6b', '#9b6b7a', '#7a8b9b', '#9b8b7a', '#8b7a9b',
  '#9b9b7a', '#6b9b7a', '#7a9b8b', '#9b7a8b', '#8b9b6b', '#8b6b7a',
  '#7a9b9b', '#9b8b8b', '#8b9b8b', '#7a7a9b', '#6b9b9b', '#9b9b8b'
]

export default function SectorStrength({
  data,
  loading,
  week,
  onWeekChange
}: Types.SectorStrengthProps) {
  const filtered = data?.filter((s) => s.count > 0) ?? []

  return (
    <div className='rounded-lg border border-border bg-surface px-4 py-2.5'>
      <div className='flex items-center gap-4 flex-wrap'>
        {/* Label + period toggle */}
        <div className='flex items-center gap-2'>
          <Layers size={14} className='text-accent' />
          <span className='text-xs font-semibold text-text-muted'>SEKTOR</span>
          <div className='flex gap-0.5 rounded bg-surface-elevated p-0.5'>
            {[26, 52].map((w) => (
              <button
                key={w}
                type='button'
                onClick={() => onWeekChange(w)}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                  week === w ? 'bg-accent text-background' : 'text-text-dim hover:text-text'
                }`}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>

        {/* Sector chips */}
        {loading && <span className='text-xs text-text-dim'>Memuat...</span>}
        {!loading && filtered.length === 0 && (
          <span className='text-xs text-text-dim'>Tidak ada data</span>
        )}
        {!loading && filtered.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {filtered.slice(0, 10).map((s) => {
              const up = s.avgMomentum >= 0
              return (
                <span
                  key={s.sector}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    up ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
                  }`}
                  title={`${s.sector}: ${Utils.Format.formatPct(s.avgMomentum)} (${s.count} emiten)`}
                >
                  <span className='max-w-[120px] truncate'>{s.sector}</span>
                  <span>{Utils.Format.formatPct(s.avgMomentum)}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
