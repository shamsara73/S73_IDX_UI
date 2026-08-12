/**
 * Dashboard aggregator: fetches all beranda data in one round-trip.
 * Global markets + IDX news/alerts + portfolio + watchlist + top candidates + sectors.
 */

import { GlobalMarket } from '@app/server/services/GlobalMarket.ts'
import { Client } from '@app/server/services/Client.ts'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { Composite } from '@app/server/services/Composite.ts'

const IDX = 'https://www.idx.co.id/primary'

async function safeJson(url: string, client: Client, timeout = 15000): Promise<unknown> {
  try {
    const res = await client.get(url, { signal: AbortSignal.timeout(timeout) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface DashboardData {
  globalMarkets: Awaited<ReturnType<typeof GlobalMarket.fetchAll>>
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
}

export class Dashboard {
  static async fetchAll(): Promise<DashboardData> {
    const client = new Client()
    const [globalMarkets, idxHeadlines, idxSuspend, idxUma, idxRelisting, idxAnnouncement] = await Promise.allSettled([
      GlobalMarket.fetchAll(),
      safeJson(`${IDX}/NewsAnnouncement/GetNewsSearch?pageNumber=1&pageSize=4&isHeadline=1&locale=id-id`, client),
      safeJson(`${IDX}/Home/GetSuspendData?resultCount=7`, client),
      safeJson(`${IDX}/Home/GetUmaData?resultCount=7`, client),
      safeJson(`${IDX}/Home/GetRelistingData?pageSize=7&indexFrom=0`, client),
      safeJson(`${IDX}/ListedCompany/GetAnnouncement?pageSize=7&indexFrom=0&language=id-id`, client)
    ])

    // Parse headlines
    const headlines: DashboardData['headlines'] = []
    if (idxHeadlines.status === 'fulfilled' && idxHeadlines.value != null) {
      const j = idxHeadlines.value as { Items?: { Title: string; PublishedDate: string; Summary: string; Tags: string; ImageUrl: string }[] }
      for (const item of (j.Items ?? []).slice(0, 4)) {
        headlines.push({
          title: item.Title ?? '',
          publishedDate: item.PublishedDate ?? '',
          summary: (item.Summary ?? '').slice(0, 200),
          tags: item.Tags ?? '',
          imageUrl: item.ImageUrl ?? ''
        })
      }
    }

    // Parse suspensions
    const suspensions: DashboardData['suspensions'] = []
    if (idxSuspend.status === 'fulfilled' && idxSuspend.value != null) {
      const j = idxSuspend.value as { Results?: { Kode: string; Judul: string; Date: string }[] }
      for (const item of (j.Results ?? []).slice(0, 5)) {
        suspensions.push({ code: item.Kode ?? '', title: item.Judul ?? '', date: item.Date ?? '' })
      }
    }

    // Parse UMA
    const uma: DashboardData['uma'] = []
    if (idxUma.status === 'fulfilled' && idxUma.value != null) {
      const j = idxUma.value as { Results?: { CompanyID: string; Judul: string; UMADate: string }[] }
      for (const item of (j.Results ?? []).slice(0, 5)) {
        uma.push({ code: item.CompanyID ?? '', title: item.Judul ?? '', date: item.UMADate ?? '' })
      }
    }

    // Parse relisting
    const relistings: DashboardData['relistings'] = []
    if (idxRelisting.status === 'fulfilled' && idxRelisting.value != null) {
      const j = idxRelisting.value as { Activities?: { KodeEmiten: string; NamaEmiten: string; EfekType: string }[] }
      for (const item of (j.Activities ?? []).slice(0, 5)) {
        relistings.push({ code: item.KodeEmiten ?? '', name: item.NamaEmiten ?? '', type: item.EfekType ?? '' })
      }
    }

    // Parse announcements
    const announcements: DashboardData['announcements'] = []
    if (idxAnnouncement.status === 'fulfilled' && idxAnnouncement.value != null) {
      const j = idxAnnouncement.value as { Replies?: { pengumuman?: { Kode_Emiten: string; JudulPengumuman: string; TglPengumuman: string; JenisPengumuman: string } }[] }
      for (const item of (j.Replies ?? []).slice(0, 5)) {
        const p = item.pengumuman
        if (p != null) {
          announcements.push({ code: p.Kode_Emiten ?? '', title: p.JudulPengumuman ?? '', date: p.TglPengumuman ?? '', category: p.JenisPengumuman ?? '' })
        }
      }
    }

    // Portfolio summary
    let portfolio: DashboardData['portfolio'] = null
    const portRows = await Database.select().from(Schemas.portfolio)
    if (portRows.length > 0) {
      const codes = portRows.map((r) => r.code)
      const summaryDate = await Database.select({ date: Schemas.summary.date }).from(Schemas.summary).orderBy(desc(Schemas.summary.date)).limit(1)
      const dateInt = summaryDate[0]?.date ?? 0
      const prices = dateInt > 0
        ? await Database.select({ stockCode: Schemas.summary.stockCode, priceClose: Schemas.summary.priceClose })
            .from(Schemas.summary)
            .where(eq(Schemas.summary.date, dateInt))
        : []
      const priceMap = new Map(prices.map((r) => [r.stockCode, r.priceClose]))
      let totalCost = 0
      let totalValue = 0
      for (const row of portRows) {
        const price = priceMap.get(row.code) ?? 0
        totalCost += row.shares * row.avgCost
        totalValue += row.shares * price
      }
      portfolio = {
        positions: portRows.length,
        pnl: Math.round(totalValue - totalCost),
        pnlPct: totalCost > 0 ? (totalValue - totalCost) / totalCost : 0,
        marketValue: Math.round(totalValue)
      }
    }

    // Watchlist with current prices (from IDX realtime) — parallel
    const wlRows = await Database.select().from(Schemas.watchlist).orderBy(asc(Schemas.watchlist.code))
    const watchlistResults = await Promise.allSettled(
      wlRows.slice(0, 8).map(async (wl) => {
        const res = await client.get(`${IDX}/home/GetStockInfo?code=${wl.code}`, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return { code: wl.code, price: null, changePct: null }
        const j = (await res.json()) as { Price?: number; Percent?: number }
        return { code: wl.code, price: j.Price ?? null, changePct: j.Percent != null ? j.Percent / 100 : null }
      })
    )
    const watchlist: DashboardData['watchlist'] = watchlistResults.map((r) =>
      r.status === 'fulfilled' ? r.value : { code: '?', price: null, changePct: null }
    )

    // Top candidates
    const screenerRows = await Database.select({
      code: Schemas.screener.code, name: Schemas.screener.name, sector: Schemas.screener.sector,
      per: Schemas.screener.per, roe: Schemas.screener.roe, week26PC: Schemas.screener.week26PC
    }).from(Schemas.screener)
    const ranked = Composite.computeRanked(screenerRows as never)
    const topCandidates: DashboardData['topCandidates'] = ranked.slice(0, 5).map((r) => {
      const s = screenerRows.find((sr) => sr.code === r.code)
      return { code: r.code, name: r.name, sector: r.sector, composite: r.compositeScore, per: s?.per ?? null, roe: s?.roe ?? null, week26: s?.week26PC ?? null }
    })

    // Sector strength (from screener momentum)
    const sectorMap = new Map<string, { sum: number; count: number }>()
    for (const r of ranked) {
      if (r.sector == null) continue
      const cur = sectorMap.get(r.sector) ?? { sum: 0, count: 0 }
      cur.sum += r.momentumScore
      cur.count++
      sectorMap.set(r.sector, cur)
    }
    const sectorStrength = [...sectorMap.entries()]
      .map(([sector, d]) => ({ sector, avgMomentum: d.count > 0 ? d.sum / d.count : 0, count: d.count }))
      .sort((a, b) => b.avgMomentum - a.avgMomentum)
      .slice(0, 5)

    // Market data from stock_summary (today)
    const summaryDate = await Database.select({ date: Schemas.summary.date }).from(Schemas.summary).orderBy(desc(Schemas.summary.date)).limit(1)
    const todayDateInt = summaryDate[0]?.date ?? 0

    let topMovers: DashboardData['topMovers'] = []
    let foreignFlow: DashboardData['foreignFlow'] = []
    let breadth: DashboardData['breadth'] = { advance: 0, decline: 0, unchanged: 0, total: 0 }
    let highestValue: DashboardData['highestValue'] = []

    if (todayDateInt > 0) {
      const todaySummary = await Database.select({
        code: Schemas.summary.stockCode, name: Schemas.summary.stockName,
        priceClose: Schemas.summary.priceClose, change: Schemas.summary.change,
        value: Schemas.summary.value, foreignBuy: Schemas.summary.foreignBuy, foreignSell: Schemas.summary.foreignSell
      }).from(Schemas.summary).where(eq(Schemas.summary.date, todayDateInt))

      // Get sector from screener for foreign flow
      const sectorMap = new Map<string, string>()
      const screenerAll = await Database.select({ code: Schemas.screener.code, sector: Schemas.screener.sector }).from(Schemas.screener)
      for (const s of screenerAll) { if (s.sector) sectorMap.set(s.code, s.sector) }

      // Top movers (biggest gainers + losers)
      const withPct = todaySummary.map((r) => ({
        code: r.code, name: r.name, price: r.priceClose ?? 0,
        changePct: r.priceClose != null && r.change != null && r.priceClose > 0 ? r.change / (r.priceClose - r.change) : 0
      })).filter((r) => r.price > 0 && Number.isFinite(r.changePct))
      const sorted = [...withPct].sort((a, b) => b.changePct - a.changePct)
      topMovers = [...sorted.slice(0, 5), ...sorted.slice(-5).reverse()]

      // Foreign flow by sector (using screener sector)
      const sectorForeign = new Map<string, number>()
      for (const r of todaySummary) {
        const sector = sectorMap.get(r.code) ?? 'Lainnya'
        const net = (r.foreignBuy ?? 0) - (r.foreignSell ?? 0)
        sectorForeign.set(sector, (sectorForeign.get(sector) ?? 0) + net)
      }
      foreignFlow = [...sectorForeign.entries()]
        .map(([sector, net]) => ({ sector, net }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 8)

      // Market breadth
      for (const r of withPct) {
        if (r.changePct > 0) breadth.advance++
        else if (r.changePct < 0) breadth.decline++
        else breadth.unchanged++
      }
      breadth.total = withPct.length

      // Highest value (most liquid)
      highestValue = todaySummary
        .filter((r) => (r.value ?? 0) > 0)
        .map((r) => ({
          code: r.code, name: r.name, value: r.value ?? 0, price: r.priceClose ?? 0,
          changePct: r.priceClose != null && r.change != null && r.priceClose > 0 ? r.change / (r.priceClose - r.change) : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    }

    return { globalMarkets: globalMarkets.status === 'fulfilled' ? globalMarkets.value : [], headlines, suspensions, uma, relistings, announcements, portfolio, watchlist, topCandidates, sectorStrength, topMovers, foreignFlow, breadth, highestValue }
  }
}
