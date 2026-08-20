/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Dashboard console — Tailwind + shadcn components.
 */

import React, { useEffect, useState } from 'react'
import { Format as Utils } from '@app/pages/utils/index.ts'
import { TrendingUp, TrendingDown, AlertTriangle, Newspaper, BarChart3, Activity, Building2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@app/components/ui/Card.tsx'
import { Badge } from '@app/components/ui/Badge.tsx'

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
  topMovers: { code: string; name: string | null; changePct: number; price: number }[]
  foreignFlow: { sector: string; net: number }[]
  breadth: { advance: number; decline: number; unchanged: number; total: number }
  highestValue: { code: string; name: string | null; value: number; price: number; changePct: number }[]
  predictionHistory: { date: number; winRate: number | null; wins: number; losses: number; flat: number; total: number }[]
}

function fmtPct(v: number | null) {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function fmtPrice(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

function MarketCard({ q }: { q: DashboardData['globalMarkets'][0] }) {
  const up = (q.changePct ?? 0) >= 0
  return (
    <Card className='flex h-full flex-col justify-between gap-1 py-3 px-3'>
      <span className='text-[11px] font-medium uppercase tracking-wider text-text-muted'>{q.name || q.symbol}</span>
      <span className='text-xl font-bold text-text tabular-nums'>{fmtPrice(q.price)}</span>
      <Badge variant={up ? 'success' : 'danger'} className='w-fit gap-1'>
        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {fmtPct(q.changePct)}
      </Badge>
    </Card>
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
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <p className='text-text-muted animate-pulse'>Memuat dashboard...</p>
      </div>
    )
  }
  if (error != null || data == null) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <p className='text-down'>{error ?? 'Data tidak tersedia'}</p>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-7xl space-y-6 px-4 py-6'>
      <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>

      {/* ── Market Pulse ── */}
      <section>
        <h2 className='mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted'>Pasar Global</h2>
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-6'>
          {data.globalMarkets.map((q) => <MarketCard key={q.symbol} q={q} />)}
        </div>
      </section>

      {/* ── Main + Sidebar ── */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]'>

        {/* ── Left: News + Candidates + Announcements ── */}
        <div className='space-y-6'>

          {/* Headlines */}
          {data.headlines.length > 0 && (
            <section>
              <h2 className='mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted'>
                <Newspaper size={14} /> Berita Utama
              </h2>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {data.headlines.map((h, i) => (
                  <Card key={i} className='flex gap-3 overflow-hidden p-3'>
                    {h.imageUrl && (
                      <img src={h.imageUrl} alt='' className='h-16 w-20 flex-shrink-0 rounded-md object-cover' loading='lazy' />
                    )}
                    <div className='flex min-w-0 flex-col gap-1'>
                      <span className='text-[10px] font-semibold uppercase text-accent'>{h.tags}</span>
                      <h3 className='line-clamp-2 text-sm font-semibold leading-snug'>{h.title}</h3>
                      <span className='text-[11px] text-text-dim'>{h.publishedDate.slice(0, 10)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Market Breadth */}
          {data.breadth.total > 0 && (
            <section>
              <h2 className='mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted'>Market Breadth</h2>
              <Card className='p-3'>
                <div className='mb-2 flex h-3 overflow-hidden rounded-full'>
                  <div className='bg-up' style={{ width: `${(data.breadth.advance / data.breadth.total) * 100}%` }} />
                  <div className='bg-text-dim' style={{ width: `${(data.breadth.unchanged / data.breadth.total) * 100}%` }} />
                  <div className='bg-down' style={{ width: `${(data.breadth.decline / data.breadth.total) * 100}%` }} />
                </div>
                <div className='flex justify-between text-[11px]'>
                  <span className='text-up'>▲ {data.breadth.advance}</span>
                  <span className='text-text-dim'>— {data.breadth.unchanged}</span>
                  <span className='text-down'>▼ {data.breadth.decline}</span>
                  <span className='text-text-muted'>{data.breadth.total} total</span>
                </div>
              </Card>
            </section>
          )}

          {/* Top Movers */}
          {data.topMovers.length > 0 && (
            <section>
              <h2 className='mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted'>Top Movers Hari Ini</h2>
              <Card className='overflow-hidden p-0'>
                <div className='grid grid-cols-2 divide-x divide-border-subtle'>
                  <div className='p-3'>
                    <span className='mb-1 block text-[10px] font-semibold uppercase text-up'>Top Gainers</span>
                    {data.topMovers.filter((m) => m.changePct > 0).slice(0, 5).map((m) => (
                      <div key={m.code} className='flex items-center justify-between py-1 text-xs'>
                        <span className='font-semibold'>{m.code}</span>
                        <Badge variant='success'>{fmtPct(m.changePct)}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className='p-3'>
                    <span className='mb-1 block text-[10px] font-semibold uppercase text-down'>Top Losers</span>
                    {data.topMovers.filter((m) => m.changePct < 0).slice(0, 5).map((m) => (
                      <div key={m.code} className='flex items-center justify-between py-1 text-xs'>
                        <span className='font-semibold'>{m.code}</span>
                        <Badge variant='danger'>{fmtPct(m.changePct)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Foreign Flow */}
          {data.foreignFlow.length > 0 && (
            <section>
              <h2 className='mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted'>Foreign Flow per Sektor</h2>
              <div className='flex flex-wrap gap-1.5'>
                {data.foreignFlow.map((f) => (
                  <span
                    key={f.sector}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      f.net >= 0 ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
                    }`}
                  >
                    <span className='max-w-[100px] truncate'>{f.sector}</span>
                    <span>{f.net >= 0 ? '+' : ''}{(f.net / 1_000_000).toFixed(0)}jt</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Highest Value */}
          {data.highestValue.length > 0 && (
            <section>
              <h2 className='mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted'>Saham Paling Likuid</h2>
              <Card className='overflow-hidden p-0'>
                <div className='divide-y divide-border-subtle'>
                  {data.highestValue.map((v) => (
                    <div key={v.code} className='flex items-center justify-between px-3 py-2'>
                      <span className='text-sm font-semibold tabular-nums'>{v.code}</span>
                      <span className='text-xs text-text-muted'>Rp{v.price.toLocaleString('id-ID')}</span>
                      <span className='text-xs text-text-dim'>Val: {(v.value / 1_000_000).toFixed(0)}jt</span>
                      <Badge variant={v.changePct >= 0 ? 'success' : 'danger'}>{fmtPct(v.changePct)}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Top Candidates */}
          {data.topCandidates.length > 0 && (
            <section>
              <h2 className='mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted'>
                <BarChart3 size={14} /> Top Komposit
              </h2>
              <Card className='overflow-hidden p-0'>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-border text-left text-xs text-text-muted'>
                        <th className='px-4 py-2.5 font-medium'>Kode</th>
                        <th className='px-4 py-2.5 font-medium'>Nama</th>
                        <th className='px-4 py-2.5 text-right font-medium'>Komposit</th>
                        <th className='px-4 py-2.5 text-right font-medium'>PER</th>
                        <th className='px-4 py-2.5 text-right font-medium'>ROE</th>
                        <th className='px-4 py-2.5 text-right font-medium'>26w</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCandidates.map((r, i) => (
                        <tr key={r.code} className={`border-b border-border-subtle ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated'}`}>
                          <td className='px-4 py-2.5 font-semibold tabular-nums'>{r.code}</td>
                          <td className='max-w-[180px] truncate px-4 py-2.5 text-text-muted'>{r.name ?? '—'}</td>
                          <td className='px-4 py-2.5 text-right font-semibold tabular-nums text-accent-light'>{(r.composite * 100).toFixed(0)}</td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>{Utils.formatNum(r.per, 1)}</td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>{Utils.formatNum(r.roe, 1)}</td>
                          <td className='px-4 py-2.5 text-right tabular-nums'>
                            <Badge variant={(r.week26 ?? 0) >= 0 ? 'success' : 'danger'}>{fmtPct(r.week26 != null ? r.week26 / 100 : null)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          )}

          {/* Announcements */}
          {data.announcements.length > 0 && (
            <section>
              <h2 className='mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted'>
                <Building2 size={14} /> Pengumuman Emiten
              </h2>
              <Card className='divide-y divide-border-subtle p-0'>
                {data.announcements.map((a, i) => (
                  <div key={i} className='flex items-center gap-3 px-4 py-2.5'>
                    <span className='w-14 flex-shrink-0 text-xs font-semibold tabular-nums'>{a.code}</span>
                    <span className='min-w-0 flex-1 truncate text-sm text-text-muted'>{a.title}</span>
                    <span className='flex-shrink-0 text-[11px] text-text-dim'>{a.date.slice(0, 10)}</span>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className='space-y-4'>

          {/* Portfolio */}
          {data.portfolio != null && (
            <Card>
              <CardHeader><CardTitle>Portofolio</CardTitle></CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <span className='text-[11px] text-text-muted'>Posisi</span>
                    <p className='text-lg font-bold tabular-nums'>{data.portfolio.positions}</p>
                  </div>
                  <div>
                    <span className='text-[11px] text-text-muted'>P&L</span>
                    <p className={`text-lg font-bold tabular-nums ${data.portfolio.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                      {Utils.formatRp(data.portfolio.pnl)}
                    </p>
                    <span className={`text-xs ${data.portfolio.pnlPct >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(data.portfolio.pnlPct)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Watchlist */}
          {data.watchlist.length > 0 && (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-1.5'><Activity size={14} /> Watchlist</CardTitle></CardHeader>
              <CardContent>
                <div className='divide-y divide-border-subtle'>
                  {data.watchlist.map((w) => (
                    <div key={w.code} className='flex items-center justify-between py-2'>
                      <span className='text-sm font-semibold tabular-nums'>{w.code}</span>
                      <span className='text-sm tabular-nums'>{fmtPrice(w.price)}</span>
                      <Badge variant={(w.changePct ?? 0) >= 0 ? 'success' : 'danger'}>{fmtPct(w.changePct)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sectors */}
          {data.sectorStrength.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Sektor (Momentum)</CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {data.sectorStrength.map((s) => (
                    <div key={s.sector} className='flex items-center justify-between'>
                      <span className='text-sm text-text-muted'>{s.sector}</span>
                      <Badge variant={s.avgMomentum >= 0 ? 'success' : 'danger'}>{fmtPct(s.avgMomentum)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {(data.suspensions.length > 0 || data.uma.length > 0 || data.relistings.length > 0) && (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-1.5'><AlertTriangle size={14} /> Alerts</CardTitle></CardHeader>
              <CardContent>
                <div className='divide-y divide-border-subtle'>
                  {data.suspensions.map((s, i) => (
                    <div key={`s${i}`} className='flex items-center gap-2 py-2'>
                      <Badge variant='danger'>Suspend</Badge>
                      <span className='text-sm font-semibold'>{s.code}</span>
                      <span className='min-w-0 flex-1 truncate text-xs text-text-muted'>{s.title}</span>
                    </div>
                  ))}
                  {data.uma.map((u, i) => (
                    <div key={`u${i}`} className='flex items-center gap-2 py-2'>
                      <Badge variant='warning'>UMA</Badge>
                      <span className='text-sm font-semibold'>{u.code}</span>
                      <span className='min-w-0 flex-1 truncate text-xs text-text-muted'>{u.title}</span>
                    </div>
                  ))}
                  {data.relistings.map((r, i) => (
                    <div key={`r${i}`} className='flex items-center gap-2 py-2'>
                      <Badge variant='success'>Relist</Badge>
                      <span className='text-sm font-semibold'>{r.code}</span>
                      <span className='min-w-0 flex-1 truncate text-xs text-text-muted'>{r.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prediction History */}
          {data.predictionHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className='flex items-center gap-1.5'>🎯 Prediksi (14 Hari)</CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {data.predictionHistory.slice(0, 7).map((p) => {
                    const d = String(p.date)
                    const dateStr = `${d.slice(6, 8)}/${d.slice(4, 6)}`
                    const rate = p.winRate != null ? (p.winRate * 100).toFixed(0) : '—'
                    const color = p.winRate != null ? (p.winRate >= 0.6 ? 'text-up' : p.winRate >= 0.4 ? 'text-warning' : 'text-down') : 'text-text-dim'
                    return (
                      <div key={p.date} className='flex items-center justify-between text-xs'>
                        <span className='text-text-muted tabular-nums'>{dateStr}</span>
                        <span className={`font-bold tabular-nums ${color}`}>{rate}%</span>
                        <span className='text-text-dim'>{p.wins}W/{p.losses}L/{p.flat}F</span>
                      </div>
                    )
                  })}
                </div>
                {data.predictionHistory.length > 1 && (() => {
                  const totalW = data.predictionHistory.reduce((s, p) => s + p.wins, 0)
                  const totalL = data.predictionHistory.reduce((s, p) => s + p.losses, 0)
                  const total = totalW + totalL
                  const overallRate = total > 0 ? (totalW / total * 100).toFixed(0) : '—'
                  const color = total > 0 ? (totalW / total >= 0.6 ? 'text-up' : totalW / total >= 0.4 ? 'text-warning' : 'text-down') : 'text-text-dim'
                  return (
                    <div className='mt-2 border-t border-border-subtle pt-2 text-xs'>
                      <span className='text-text-muted'>Overall: </span>
                      <span className={`font-bold ${color}`}>{overallRate}%</span>
                      <span className='text-text-dim'> ({totalW}W/{totalL}L)</span>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
