/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

const presets = [
  { days: 7, label: '1W' },
  { days: 14, label: '2W' },
  { days: 30, label: '1M' },
  { days: 90, label: '3M' },
  { days: 180, label: '6M' },
  { days: 365, label: '12M' }
]

export default function Historical() {
  const [periodDays, setPeriodDays] = useState(30)
  const todayInt = useMemo(() => Utils.Format.getTodayDateInt(), [])
  const end = todayInt
  const start = Utils.Format.addDaysToDateInt(end, -periodDays + 1)
  const { data, loading, error } = Hooks.useBidOfferHistory(start, end)
  const sectorRows: Types.HistoryBidOfferSectorItem[] = useMemo(() => data?.bySector ?? [], [data])

  return (
    <div className='mx-auto max-w-7xl px-4 py-6'>
      <div className='rounded-lg border border-border bg-surface p-6'>
        {/* Header */}
        <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='flex items-center gap-2 text-xl font-bold'>
              <History size={22} className='text-accent' />
              Bid vs Offer Historis
            </h2>
            <p className='mt-1 text-sm text-text-muted'>
              Periode: {Utils.Format.formatDateInt(start)} – {Utils.Format.formatDateInt(end)}
            </p>
          </div>
          <div className='flex gap-1'>
            {presets.map((p) => (
              <button
                key={p.days}
                type='button'
                onClick={() => setPeriodDays(p.days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  periodDays === p.days
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:bg-surface-elevated hover:text-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading && <p className='py-8 text-center text-text-muted'>Memuat data...</p>}
        {error != null && <p className='py-8 text-center text-down'>{error}</p>}
        {!loading && !error && sectorRows.length === 0 && (
          <p className='py-8 text-center text-text-dim'>Tidak ada data untuk periode ini.</p>
        )}

        {/* Table */}
        {!loading && !error && sectorRows.length > 0 && (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border text-left text-xs text-text-muted'>
                  <th className='pb-2 pr-4 font-medium'>Sektor</th>
                  <th className='pb-2 pr-4 text-right font-medium'>Total Bid</th>
                  <th className='pb-2 pr-4 text-right font-medium'>Total Offer</th>
                  <th className='pb-2 pr-4 text-right font-medium'>Hari</th>
                  <th className='pb-2 pr-4 text-right font-medium'>Avg Bid/Hari</th>
                  <th className='pb-2 pr-4 text-right font-medium'>Avg Offer/Hari</th>
                  <th className='pb-2 font-medium'>Bid/Offer</th>
                </tr>
              </thead>
              <tbody>
                {sectorRows.map((r) => {
                  const total = r.totalBid + r.totalOffer
                  const bidPct = total > 0 ? (r.totalBid / total) * 100 : 50
                  const offerPct = total > 0 ? (r.totalOffer / total) * 100 : 50
                  return (
                    <tr key={r.sector} className='border-b border-border-subtle hover:bg-surface-elevated/50'>
                      <td className='py-2.5 pr-4 font-medium'>{r.sector}</td>
                      <td className='py-2.5 pr-4 text-right tabular-nums text-up'>{Utils.Format.formatNum(r.totalBid, 0)}</td>
                      <td className='py-2.5 pr-4 text-right tabular-nums text-down'>{Utils.Format.formatNum(r.totalOffer, 0)}</td>
                      <td className='py-2.5 pr-4 text-right tabular-nums'>{r.dayCount}</td>
                      <td className='py-2.5 pr-4 text-right tabular-nums'>{Utils.Format.formatNum(r.avgBid, 0)}</td>
                      <td className='py-2.5 pr-4 text-right tabular-nums'>{Utils.Format.formatNum(r.avgOffer, 0)}</td>
                      <td className='py-2.5'>
                        {total > 0 ? (
                          <div className='flex items-center gap-2'>
                            <div className='h-2 flex-1 overflow-hidden rounded-full bg-down/20'>
                              <div className='flex h-full'>
                                <div className='bg-up' style={{ width: `${bidPct}%` }} />
                                <div className='bg-down' style={{ width: `${offerPct}%` }} />
                              </div>
                            </div>
                            <span className='w-10 text-right text-xs tabular-nums text-text-muted'>
                              {r.ratio != null ? Utils.Format.formatNum(r.ratio, 2) : '—'}
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
