/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Candidates table — Tailwind + electric green.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

const dataColumnCount = 14

function TrendArrow({ trend }: { trend: -1 | 0 | 1 | null | undefined }) {
  if (trend == null || trend === 0) return null
  return (
    <span className={`ml-1 text-[10px] ${trend === 1 ? 'text-up' : 'text-down'}`} aria-hidden>
      {trend === 1 ? '▲' : '▼'}
    </span>
  )
}

function SortHeader({ label, sortKey, sortBy, sortDir, onSortChange }: {
  label: string; sortKey: string; sortBy?: string | undefined; sortDir?: 'asc' | 'desc' | undefined; onSortChange?: ((sortBy: string, sortDir: 'asc' | 'desc') => void) | undefined
}) {
  if (onSortChange == null) return <th className='pb-2 pr-3 text-right text-[11px] font-medium text-text-muted'>{label}</th>
  const active = sortBy === sortKey
  const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc'
  return (
    <th className='pb-2 pr-3 text-right text-[11px] font-medium'>
      <button type='button' onClick={() => onSortChange(sortKey, nextDir)}
        className={`inline-flex items-center gap-0.5 transition ${active ? 'text-accent' : 'text-text-muted hover:text-text'}`}>
        {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  )
}

export default function CandidatesTable({
  data, limit, offset, totalCount, totalCountLabel, onPage, onRowClick,
  searchValue, onSearchChange, loading, error, emptyMessage, hasWatchlist,
  watchlistCodes, onWatchlistToggle, sortBy, sortDir, onSortChange
}: Types.CandidatesTableProps) {
  const hasWL = watchlistCodes != null && onWatchlistToggle != null
  const columnCount = hasWL ? dataColumnCount + 1 : dataColumnCount
  const [searchLocal, setSearchLocal] = useState(searchValue ?? '')
  useEffect(() => { setSearchLocal(searchValue ?? '') }, [searchValue])

  const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 1
  const currentPage = limit > 0 ? Math.floor(offset / limit) + 1 : 1
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1
  const fromRow = totalCount > 0 ? offset + 1 : 0
  const toRow = Math.min(offset + limit, totalCount)

  const handleStarClick = useCallback((code: string, row: Types.CandidateTableRow, e: React.MouseEvent) => {
    e.stopPropagation()
    onWatchlistToggle?.(code, row)
  }, [onWatchlistToggle])

  const handleStarKeyDown = useCallback((code: string, row: Types.CandidateTableRow, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWatchlistToggle?.(code, row) }
  }, [onWatchlistToggle])

  const handleRowKeyDown = useCallback((code: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onRowClick(code)
  }, [onRowClick])

  const showErrorRow = !loading && error != null
  const showLoadingRow = loading
  const showEmptyRow = !loading && error == null && data.length === 0

  return (
    <div className='rounded-lg border border-border bg-surface'>
      {/* Search */}
      {onSearchChange != null && (
        <div className='flex items-center gap-2 border-b border-border-subtle px-4 py-2'>
          <Search size={14} className='text-text-dim' />
          <input
            type='text'
            value={searchLocal}
            onChange={(e) => { setSearchLocal(e.target.value); onSearchChange(e.target.value) }}
            placeholder='Cari kode atau nama...'
            className='flex-1 bg-transparent text-sm text-text placeholder:text-text-dim focus:outline-none'
          />
        </div>
      )}

      {/* Table */}
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border text-left text-[11px] text-text-muted'>
              {hasWL && (
                <th className='w-8 pb-2 pl-3 pr-1 font-medium'><Star size={12} /></th>
              )}
              <th className='pb-2 pl-3 pr-3 font-medium'>Kode</th>
              <th className='pb-2 pr-3 font-medium'>Nama</th>
              <th className='pb-2 pr-3 font-medium'>Sektor</th>
              <SortHeader label='PER' sortKey='per' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='ROE' sortKey='roe' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='DER' sortKey='der' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='Yield%' sortKey='divYield' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='Yrs' sortKey='divYears' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='26w' sortKey='week26PC' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='52w' sortKey='week52PC' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='Comp' sortKey='compositeScore' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='V' sortKey='valueScore' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='Q' sortKey='qualityScore' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
              <SortHeader label='M' sortKey='momentumScore' sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
            </tr>
          </thead>
          <tbody>
            {showErrorRow && (
              <tr><td colSpan={columnCount} className='py-8 text-center text-down'>{error}</td></tr>
            )}
            {showLoadingRow && (
              <tr><td colSpan={columnCount} className='py-8 text-center text-text-muted'>Memuat kandidat...</td></tr>
            )}
            {showEmptyRow && (
              <tr><td colSpan={columnCount} className='py-8 text-center text-text-dim'>{emptyMessage ?? 'Tidak ada data'}</td></tr>
            )}
            {!showErrorRow && !showLoadingRow && !showEmptyRow && data.map((r, i) => (
              <tr
                key={r.code}
                tabIndex={0}
                role='button'
                onClick={() => onRowClick(r.code)}
                onKeyDown={(e) => handleRowKeyDown(r.code, e)}
                className={`cursor-pointer border-b border-border-subtle transition hover:bg-accent/5 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated/30'}`}
              >
                {hasWL && (
                  <td className='w-8 pl-3 pr-1 py-2'>
                    <button type='button' onClick={(e) => handleStarClick(r.code, r, e)}
                      onKeyDown={(e) => handleStarKeyDown(r.code, r, e)}
                      className={`transition ${watchlistCodes!.includes(r.code) ? 'text-accent' : 'text-text-dim hover:text-accent'}`}
                      aria-label={watchlistCodes!.includes(r.code) ? 'Hapus dari watchlist' : 'Tambah ke watchlist'}>
                      <Star size={13} fill={watchlistCodes!.includes(r.code) ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                )}
                <td className='pl-3 pr-3 py-2 font-semibold tabular-nums'>{r.code}</td>
                <td className='pr-3 py-2 max-w-[160px] truncate text-text-muted'>{r.name ?? '—'}</td>
                <td className='pr-3 py-2 max-w-[120px] truncate text-text-dim'>{r.sector ?? '—'}</td>
                <td className='pr-3 py-2 text-right tabular-nums'>
                  {Utils.Format.formatNum(r.per, 1)}<TrendArrow trend={r.perTrend} />
                </td>
                <td className='pr-3 py-2 text-right tabular-nums'>
                  {Utils.Format.formatNum(r.roe, 1)}<TrendArrow trend={r.roeTrend} />
                </td>
                <td className='pr-3 py-2 text-right tabular-nums'>{Utils.Format.formatNum(r.der, 1)}</td>
                <td className='pr-3 py-2 text-right tabular-nums text-accent'>
                  {r.divYield != null ? `${(r.divYield * 100).toFixed(1)}` : '—'}
                </td>
                <td className='pr-3 py-2 text-right tabular-nums'>{r.divYears ?? '—'}</td>
                <td className='pr-3 py-2 text-right tabular-nums'>
                  <span className={r.week26PC != null ? (r.week26PC >= 0 ? 'text-up' : 'text-down') : ''}>
                    {Utils.Format.formatPct(r.week26PC ?? null)}
                  </span>
                </td>
                <td className='pr-3 py-2 text-right tabular-nums'>
                  <span className={r.week52PC != null ? (r.week52PC >= 0 ? 'text-up' : 'text-down') : ''}>
                    {Utils.Format.formatPct(r.week52PC ?? null)}
                  </span>
                </td>
                <td className='pr-3 py-2 text-right font-semibold tabular-nums text-accent'>
                  {r.compositePercentile != null ? (r.compositePercentile * 100).toFixed(0) : '—'}
                </td>
                <td className='pr-3 py-2 text-right tabular-nums text-text-muted'>
                  {r.valueScore != null ? (r.valueScore * 100).toFixed(0) : '—'}
                </td>
                <td className='pr-3 py-2 text-right tabular-nums text-text-muted'>
                  {r.qualityScore != null ? (r.qualityScore * 100).toFixed(0) : '—'}
                </td>
                <td className='pr-3 py-2 text-right tabular-nums text-text-muted'>
                  {r.momentumScore != null ? (r.momentumScore * 100).toFixed(0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className='flex items-center justify-between border-t border-border-subtle px-4 py-2.5 text-xs text-text-muted'>
          <span>{totalCountLabel ?? ''} {fromRow}–{toRow} dari {totalCount.toLocaleString('id-ID')}</span>
          <div className='flex items-center gap-1'>
            <button type='button' onClick={() => onPage(Math.max(0, offset - limit))} disabled={!hasPrev}
              className='flex h-7 items-center gap-1 rounded px-2 transition hover:bg-surface-elevated disabled:opacity-30'>
              <ChevronLeft size={14} /> Prev
            </button>
            <span className='px-2 tabular-nums'>{currentPage}/{totalPages}</span>
            <button type='button' onClick={() => onPage(offset + limit)} disabled={!hasNext}
              className='flex h-7 items-center gap-1 rounded px-2 transition hover:bg-surface-elevated disabled:opacity-30'>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
