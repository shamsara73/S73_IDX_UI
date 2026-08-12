/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useState } from 'react'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Types from '@app/pages/Types.ts'
import { Format as Utils } from '@app/pages/utils/index.ts'

interface FormState {
  code: string
  shares: string
  avgCost: string
  note: string
}

const EMPTY_FORM: FormState = { code: '', shares: '', avgCost: '', note: '' }

function AllocationBars({ rows }: { rows: Types.PortfolioRow[] }) {
  const bySector = new Map<string, number>()
  for (const r of rows) {
    const sector = r.sector ?? 'Lainnya'
    bySector.set(sector, (bySector.get(sector) ?? 0) + (r.marketValue ?? 0))
  }
  const total = [...bySector.values()].reduce((a, b) => a + b, 0)
  if (total <= 0) {
    return null
  }
  const entries = [...bySector.entries()].sort((a, b) => b[1] - a[1])
  return (
    <div className='space-y-2'>
      {entries.map(([sector, value]) => {
        const pct = (value / total) * 100
        return (
          <div key={sector} className='flex items-center gap-3'>
            <span className='text-sm text-text-muted w-24 shrink-0'>{sector}</span>
            <div className='flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden'>
              <div className='h-full bg-accent rounded-full' style={{ width: `${pct}%` }} />
            </div>
            <span className='text-sm text-text w-12 text-right'>{pct.toFixed(1)}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Portfolio() {
  const [rows, setRows] = useState<Types.PortfolioRow[]>([])
  const [summary, setSummary] = useState<Types.PortfolioSummary | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await Hooks.fetchApi<Types.PortfolioResponse>('/api/portfolio')
      setRows(res.data ?? [])
      setSummary(res.summary ?? null)
      setError(null)
    } catch {
      setError('Gagal memuat portofolio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  const handleSubmit = useCallback(async () => {
    const code = form.code.trim().toUpperCase()
    const shares = Number(form.shares)
    const avgCost = Number(form.avgCost)
    if (code === '' || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avgCost) || avgCost <= 0) {
      setError('Kode, lembar, dan harga beli wajib diisi (angka positif)')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, shares: Math.round(shares), avgCost, note: form.note.trim() || null })
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Gagal menyimpan posisi')
      }
      setForm(EMPTY_FORM)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan posisi')
    } finally {
      setBusy(false)
    }
  }, [form, refresh])

  const handleDelete = useCallback(
    async (code: string) => {
      setBusy(true)
      try {
        await fetch(`/api/portfolio?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
        await refresh()
      } catch {
        setError('Gagal menghapus posisi')
      } finally {
        setBusy(false)
      }
    },
    [refresh]
  )

  const pnlClass = (value: number | null) => {
    if (value == null) {
      return ''
    }
    return value >= 0 ? 'text-up' : 'text-down'
  }

  return (
    <div className='p-6 bg-background min-h-screen'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-2xl font-bold text-text'>Portofolio</h1>
        <p className='text-text-muted mt-1 mb-6'>
          Lacak posisi, biaya perolehan, P&amp;L real-time (harga penutupan terakhir), alokasi sektor,
          dan akumulasi dividen 12 bulan terakhir.
        </p>

        {error && <p className='text-down text-sm mb-4'>{error}</p>}

        <div className='rounded-lg border border-border bg-surface p-4 mb-6'>
          <div className='flex flex-wrap items-center gap-2'>
            <input
              type='text'
              className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted'
              placeholder='Kode (mis. BBRI)'
              value={form.code}
              maxLength={5}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <input
              type='number'
              className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted'
              placeholder='Lembar saham'
              value={form.shares}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
            />
            <input
              type='number'
              className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted'
              placeholder='Harga beli (Rp)'
              value={form.avgCost}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, avgCost: e.target.value }))}
            />
            <input
              type='text'
              className='h-9 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted'
              placeholder='Catatan (opsional)'
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <button
              type='button'
              className='inline-flex items-center px-4 py-1.5 rounded-md text-sm font-medium bg-accent text-background disabled:opacity-50'
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? 'Menyimpan...' : 'Simpan Posisi'}
            </button>
          </div>
        </div>

        {summary != null && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            <div className='flex flex-col'>
              <span className='text-xs text-text-muted uppercase tracking-wider'>Modal (cost)</span>
              <span className='text-lg font-semibold text-text'>{Utils.formatRp(summary.costBasis)}</span>
            </div>
            <div className='flex flex-col'>
              <span className='text-xs text-text-muted uppercase tracking-wider'>Nilai Pasar</span>
              <span className='text-lg font-semibold text-text'>{Utils.formatRp(summary.marketValue)}</span>
            </div>
            <div className='flex flex-col'>
              <span className='text-xs text-text-muted uppercase tracking-wider'>P&amp;L</span>
              <span className={`text-lg font-semibold ${pnlClass(summary.pnl)}`}>
                {Utils.formatRp(summary.pnl)} ({Utils.formatPct(summary.pnlPct != null ? summary.pnlPct * 100 : null)})
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-xs text-text-muted uppercase tracking-wider'>Dividen 12 bulan</span>
              <span className='text-lg font-semibold text-text'>
                {Utils.formatRp(summary.divAccrual)} ({Utils.formatPct(summary.divYieldOnCost != null ? summary.divYieldOnCost * 100 : null)})
              </span>
            </div>
          </div>
        )}

        <div className='rounded-lg border border-border bg-surface p-4 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-text'>Alokasi Sektor</h2>
          </div>
          {rows.length === 0 ? (
            <p className='text-text-muted text-sm text-center py-8'>Belum ada posisi. Tambahkan lewat form di atas.</p>
          ) : (
            <AllocationBars rows={rows} />
          )}
        </div>

        <div className='rounded-lg border border-border bg-surface p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold text-text'>Posisi</h2>
            {loading && <span className='text-text-muted text-sm'>memuat...</span>}
          </div>
          {rows.length === 0 && !loading ? (
            <p className='text-text-muted text-sm text-center py-8'>Belum ada posisi.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-text'>
                <thead className='border-b border-border text-text-muted text-left'>
                  <tr>
                    <th className='font-medium py-2 px-2'>Kode</th>
                    <th className='font-medium py-2 px-2 text-left'>Nama</th>
                    <th className='font-medium py-2 px-2 text-left'>Sektor</th>
                    <th className='font-medium py-2 px-2 text-right'>Lembar</th>
                    <th className='font-medium py-2 px-2 text-right'>Harga Beli</th>
                    <th className='font-medium py-2 px-2 text-right'>Harga Kini</th>
                    <th className='font-medium py-2 px-2 text-right'>Cost Basis</th>
                    <th className='font-medium py-2 px-2 text-right'>Nilai Pasar</th>
                    <th className='font-medium py-2 px-2 text-right'>P&amp;L</th>
                    <th className='font-medium py-2 px-2 text-right'>Div/Lembar</th>
                    <th className='font-medium py-2 px-2 text-right'>Div (Rp)</th>
                    <th />
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/50'>
                  {rows.map((row) => {
                    const pnl = row.pnl ?? null
                    return (
                      <tr key={row.code} className='hover:bg-surface-elevated/50'>
                        <td className='py-2 px-2 font-medium'>{row.code}</td>
                        <td className='py-2 px-2 text-left'>{row.name ?? '-'}</td>
                        <td className='py-2 px-2 text-left'>{row.sector ?? '-'}</td>
                        <td className='py-2 px-2 text-right'>{Utils.formatNum(row.shares, 0)}</td>
                        <td className='py-2 px-2 text-right'>{Utils.formatRp(row.avgCost)}</td>
                        <td className='py-2 px-2 text-right'>{row.price != null ? Utils.formatRp(row.price) : '-'}</td>
                        <td className='py-2 px-2 text-right'>{Utils.formatRp(row.costBasis)}</td>
                        <td className='py-2 px-2 text-right'>{row.marketValue != null ? Utils.formatRp(row.marketValue) : '-'}</td>
                        <td className={`py-2 px-2 text-right ${pnlClass(pnl)}`}>
                          {pnl != null
                            ? `${Utils.formatRp(pnl)} (${Utils.formatPct(row.pnlPct != null ? row.pnlPct * 100 : null)})`
                            : '-'}
                        </td>
                        <td className='py-2 px-2 text-right'>{row.divPerShare12m != null ? Utils.formatRp(row.divPerShare12m) : '-'}</td>
                        <td className='py-2 px-2 text-right'>{row.divAccrual != null ? Utils.formatRp(row.divAccrual) : '-'}</td>
                        <td className='py-2 px-2 text-right'>
                          <button
                            type='button'
                            className='text-text-muted hover:text-down text-sm'
                            aria-label={`Hapus ${row.code}`}
                            onClick={() => handleDelete(row.code)}
                            disabled={busy}
                          >
                            Hapus
                          </button>
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
    </div>
  )
}
