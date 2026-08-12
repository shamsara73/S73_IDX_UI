/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Dashboard console — replaces the old FAQ-style beranda.
 * One fetch to /api/dashboard populates the entire page.
 */

import React, { useEffect, useState } from 'react'
import { Format as Utils } from '@app/pages/utils/index.ts'
import { TrendingUp, TrendingDown, AlertTriangle, Newspaper, Building2, BarChart3, Activity } from 'lucide-react'
import * as Hooks from '@app/pages/hooks/index.ts'

interface DashboardData {
  globalMarkets: { symbol: string; name: string; price: number | null; changePct: number | null }[]
  headlines: { title: string; publishedDate: string; summary: string; tags: string; imageUrl: string }[]
  suspensions: { code: string; title: string; date: string }[]
  uma: { code: string; title: string; date: string }[]
  relistings: { code: string; name: string; type: string }[]
  announcements: { code: string; title: string; date: string; category: string }[]
  portfolio: { positions: number; pnl: number; pnlPct: number; marketValue: number } | null
  watchlist: { code: string; price: number | null; changePct: number | null }[]
  topCandidates: { code: string; name: string | null; sector: string | null; composite: number; per: number | null; roe: number | null; week26: number | null }[]
  sectorStrength: { sector: string; avgMomentum: number; count: number }[]
}

