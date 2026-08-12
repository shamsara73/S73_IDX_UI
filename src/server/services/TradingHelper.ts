/**
 * Trading helpers: pivot points, ATR, gap % — pure math on daily OHLC.
 */

export interface PivotSet {
  pivot: number
  s1: number
  s2: number
  s3: number
  r1: number
  r2: number
  r3: number
}

export interface AtrResult {
  atr14: number | null
  stopLoss: number | null  // close - 1.5 × ATR
  target: number | null    // close + 2 × ATR
}

/** Classic floor-trader pivot from a single day's OHLC. */
export function classicPivot(h: number, l: number, c: number): PivotSet {
  const pivot = (h + l + c) / 3
  return {
    pivot,
    s1: 2 * pivot - h,
    s2: pivot - (h - l),
    s3: l - 2 * (h - pivot),
    r1: 2 * pivot - l,
    r2: pivot + (h - l),
    r3: h + 2 * (pivot - l)
  }
}

/**
 * ATR(14) computed from an array of OHLC bars (oldest → newest).
 * Each bar: { h, l, c } (high, low, close).
 */
export function atr14(bars: { h: number; l: number; c: number }[]): number | null {
  if (bars.length < 2) {
    return null
  }
  const trueRanges: number[] = []
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]!
    const prev = bars[i - 1]!
    const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c))
    trueRanges.push(tr)
  }
  const window = trueRanges.slice(-14)
  if (window.length === 0) {
    return null
  }
  return window.reduce((s, v) => s + v, 0) / window.length
}

/** Compute pivot + ATR-based stop/target from the latest day's OHLC + recent history. */
export function computeTradingSignals(
  latestBar: { h: number; l: number; c: number },
  recentBars: { h: number; l: number; c: number }[]
): { pivot: PivotSet; atr: AtrResult } {
  const pivot = classicPivot(latestBar.h, latestBar.l, latestBar.c)
  const atr = atr14(recentBars)
  return {
    pivot,
    atr: {
      atr14: atr,
      stopLoss: atr != null ? Math.round((latestBar.c - 1.5 * atr) * 100) / 100 : null,
      target: atr != null ? Math.round((latestBar.c + 2 * atr) * 100) / 100 : null
    }
  }
}
