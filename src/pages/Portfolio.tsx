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
    <div className='idx-alloc'>
      {entries.map(([sector, value]) => {
        const pct = (value / total) * 100
        return (
          <div key={sector} className='idx-alloc-row'>
            <span className='idx-alloc-label'>{sector}</span>
            <div className='idx-alloc-bar'>
              <div className='idx-alloc-fill' style={{ width: `${pct}%` }} />
            </div>
            <span className='idx-alloc-pct'>{pct.toFixed(1)}%</span>
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
    return value >= 0 ? 'idx-pnl-positive' : 'idx-pnl-negative'
  }

  return (
    <div className='idx-page'>
      <div className='idx-main'>
        <h1 className='idx-h1'>Portofolio</h1>
        <p className='idx-muted'>
          Lacak posisi, biaya perolehan, P&L real-time (harga penutupan terakhir), alokasi sektor,
          dan akumulasi dividen 12 bulan terakhir.
        </p>

        {error && <p className='idx-error'>{error}</p>}

        <div className='idx-card idx-mb-24'>
          <div className='idx-portfolio-form'>
            <input
              type='text'
              className='idx-input'
              placeholder='Kode (mis. BBRI)'
              value={form.code}
              maxLength={5}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <input
              type='number'
              className='idx-input'
              placeholder='Lembar saham'
              value={form.shares}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
            />
            <input
              type='number'
              className='idx-input'
              placeholder='Harga beli (Rp)'
              value={form.avgCost}
              min={1}
              onChange={(e) => setForm((f) => ({ ...f, avgCost: e.target.value }))}
            />
            <input
              type='text'
              className='idx-input'
              placeholder='Catatan (opsional)'
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <button type='button' className='idx-btn idx-btn-primary' onClick={handleSubmit} disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan Posisi'}
            </button>
          </div>
        </div>

        {summary != null && (
          <div className='idx-portfolio-stats idx-mb-24'>
            <div className='idx-stat'>
              <span className='idx-stat-label'>Modal (cost)</span>
              <span className='idx-stat-value'>{Utils.formatRp(summary.costBasis)}</span>
            </div>
            <div className='idx-stat'>
              <span className='idx-stat-label'>Nilai Pasar</span>
              <span className='idx-stat-value'>{Utils.formatRp(summary.marketValue)}</span>
            </div>
            <div className='idx-stat'>
              <span className='idx-stat-label'>P&L</span>
              <span className={`idx-stat-value ${pnlClass(summary.pnl)}`}>
                {Utils.formatRp(summary.pnl)} ({Utils.formatPct(summary.pnlPct != null ? summary.pnlPct * 100 : null)})
              </span>
            </div>
            <div className='idx-stat'>
              <span className='idx-stat-label'>Dividen 12 bulan</span>
              <span className='idx-stat-value'>
                {Utils.formatRp(summary.divAccrual)} ({Utils.formatPct(summary.divYieldOnCost != null ? summary.divYieldOnCost * 100 : null)})
              </span>
            </div>
          </div>
        )}

        <div className='idx-card idx-mb-24'>
          <div className='idx-card-header'>
            <h2 className='idx-card-title'>Alokasi Sektor</h2>
          </div>
          {rows.length === 0 ? (
            <p className='idx-empty'>Belum ada posisi. Tambahkan lewat form di atas.</p>
          ) : (
            <AllocationBars rows={rows} />
          )}
        </div>

        <div className='idx-card'>
          <div className='idx-card-header'>
            <h2 className='idx-card-title'>Posisi</h2>
            {loading && <span className='idx-muted'>memuat...</span>}
          </div>
          {rows.length === 0 && !loading ? (
            <p className='idx-empty'>Belum ada posisi.</p>
          ) : (
            <div className='idx-table-wrap'>
              <table className='idx-table'>
                <thead>
                  <tr>
                    <th className='idx-table-col-kode'>Kode</th>
                    <th className='idx-table-col-nama'>Nama</th>
                    <th className='idx-table-col-sector'>Sektor</th>
                    <th className='idx-table-th-right'>Lembar</th>
                    <th className='idx-table-th-right'>Harga Beli</th>
                    <th className='idx-table-th-right'>Harga Kini</th>
                    <th className='idx-table-th-right'>Cost Basis</th>
                    <th className='idx-table-th-right'>Nilai Pasar</th>
                    <th className='idx-table-th-right'>P&L</th>
                    <th className='idx-table-th-right'>Div/Lembar</th>
                    <th className='idx-table-th-right'>Div (Rp)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const pnl = row.pnl ?? null
                    return (
                      <tr key={row.code}>
                        <td className='idx-table-col-kode'>{row.code}</td>
                        <td className='idx-table-col-nama'>{row.name ?? '-'}</td>
                        <td className='idx-table-col-sector'>{row.sector ?? '-'}</td>
                        <td className='idx-table-td-right'>{Utils.formatNum(row.shares, 0)}</td>
                        <td className='idx-table-td-right'>{Utils.formatRp(row.avgCost)}</td>
                        <td className='idx-table-td-right'>{row.price != null ? Utils.formatRp(row.price) : '-'}</td>
                        <td className='idx-table-td-right'>{Utils.formatRp(row.costBasis)}</td>
                        <td className='idx-table-td-right'>{row.marketValue != null ? Utils.formatRp(row.marketValue) : '-'}</td>
                        <td className={`idx-table-td-right ${pnlClass(pnl)}`}>
                          {pnl != null
                            ? `${Utils.formatRp(pnl)} (${Utils.formatPct(row.pnlPct != null ? row.pnlPct * 100 : null)})`
                            : '-'}
                        </td>
                        <td className='idx-table-td-right'>{row.divPerShare12m != null ? Utils.formatRp(row.divPerShare12m) : '-'}</td>
                        <td className='idx-table-td-right'>{row.divAccrual != null ? Utils.formatRp(row.divAccrual) : '-'}</td>
                        <td className='idx-table-td-right'>
                          <button
                            type='button'
                            className='idx-btn-ghost'
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
