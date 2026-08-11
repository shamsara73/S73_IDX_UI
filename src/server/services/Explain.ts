/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * AI explanation for a stock's screener position: gathers the factor context
 * (Valuasi/Kualitas/Momentum scores, contributions, sector percentile, ratio
 * trend, dividends), asks the LLM for a concise analyst-style explanation,
 * and caches it per stock per day.
 */

import { and, desc, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'
import { Composite } from '@app/server/services/Composite.ts'

export interface ExplainResult {
  code: string
  date: number
  text: string
  cached: boolean
}

interface ScoredRow {
  code: string
  name: string | null
  sector: string | null
  per: number | null
  roe: number | null
  der: number | null
  week26PC: number | null
  week52PC: number | null
  valueScore: number
  qualityScore: number
  momentumScore: number
  compositeScore: number
}

function env(key: string): string {
  return Deno.env.get(key) ?? ''
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) {
    return '-'
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`
}

function round2(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '-'
  }
  return value.toFixed(2)
}

export class Explain {
  static async forCode(code: string, dateInt: number): Promise<ExplainResult> {
    const cleanCode = code.trim().toUpperCase()
    const cached = await Database.select().from(Schemas.aiExplanations)
      .where(and(eq(Schemas.aiExplanations.code, cleanCode), eq(Schemas.aiExplanations.date, dateInt)))
      .limit(1)
    if (cached.length > 0 && cached[0] != null) {
      return { code: cleanCode, date: dateInt, text: cached[0].text, cached: true }
    }

    const screenerRows = await Database.select({
      code: Schemas.screener.code,
      name: Schemas.screener.name,
      sector: Schemas.screener.sector,
      per: Schemas.screener.per,
      pbv: Schemas.screener.pbv,
      roe: Schemas.screener.roe,
      der: Schemas.screener.der,
      week26PC: Schemas.screener.week26PC,
      week52PC: Schemas.screener.week52PC
    }).from(Schemas.screener)

    const ranked = Composite.computeRanked(screenerRows as never)
    const target = ranked.find((r) => r.code === cleanCode)
    if (target == null) {
      return { code: cleanCode, date: dateInt, text: `Kode ${cleanCode} tidak ditemukan di data screener.`, cached: false }
    }
    const screenerRow = screenerRows.find((r) => r.code === cleanCode)
    const scored: ScoredRow = {
      code: target.code,
      name: target.name,
      sector: target.sector,
      per: screenerRow?.per ?? null,
      roe: screenerRow?.roe ?? null,
      der: screenerRow?.der ?? null,
      week26PC: screenerRow?.week26PC ?? null,
      week52PC: screenerRow?.week52PC ?? null,
      valueScore: target.valueScore,
      qualityScore: target.qualityScore,
      momentumScore: target.momentumScore,
      compositeScore: target.compositeScore
    }

    // Rank + percentile within sector (of the same universe)
    const sectorRows = ranked.filter((r) => r.sector === scored.sector)
    const sectorIndex = sectorRows.findIndex((r) => r.code === cleanCode)
    const sectorRank = sectorIndex >= 0 ? sectorIndex + 1 : null
    const sectorCount = sectorRows.length

    // Ratio trend (last 4 quarterly reports)
    const ratioRows = await Database.select({
      period: Schemas.financialRatios.period,
      roe: Schemas.financialRatios.roe,
      per: Schemas.financialRatios.per
    }).from(Schemas.financialRatios)
      .where(eq(Schemas.financialRatios.code, cleanCode))
      .orderBy(desc(Schemas.financialRatios.period))
      .limit(4)
    const ratioTrend = [...ratioRows].reverse().map((r) => ({
      period: new Date(r.period ?? 0).toISOString().slice(0, 7),
      roe: round2(r.roe),
      per: round2(r.per)
    }))

    // Trailing 12-month dividends per share
    const nowTs = Date.now()
    const cutoff = nowTs - 365 * 86400000
    const divRows = await Database.select({
      cashDividend: Schemas.dividends.cashDividend,
      recordDate: Schemas.dividends.recordDate
    }).from(Schemas.dividends).where(eq(Schemas.dividends.code, cleanCode))
    let divSum = 0
    for (const d of divRows) {
      const n = Number(d.recordDate)
      const ts = Number.isFinite(n) && d.recordDate !== '' ? (n > 1e12 ? n : n * 1000)
        : new Date(d.recordDate ?? '').getTime()
      if (Number.isFinite(ts) && ts >= cutoff) {
        divSum += d.cashDividend ?? 0
      }
    }

    const contribution = (score: number, weight: number): string => (score * weight * 100).toFixed(1)

    const prompt =
      `Data saham ${scored.code} (${scored.name ?? '-'}) sektor ${scored.sector ?? '-'}:\n` +
      `- Peringkat komposit: ${sectorRank != null ? `#${sectorRank} dari ${sectorCount} di sektor` : 'n/a'}\n` +
      `- Skor: V ${(scored.valueScore * 100).toFixed(0)} (kontribusi ${contribution(scored.valueScore, 0.4)}), ` +
      `Q ${(scored.qualityScore * 100).toFixed(0)} (kontribusi ${contribution(scored.qualityScore, 0.3)}), ` +
      `M ${(scored.momentumScore * 100).toFixed(0)} (kontribusi ${contribution(scored.momentumScore, 0.3)}), ` +
      `Komposit ${(scored.compositeScore * 100).toFixed(1)}\n` +
      `- Fundamental: PER ${round2(scored.per)}, ROE ${round2(scored.roe)}%, DER ${round2(scored.der)}, ` +
      `26w ${pct(scored.week26PC)}, 52w ${pct(scored.week52PC)}\n` +
      `- Tren ROE/PER kuartalan: ${ratioTrend.length > 0 ? ratioTrend.map((r) => `${r.period} ROE ${r.roe} PER ${r.per}`).join('; ') : 'belum tersedia'}\n` +
      `- Dividen 12 bulan terakhir: Rp${divSum.toFixed(0)}/lembar`

    const system =
      'Kamu adalah analis saham Indonesia yang ringkas dan tajam untuk screener multi-faktor ' +
      '(Valuasi 40%, Kualitas 30%, Momentum 30%). Jelaskan posisi saham secara objektif: ' +
      'kenapa ia berada di posisi ini, kekuatan utama, kelemahan utama, dan satu hal yang perlu ' +
      'diwaspadai. Bahasa Indonesia. Maksimal 6 kalimat, langsung ke intinya, tanpa pembukaan ' +
      'dan tanpa disclaimer panjang.'

    const text = await Explain.callLlm(system, prompt)

    const finalText = text != null && text !== ''
      ? text
      : `Skor komposit ${(scored.compositeScore * 100).toFixed(1)} (V ${(scored.valueScore * 100).toFixed(0)} · ` +
        `Q ${(scored.qualityScore * 100).toFixed(0)} · M ${(scored.momentumScore * 100).toFixed(0)}). ` +
        `Analisis AI belum tersedia — gunakan angka faktor di atas sebagai acuan.`

    await Database.insert(Schemas.aiExplanations)
      .values({ code: cleanCode, date: dateInt, text: finalText, createdAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: Schemas.aiExplanations.code,
        set: { text: finalText, createdAt: new Date().toISOString() }
      })

    return { code: cleanCode, date: dateInt, text: finalText, cached: false }
  }

  private static async callLlm(system: string, user: string): Promise<string | null> {
    const baseUrl = env('EXPLAIN_BASE_URL')
    const model = env('EXPLAIN_MODEL')
    const apiKey = env('EXPLAIN_API_KEY')
    if (baseUrl === '' || model === '' || apiKey === '') {
      return null
    }
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.3,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(45000)
      })
      if (!res.ok) {
        return null
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      return json.choices?.[0]?.message?.content?.trim() ?? null
    } catch {
      return null
    }
  }
}