function fmtPct(v: number | null) {
  if (v == null) return '-'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function fmtPrice(v: number | null) {
  if (v == null) return '-'
  return v.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

function MarketCard({ q }: { q: DashboardData['globalMarkets'][0] }) {
  const up = (q.changePct ?? 0) >= 0
  return (
    <div className='idx-card idx-home-market-card'>
      <span className='idx-home-market-name'>{q.name || q.symbol}</span>
      <span className='idx-home-market-price'>{fmtPrice(q.price)}</span>
      <span className={`idx-home-market-change ${up ? 'idx-pct-up' : 'idx-pct-down'}`}>
        {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
        {' '}{fmtPct(q.changePct)}
      </span>
    </div>
  )
}

function AlertRow({ icon, code, title, date }: { icon: React.ReactNode; code: string; title: string; date: string }) {
  return (
    <div className='idx-home-alert-row'>
      <span className='idx-home-alert-icon'>{icon}</span>
      <span className='idx-home-alert-code'>{code}</span>
      <span className='idx-home-alert-title'>{title}</span>
      <span className='idx-home-alert-date'>{date.slice(0, 10)}</span>
    </div>
  )
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setData(j) })
      .catch(() => { if (!cancelled) setError('Gagal memuat dashboard') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className='idx-main idx-container'><p className='idx-p-muted'>Memuat dashboard...</p></div>
  }
  if (error != null || data == null) {
    return <div className='idx-main idx-container'><p className='idx-p-muted'>{error ?? 'Data tidak tersedia'}</p></div>
  }

  return (
    <div className='idx-main idx-container'>
      <h1 className='idx-h1'>Dashboard</h1>

      {/* ── Global Markets ── */}
      <section className='idx-mb-24'>
        <h2 className='idx-section-title'>Pasar Global</h2>
        <div className='idx-home-market-grid'>
          {data.globalMarkets.map((q) => <MarketCard key={q.symbol} q={q} />)}
        </div>
      </section>

      <div className='idx-home-columns'>
        {/* ── Left column ── */}
        <div className='idx-home-col-main'>

          {/* Headlines */}
          {data.headlines.length > 0 && (
            <section className='idx-mb-24'>
              <h2 className='idx-section-title'><Newspaper size={16} aria-hidden /> Berita Utama</h2>
              <div className='idx-home-news-grid'>
                {data.headlines.map((h, i) => (
                  <div key={i} className='idx-card idx-home-news-card'>
                    {h.imageUrl && <img src={h.imageUrl} alt='' className='idx-home-news-img' loading='lazy' />}
                    <div className='idx-home-news-body'>
                      <span className='idx-home-news-tag'>{h.tags}</span>
                      <h3 className='idx-home-news-title'>{h.title}</h3>
                      <p className='idx-home-news-date'>{h.publishedDate.slice(0, 10)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top Candidates */}
          {data.topCandidates.length > 0 && (
            <section className='idx-mb-24'>
              <h2 className='idx-section-title'><BarChart3 size={16} aria-hidden /> Top Komposit</h2>
              <div className='idx-table-wrap'>
                <table className='idx-table'>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th className='idx-table-th-right'>Komposit</th>
                      <th className='idx-table-th-right'>PER</th>
                      <th className='idx-table-th-right'>ROE</th>
                      <th className='idx-table-th-right'>26w</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCandidates.map((r) => (
                      <tr key={r.code}>
                        <td className='idx-table-code-bold'>{r.code}</td>
                        <td className='idx-table-col-nama'>{r.name ?? '-'}</td>
                        <td className='idx-table-td-right'>{(r.composite * 100).toFixed(0)}</td>
                        <td className='idx-table-td-right'>{Utils.formatNum(r.per, 1)}</td>
                        <td className='idx-table-td-right'>{Utils.formatNum(r.roe, 1)}</td>
                        <td className='idx-table-td-right'>{fmtPct(r.week26 != null ? r.week26 / 100 : null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Announcements */}
          {data.announcements.length > 0 && (
            <section className='idx-mb-24'>
              <h2 className='idx-section-title'><Building2 size={16} aria-hidden /> Pengumuman Emiten</h2>
              <div className='idx-home-list'>
                {data.announcements.map((a, i) => (
                  <div key={i} className='idx-home-list-row'>
                    <span className='idx-home-list-code'>{a.code}</span>
                    <span className='idx-home-list-text'>{a.title}</span>
                    <span className='idx-home-list-date'>{a.date.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className='idx-home-col-side'>

          {/* Portfolio */}
          {data.portfolio != null && (
            <div className='idx-card idx-mb-16'>
              <h3 className='idx-section-title'>Portofolio</h3>
              <div className='idx-dashboard-stats'>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>Posisi</span>
                  <span className='idx-stat-value'>{data.portfolio.positions}</span>
                </div>
                <div className='idx-stat'>
                  <span className='idx-stat-label'>P&L</span>
                  <span className={`idx-stat-value ${data.portfolio.pnl >= 0 ? 'idx-pnl-positive' : 'idx-pnl-negative'}`}>
                    {Utils.formatRp(data.portfolio.pnl)} ({fmtPct(data.portfolio.pnlPct)})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Watchlist */}
          {data.watchlist.length > 0 && (
            <div className='idx-card idx-mb-16'>
              <h3 className='idx-section-title'><Activity size={14} aria-hidden /> Watchlist</h3>
              <div className='idx-home-list'>
                {data.watchlist.map((w) => (
                  <div key={w.code} className='idx-home-list-row'>
                    <span className='idx-home-list-code'>{w.code}</span>
                    <span className='idx-home-list-text'>{fmtPrice(w.price)}</span>
                    <span className={`${(w.changePct ?? 0) >= 0 ? 'idx-pct-up' : 'idx-pct-down'}`}>{fmtPct(w.changePct)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector Strength */}
          {data.sectorStrength.length > 0 && (
            <div className='idx-card idx-mb-16'>
              <h3 className='idx-section-title'>Sektor (Momentum)</h3>
              <div className='idx-home-list'>
                {data.sectorStrength.map((s) => (
                  <div key={s.sector} className='idx-home-list-row'>
                    <span className='idx-home-list-text'>{s.sector}</span>
                    <span className={`${s.avgMomentum >= 0 ? 'idx-pct-up' : 'idx-pct-down'}`}>{fmtPct(s.avgMomentum)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts: Suspend + UMA + Relisting */}
          {(data.suspensions.length > 0 || data.uma.length > 0 || data.relistings.length > 0) && (
            <div className='idx-card idx-mb-16'>
              <h3 className='idx-section-title'><AlertTriangle size={14} aria-hidden /> Alerts & Aksi Korporasi</h3>
              {data.suspensions.map((s, i) => (
                <AlertRow key={`s${i}`} icon={<AlertTriangle size={12} color='#ef4444' />} code={s.code} title={s.title} date={s.date} />
              ))}
              {data.uma.map((u, i) => (
                <AlertRow key={`u${i}`} icon={<AlertTriangle size={12} color='#f59e0b' />} code={u.code} title={u.title} date={u.date} />
              ))}
              {data.relistings.map((r, i) => (
                <AlertRow key={`r${i}`} icon={<Building2 size={12} color='#10b981' />} code={r.code} title={r.name} date={r.type} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
