/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

export default function DashboardHeader({
  totalCount,
  date,
  onRefresh,
  loading
}: Types.DashboardHeaderProps) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-4 mb-6'>
      <div>
        <h1 className='flex items-center gap-2.5 text-[1.375rem] font-extrabold text-text tracking-tight m-0'>
          <BarChart3 size={28} strokeWidth={2} aria-hidden />
          <span>Screener Saham</span>
        </h1>
        <p className='text-sm text-text-muted mt-1'>
          Filter Berdasarkan Skor Gabungan: <strong>Valuasi, Kualitas, dan Momentum</strong>
        </p>
      </div>
      <div className='flex items-center gap-0 bg-surface border border-border rounded-lg p-3 px-2 pl-5 shadow-sm'>
        <div className='flex flex-col gap-1 min-w-0'>
          <span className='text-[10px] font-extrabold uppercase tracking-widest text-text-muted leading-tight'>Data Kandidat</span>
          <span className='text-lg font-extrabold text-text leading-tight tracking-tight'>{totalCount.toLocaleString('id-ID')}</span>
        </div>
        <div className='w-px h-7 bg-border mx-5 shrink-0' aria-hidden='true' />
        <div className='flex flex-col gap-1 min-w-0'>
          <span className='text-[10px] font-extrabold uppercase tracking-widest text-text-muted leading-tight'>Tanggal Data</span>
          <span className='text-lg font-extrabold text-text leading-tight tracking-tight'>
            {date ? Utils.Format.formatDateInt(date) : '-'}
          </span>
        </div>
        <button
          type='button'
          className={`inline-flex items-center justify-center gap-2 text-sm font-bold py-2.5 px-5 rounded-lg border border-border bg-surface text-text cursor-pointer transition-all duration-200 hover:bg-surface-elevated hover:border-accent hover:text-accent ml-5 p-2.5 ${loading ? '[&_svg]:opacity-50' : ''}`}
          onClick={onRefresh}
          disabled={loading}
          title='Muat Ulang Data'
          aria-label='Muat Ulang Data'
        >
          <RefreshCw size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}
