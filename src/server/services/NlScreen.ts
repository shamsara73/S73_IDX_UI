/**
 * Natural-language screen parser: NL query → structured filter params via LLM.
 */

import { and, eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'

const FILTER_SCHEMA = `{
  "perMin": number | null,
  "perMax": number | null,
  "roeMin": number | null,
  "derMax": number | null,
  "divYieldMin": number | null,
  "divYearsMin": number | null,
  "minValue": number | null,
  "minVolume": number | null,
  "momentumMin": number | null,
  "momentumWeek": 4 | 12 | 26 | null,
  "sector": string | null
}`

function env(key: string): string {
  return Deno.env.get(key) ?? ''
}

export interface NlScreenResult {
  params: Record<string, unknown>
  explanation: string
  cached: boolean
  date: number
}

export class NlScreen {
  static async parse(query: string, dateInt: number): Promise<NlScreenResult> {
    const clean = query.trim()
    if (clean === '') {
      return { params: {}, explanation: 'Query kosong.', cached: false, date: dateInt }
    }

    const cacheKey = `nl:${clean.toLowerCase()}`
    const cached = await Database.select().from(Schemas.aiExplanations)
      .where(and(eq(Schemas.aiExplanations.code, cacheKey), eq(Schemas.aiExplanations.date, dateInt)))
      .limit(1)
    if (cached.length > 0 && cached[0] != null) {
      try {
        const parsed = JSON.parse(cached[0].text) as { params: Record<string, unknown>; explanation: string }
        return { params: parsed.params, explanation: parsed.explanation, cached: true, date: dateInt }
      } catch {
        // fall through
      }
    }

    const system =
      'Kamu adalah parser filter screener saham Indonesia. ' +
      'Ubah pertanyaan bahasa Indonesia ke JSON filter. ' +
      `Schema filter (hanya isi field yang relevan): ${FILTER_SCHEMA}. ` +
      'Untuk divYieldMin: nilai dalam persen (misal yield 3% → 3, bukan 0.03). ' +
      'Untuk momentumWeek: default 26. ' +
      'Untuk minValue: satuan rupiah (misal "500 juta" → 500000000). ' +
      'Balas HANYA JSON valid, tanpa markdown, tanpa penjelasan. ' +
      'Contoh: ROE di atas 15 dan DER di bawah 1 → {"roeMin":15,"derMax":1}'

    const text = await NlScreen.callLlm(system, clean)
    if (text == null || text === '') {
      return { params: {}, explanation: 'Gagal memproses query.', cached: false, date: dateInt }
    }

    let params: Record<string, unknown> = {}
    let explanation = ''
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned) as Record<string, unknown>
      params = parsed
      const parts: string[] = []
      if (parsed.perMin != null) parts.push(`PER ≥ ${parsed.perMin}`)
      if (parsed.perMax != null) parts.push(`PER ≤ ${parsed.perMax}`)
      if (parsed.roeMin != null) parts.push(`ROE ≥ ${parsed.roeMin}%`)
      if (parsed.derMax != null) parts.push(`DER ≤ ${parsed.derMax}`)
      if (parsed.divYieldMin != null) parts.push(`Div yield ≥ ${parsed.divYieldMin}%`)
      if (parsed.divYearsMin != null) parts.push(`Div tahun ≥ ${parsed.divYearsMin}`)
      if (parsed.minValue != null) parts.push(`Min value Rp${Number(parsed.minValue).toLocaleString('id-ID')}`)
      if (parsed.sector != null) parts.push(`Sektor: ${parsed.sector}`)
      explanation = parts.length > 0 ? `Filter: ${parts.join(', ')}` : 'Tidak ada filter spesifik.'
    } catch {
      return { params: {}, explanation: 'Gagal memahami query.', cached: false, date: dateInt }
    }

    // Cache the result
    const cacheText = JSON.stringify({ params, explanation })
    await Database.insert(Schemas.aiExplanations)
      .values({ code: cacheKey, date: dateInt, text: cacheText, createdAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: Schemas.aiExplanations.code, set: { text: cacheText, createdAt: new Date().toISOString() } })

    return { params, explanation, cached: false, date: dateInt }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.1,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(45000)
      })
      if (!res.ok) return null
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      return json.choices?.[0]?.message?.content?.trim() ?? null
    } catch {
      return null
    }
  }
}
