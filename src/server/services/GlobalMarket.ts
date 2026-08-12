/**
 * Global market data via Yahoo Finance chart API (v8).
 * Works from inside the Docker container (different IP than the host shell).
 */

export interface MarketQuote {
  symbol: string
  name: string
  price: number | null
  prevClose: number | null
  changePct: number | null
}

const SYMBOLS: Record<string, string> = {
  sp500: '^GSPC',
  nasdaq: '^IXIC',
  ihsg: '^JKSE',
  usdIdr: 'USDIDR=X',
  crude: 'CL=F',
  coal: 'MTF=F'
}

export class GlobalMarket {
  static async fetchAll(): Promise<MarketQuote[]> {
    const entries = Object.entries(SYMBOLS)
    const results = await Promise.allSettled(
      entries.map(async ([key, symbol]) => {
        const url =
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
          `?range=5d&interval=1d`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' },
          signal: AbortSignal.timeout(15000)
        })
        if (!res.ok) {
          return { symbol, name: key, price: null, prevClose: null, changePct: null }
        }
        const json = (await res.json()) as {
          chart?: { result?: { meta?: Record<string, unknown> }[] }
        }
        const meta = json.chart?.result?.[0]?.meta
        if (meta == null) {
          return { symbol, name: key, price: null, prevClose: null, changePct: null }
        }
        const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null
        const prevClose =
          typeof meta.chartPreviousClose === 'number'
            ? meta.chartPreviousClose
            : typeof meta.previousClose === 'number'
              ? meta.previousClose
              : null
        const changePct =
          price != null && prevClose != null && prevClose > 0
            ? (price - prevClose) / prevClose
            : null
        return {
          symbol,
          name: String(meta.shortName ?? meta.symbol ?? key),
          price,
          prevClose,
          changePct
        }
      })
    )
    return results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { symbol: entries[i]![1], name: entries[i]![0], price: null, prevClose: null, changePct: null }
    )
  }
}
