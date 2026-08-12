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
    <div className='idx-main idx-container'>
      <h1 className='idx-h1'>Journal Trading</h1>
      <p className='idx-muted'>Catat entry/exit, hitung P&L per trade, track performa harian.</p>

      {/* Stats */}
      <div className='idx-dashboard-stats idx-mb-24'>
        <div className='idx-stat'>
          <span className='idx-stat-label'>Total Trade</span>
          <span className='idx-stat-value'>{closed.length}</span>
        </div>
        <div className='idx-stat'>
          <span className='idx-stat-label'>Win Rate</span>
          <span className='idx-stat-value'>{winRate.toFixed(0)}%</span>
        </div>
        <div className='idx-stat'>
          <span className='idx-stat-label'>Total P&L</span>
          <span className={`idx-stat-value ${totalPnl >= 0 ? 'idx-pnl-positive' : 'idx-pnl-negative'}`}>
            {Utils.formatRp(totalPnl)}
          </span>
        </div>
      </div>

      {/* Add form */}
      <form className='idx-portfolio-form idx-mb-24' onSubmit={handleAdd}>
        <input className='idx-input' placeholder='Kode (BBRI)' value={code} onChange={(e) => setCode(e.target.value)} />
        <select className='idx-input' value={direction} onChange={(e) => setDirection(e.target.value as 'long' | 'short')}>
          <option value='long'>Long</option>
          <option value='short'>Short</option>
        </select>
        <input className='idx-input' type='number' step='any' placeholder='Entry Price' value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        <input className='idx-input' placeholder='Alasan (opsional)' value={reason} onChange={(e) => setReason(e.target.value)} />
        <input className='idx-input' placeholder='Catatan (opsional)' value={note} onChange={(e) => setNote(e.target.value)} />
        <button type='submit' className='idx-btn idx-btn-primary' disabled={submitting}>Catat Trade</button>
      </form>

      {/* Table */}
      {loading ? (
        <p className='idx-p-muted'>Memuat journal...</p>
      ) : entries.length === 0 ? (
        <p className='idx-p-muted'>Belum ada trade. Catat yang pertama di atas.</p>
      ) : (
        <div className='idx-table-wrap'>
          <table className='idx-table'>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kode</th>
                <th>Arah</th>
                <th className='idx-table-th-right'>Entry</th>
                <th className='idx-table-th-right'>Exit</th>
                <th className='idx-table-th-right'>P&L</th>
                <th>Alasan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const pnl = e.pnl
                return (
                  <tr key={e.id}>
                    <td>{e.date != null ? Utils.formatDateInt(e.date) : '-'}</td>
                    <td className='idx-table-code-bold'>{e.code}</td>
                    <td>{e.direction === 'long' ? '🟢 Long' : '🔴 Short'}</td>
                    <td className='idx-table-td-right'>{Utils.formatNum(e.entryPrice, 0)}</td>
                    <td className='idx-table-td-right'>{e.exitPrice != null ? Utils.formatNum(e.exitPrice, 0) : <CloseTradeInput id={e.id} onConfirm={handleClose} />}</td>
                    <td className={`idx-table-td-right ${pnl != null ? (pnl >= 0 ? 'idx-pnl-positive' : 'idx-pnl-negative') : ''}`}>
                      {pnl != null ? Utils.formatRp(pnl) : '-'}
                    </td>
                    <td className='idx-table-col-nama'>{e.reason ?? '-'}</td>
                    <td>
                      <button type='button' className='idx-btn-ghost' onClick={() => handleDelete(e.id)} aria-label='Hapus'>✕</button>
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
    <span className='idx-journal-close'>
      <input className='idx-input' type='number' step='any' placeholder='Exit' value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 90, padding: '2px 6px', fontSize: 12 }} />
      <button type='button' className='idx-btn-ghost' onClick={() => { const p = parseFloat(val); if (Number.isFinite(p)) onConfirm(id, p) }} style={{ fontSize: 11 }}>✓</button>
    </span>
  )
}
