/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Format as Utils } from '@app/pages/utils/index.ts'
import * as Hooks from '@app/pages/hooks/index.ts'

interface JournalEntry {
  id: number
  code: string
  direction: string
  entryPrice: number
  exitPrice: number | null
  entryTime: string | null
  exitTime: string | null
  reason: string | null
  pnl: number | null
  note: string | null
  date: number | null
}

const todayDateInt = (): number => {
  const n = new Date()
  return n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate()
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res: { data: JournalEntry[] } = await Hooks.fetchApi('/api/journal')
      setEntries(res.data ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Stats
  const closed = entries.filter((e) => e.pnl != null)
  const wins = closed.filter((e) => (e.pnl ?? 0) > 0).length
  const totalPnl = closed.reduce((s, e) => s + (e.pnl ?? 0), 0)
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0

  // Form
  const [code, setCode] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(entryPrice)
    if (code.trim() === '' || !Number.isFinite(price) || price <= 0) {
      return
    }
    setSubmitting(true)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          direction,
          entryPrice: price,
          reason: reason.trim() || null,
          note: note.trim() || null,
          date: todayDateInt()
        })
      })
      setCode('')
      setEntryPrice('')
      setReason('')
      setNote('')
      fetchEntries()
    } finally {
      setSubmitting(false)
    }
  }, [code, direction, entryPrice, reason, note, fetchEntries])

  const handleClose = useCallback(async (id: number, exitPrice: number) => {
    const entry = entries.find((e) => e.id === id)
    if (entry == null) return
    const multiplier = entry.direction === 'long' ? 1 : -1
    const pnl = (exitPrice - entry.entryPrice) * multiplier
    await fetch('/api/journal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, exitPrice, pnl: Math.round(pnl * 100) / 100 })
    })
    fetchEntries()
  }, [entries, fetchEntries])

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`/api/journal?id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }, [fetchEntries])

  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold'>Journal Trading</h1>
      <p className='text-text-muted'>Catat entry/exit, hitung P&L per trade, track performa harian.</p>

      {/* Stats */}
      <div className='grid grid-cols-3 gap-4 mb-6 mt-6'>
        <div className='flex flex-col gap-1 rounded-lg border border-border bg-surface p-4'>
          <span className='text-text-muted text-sm'>Total Trade</span>
          <span className='text-xl font-bold text-accent'>{closed.length}</span>
        </div>
        <div className='flex flex-col gap-1 rounded-lg border border-border bg-surface p-4'>
          <span className='text-text-muted text-sm'>Win Rate</span>
          <span className='text-xl font-bold text-accent'>{winRate.toFixed(0)}%</span>
        </div>
        <div className='flex flex-col gap-1 rounded-lg border border-border bg-surface p-4'>
          <span className='text-text-muted text-sm'>Total P&L</span>
          <span className={`text-xl font-bold ${totalPnl >= 0 ? 'text-up' : 'text-down'}`}>
            {Utils.formatRp(totalPnl)}
          </span>
        </div>
      </div>

      {/* Add form */}
      <form className='flex flex-wrap items-center gap-2 mb-6' onSubmit={handleAdd}>
        <input className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text' placeholder='Kode (BBRI)' value={code} onChange={(e) => setCode(e.target.value)} />
        <select className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text' value={direction} onChange={(e) => setDirection(e.target.value as 'long' | 'short')}>
          <option value='long'>Long</option>
          <option value='short'>Short</option>
        </select>
        <input className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text' type='number' step='any' placeholder='Entry Price' value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        <input className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text' placeholder='Alasan (opsional)' value={reason} onChange={(e) => setReason(e.target.value)} />
        <input className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text' placeholder='Catatan (opsional)' value={note} onChange={(e) => setNote(e.target.value)} />
        <button type='submit' className='bg-accent text-background px-4 py-1.5 rounded-md font-medium' disabled={submitting}>Catat Trade</button>
      </form>

      {/* Table */}
      {loading ? (
        <p className='text-text-muted'>Memuat journal...</p>
      ) : entries.length === 0 ? (
        <p className='text-text-muted'>Belum ada trade. Catat yang pertama di atas.</p>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-border'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-surface'>
                <th className='px-3 py-2 text-left text-text-muted font-medium'>Tanggal</th>
                <th className='px-3 py-2 text-left text-text-muted font-medium'>Kode</th>
                <th className='px-3 py-2 text-left text-text-muted font-medium'>Arah</th>
                <th className='px-3 py-2 text-right text-text-muted font-medium'>Entry</th>
                <th className='px-3 py-2 text-right text-text-muted font-medium'>Exit</th>
                <th className='px-3 py-2 text-right text-text-muted font-medium'>P&L</th>
                <th className='px-3 py-2 text-left text-text-muted font-medium'>Alasan</th>
                <th className='px-3 py-2 text-left text-text-muted font-medium'></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const pnl = e.pnl
                return (
                  <tr key={e.id} className='border-b border-border hover:bg-surface/50'>
                    <td className='px-3 py-2'>{e.date != null ? Utils.formatDateInt(e.date) : '-'}</td>
                    <td className='px-3 py-2 font-bold'>{e.code}</td>
                    <td className='px-3 py-2'>{e.direction === 'long' ? '🟢 Long' : '🔴 Short'}</td>
                    <td className='px-3 py-2 text-right'>{Utils.formatNum(e.entryPrice, 0)}</td>
                    <td className='px-3 py-2 text-right'>{e.exitPrice != null ? Utils.formatNum(e.exitPrice, 0) : <CloseTradeInput id={e.id} onConfirm={handleClose} />}</td>
                    <td className={`px-3 py-2 text-right ${pnl != null ? (pnl >= 0 ? 'text-up' : 'text-down') : ''}`}>
                      {pnl != null ? Utils.formatRp(pnl) : '-'}
                    </td>
                    <td className='px-3 py-2'>{e.reason ?? '-'}</td>
                    <td className='px-3 py-2'>
                      <button type='button' className='text-text-muted hover:text-down' onClick={() => handleDelete(e.id)} aria-label='Hapus'>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CloseTradeInput({ id, onConfirm }: { id: number; onConfirm: (id: number, price: number) => void }) {
  const [val, setVal] = useState('')
  return (
    <span className='inline-flex items-center gap-1'>
      <input className='h-7 rounded border border-border bg-surface px-2 text-xs text-text' type='number' step='any' placeholder='Exit' value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 90 }} />
      <button type='button' className='text-text-muted hover:text-down text-xs' onClick={() => { const p = parseFloat(val); if (Number.isFinite(p)) onConfirm(id, p) }}>✓</button>
    </span>
  )
}
