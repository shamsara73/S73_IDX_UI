/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Server-side watchlist backed by /api/watchlist.
 * Maintains the same interface as the previous localStorage version.
 */

import { useCallback, useEffect, useState } from 'react'
import * as Hooks from '@app/pages/hooks/index.ts'
import type * as Types from '@app/pages/Types.ts'

export function useWatchlist() {
  const [watchlistCodes, setWatchlistCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch codes on mount
  useEffect(() => {
    let cancelled = false
    Hooks.fetchApi<{ data: { code: string }[] }>('/api/watchlist')
      .then((res) => {
        if (!cancelled) {
          setWatchlistCodes((res.data ?? []).map((r) => r.code))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleWatchlist = useCallback(async (code: string, _row?: Types.CandidateTableRow) => {
    const isIn = watchlistCodes.includes(code)
    setWatchlistCodes((prev) => (isIn ? prev.filter((c) => c !== code) : [...prev, code]))
    try {
      if (isIn) {
        await fetch(`/api/watchlist?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
      }
    } catch {
      // revert on error
      setWatchlistCodes((prev) => (isIn ? [...prev, code] : prev.filter((c) => c !== code)))
    }
  }, [watchlistCodes])

  const isInWatchlist = useCallback(
    (code: string) => watchlistCodes.includes(code),
    [watchlistCodes]
  )

  // watchlistRows: the table shows the same data via candidates (matched by code)
  // For now we don't fetch full rows here — the table handles it via candidate data
  const watchlistRows: Types.CandidateTableRow[] = []

  return { watchlistRows, watchlistCodes, toggleWatchlist, isInWatchlist, loading }
}
