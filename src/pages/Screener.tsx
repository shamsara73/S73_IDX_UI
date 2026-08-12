/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart2, Star, TrendingUp } from 'lucide-react'
import * as ScreenerComps from '@app/pages/components/screener/index.ts'
import * as Hooks from '@app/pages/hooks/index.ts'
import * as Utils from '@app/pages/utils/index.ts'
import type * as Types from '@app/pages/Types.ts'

const defaultParams: Types.CandidatesParams = {
  limit: 10,
  offset: 0,
  defaultFilter: true,
  excludeNotation: true,
  excludeCorpAction: true,
  excludeUma: true,
  perMin: 1,
  perMax: 25,
  roeMin: 10,
  derMax: 2,
  momentumWeek: 26,
  momentumMin: 5,
  minValue: 1_000_000_000,
  minVolume: 100_000,
  withSectorRank: true
}

export default function Screener() {
  const [params, setParams] = useState<Types.CandidatesParams>(defaultParams)
  const [appliedParams, setAppliedParams] = useState<Types.CandidatesParams>(defaultParams)
  const [sectorWeek, setSectorWeek] = useState<26 | 52>(26)
  const [sectorFilter, setSectorFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchForRequest, setSearchForRequest] = useState<string>('')
  const [detailCode, setDetailCode] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<Types.MainAnalysisTab>('fundamental')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchForRequestRef = useRef<string>('')
  const { data: generalData } = Hooks.useGeneral()
  const { watchlistRows, watchlistCodes, toggleWatchlist } = Hooks.useWatchlist()
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)
  const [savedScreens, setSavedScreens] = useState<Types.SavedScreen[]>([])
  const [screenName, setScreenName] = useState('')
  const [nlQuery, setNlQuery] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  useEffect(() => {
    Hooks.fetchApi<{ data: Types.SavedScreen[] }>('/api/screens')
      .then((res) => setSavedScreens(res.data ?? []))
      .catch(() => setSavedScreens([]))
  }, [])
  const handleNlSearch = useCallback(async () => {
    const q = nlQuery.trim()
    if (q === '') return
    setNlLoading(true)
    try {
      const res: { params?: Record<string, unknown>; explanation?: string } =
        await Hooks.fetchApi(`/api/nl-screen?q=${encodeURIComponent(q)}`)
      if (res.params != null && Object.keys(res.params).length > 0) {
        const next: Types.CandidatesParams = { ...defaultParams, ...res.params, offset: 0 }
        setParams(next)
        setAppliedParams(next)
        setSearchQuery('')
        setSearchForRequest('')
      }
    } catch {
      // ignore
    } finally {
      setNlLoading(false)
    }
  }, [nlQuery])

  const handleSaveScreen = useCallback(async () => {
    const name = screenName.trim()
    if (name === '') {
      return
    }
    const filters = JSON.stringify(appliedParams)
    try {
      await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filters })
      })
      setScreenName('')
      const res = await Hooks.fetchApi<{ data: Types.SavedScreen[] }>('/api/screens')
      setSavedScreens(res.data ?? [])
    } catch {
      /* ignore */
    }
  }, [screenName, appliedParams])
  const handleLoadScreen = useCallback((screen: Types.SavedScreen) => {
    try {
      const parsed = JSON.parse(screen.filters) as Partial<Types.CandidatesParams>
      const next = { ...defaultParams, ...parsed, offset: 0 }
      setParams(next)
      setAppliedParams(next)
      setSearchQuery('')
      setSearchForRequest('')
    } catch {
      /* ignore */
    }
  }, [])
  const handleDeleteScreen = useCallback(async (id: number) => {
    try {
      await fetch(`/api/screens?id=${id}`, { method: 'DELETE' })
      setSavedScreens((prev) => prev.filter((s) => s.id !== id))
    } catch {
      /* ignore */
    }
  }, [])
  const {
    data: screenerRsiData,
    loading: screenerRsiLoading,
    error: screenerRsiError,
    refetch: refetchScreenerRsi
  } = Hooks.useScreenerRsi()
  const {
    data: screenerBidOfferData,
    loading: screenerBidOfferLoading,
    error: screenerBidOfferError,
    refetch: refetchScreenerBidOffer
  } = Hooks.useScreenerBidOffer()
  const sectors = generalData?.sectors ?? []
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (searchDebounceRef.current != null) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null
      setSearchForRequest(trimmed)
      if (trimmed !== lastSearchForRequestRef.current) {
        lastSearchForRequestRef.current = trimmed
        setAppliedParams((prev) => ({ ...prev, offset: 0 }))
        setParams((prev) => ({ ...prev, offset: 0 }))
      }
    }, 300)
    return () => {
      if (searchDebounceRef.current != null) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

  const requestParams = useMemo(() => {
    const { sector: _s, search: _q, ...rest } = appliedParams
    return {
      ...rest,
      ...(sectorFilter.trim() !== '' && { sector: sectorFilter }),
      ...(searchForRequest !== '' && { search: searchForRequest })
    }
  }, [appliedParams, sectorFilter, searchForRequest])
  const {
    response: candidatesResponse,
    loading: candidatesLoading,
    error: candidatesError,
    refetch: refetchCandidates
  } = Hooks.useCandidates(requestParams)
  const { data: sectorData, loading: sectorLoading } = Hooks.useSectorStrength(sectorWeek)
  const {
    data: detailData,
    loading: detailLoading,
    error: detailError,
    fetchDetail,
    clearDetail
  } = Hooks.useStockDetail()

  const handleParamsChange = useCallback((partial: Partial<Types.CandidatesParams>) => {
    setParams((prevParams: Types.CandidatesParams) => ({ ...prevParams, ...partial, offset: 0 }))
  }, [])

  const handleApplyFilter = useCallback(() => {
    const trimmed = searchQuery.trim()
    setSearchForRequest(trimmed)
    const { sector: _s, search: _q, ...rest } = params
    setAppliedParams({
      ...rest,
      offset: 0,
      ...(sectorFilter.trim() !== '' && { sector: sectorFilter }),
      ...(trimmed !== '' && { search: trimmed })
    })
  }, [params, sectorFilter, searchQuery])

  const handleDefaultFilter = useCallback(() => {
    const paramsToApply = { ...defaultParams, offset: 0 }
    setParams(paramsToApply)
    setAppliedParams(paramsToApply)
    setSectorFilter('')
    setSearchQuery('')
    setSearchForRequest('')
  }, [])

  const handleSortChange = useCallback((newSortBy: string, newSortDir: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortDir(newSortDir)
    setAppliedParams((prev) => ({ ...prev, sortBy: newSortBy, sortDir: newSortDir, offset: 0 }))
    setParams((prev) => ({ ...prev, sortBy: newSortBy, sortDir: newSortDir, offset: 0 }))
  }, [])

  const handlePageChange = useCallback((newOffset: number) => {
    setParams((prevParams: Types.CandidatesParams) => ({ ...prevParams, offset: newOffset }))
    setAppliedParams((prevParams: Types.CandidatesParams) => ({ ...prevParams, offset: newOffset }))
  }, [])

  const handleRowClick = useCallback(
    (code: string) => {
      setDetailCode(code)
      const responseDate = candidatesResponse?.date
      const endDate = responseDate ??
        parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10)
      const startDate = Utils.Format.addDaysToDateInt(endDate, -90)
      fetchDetail(code, startDate, endDate, responseDate)
    },
    [candidatesResponse?.date, fetchDetail]
  )

  const handleCloseModal = useCallback(() => {
    setDetailCode(null)
    clearDetail()
  }, [clearDetail])

  const handleSectorFilterChange = useCallback((sector: string) => {
    setSectorFilter(sector)
    setAppliedParams((prev) => ({ ...prev, offset: 0 }))
    setParams((prev) => ({ ...prev, offset: 0 }))
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const dataDate = candidatesResponse?.date ?? 0
  const rawData = candidatesResponse?.data ?? []
  const totalCount = candidatesResponse?.totalCount ?? 0
  const limit = candidatesResponse?.limit ?? 10
  const offset = candidatesResponse?.offset ?? 0
  const totalCountLabel = sectorFilter.trim() !== ''
    ? `sektor: ${sectorFilter}`
    : searchForRequest !== ''
    ? `cari: "${searchForRequest}"`
    : undefined

  return (
    <div className='idx-page'>
      <div className='idx-main'>
        <ScreenerComps.DashboardHeader
          totalCount={mainTab === 'watchlist' ? watchlistRows.length : totalCount}
          date={dataDate}
          onRefresh={refetchCandidates}
          loading={mainTab === 'watchlist' ? false : candidatesLoading}
        />
        <div className='idx-screens-bar'>
          <input
            type='text'
            className='idx-input'
            placeholder='Cari dengan AI (mis. ROE di atas 15, DER di bawah 1)'
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNlSearch() }}
            disabled={nlLoading}
          />
          <button type='button' onClick={handleNlSearch} disabled={nlLoading}>
            {nlLoading ? '...' : 'Cari'}
          </button>
          <input
            type='text'
            className='idx-input'
            placeholder='Nama screen (mis. Value + Dividen)'
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
          />
          <button type='button' onClick={handleSaveScreen}>
            Simpan Screen
          </button>
          {savedScreens.map((screen) => (
            <span key={screen.id} className='idx-screen-chip'>
              <button type='button' onClick={() => handleLoadScreen(screen)}>
                {screen.name}
              </button>
              <button
                type='button'
                aria-label={`Hapus ${screen.name}`}
                onClick={() => handleDeleteScreen(screen.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className='idx-tabs idx-mb-24'>
          <button
            type='button'
            className={`idx-tab idx-tab-inline ${mainTab === 'watchlist' ? 'idx-tab-active' : ''}`}
            onClick={() => setMainTab('watchlist')}
          >
            <Star size={16} aria-hidden />
            <span>Watchlist</span>
          </button>
          <button
            type='button'
            className={`idx-tab idx-tab-inline ${
              mainTab === 'fundamental' ? 'idx-tab-active' : ''
            }`}
            onClick={() => setMainTab('fundamental')}
          >
            <BarChart2 size={16} aria-hidden />
            <span>Analisa Fundamental</span>
          </button>
          <button
            type='button'
            className={`idx-tab idx-tab-inline ${mainTab === 'technical' ? 'idx-tab-active' : ''}`}
            onClick={() => setMainTab('technical')}
          >
            <TrendingUp size={16} aria-hidden />
            <span>Analisa Teknikal</span>
          </button>
        </div>
        {mainTab === 'fundamental' && (
          <div className='idx-grid-main'>
            <div>
              <ScreenerComps.FilterPanel
                params={params}
                sectors={sectors}
                sectorFilter={sectorFilter}
                onSectorFilterChange={handleSectorFilterChange}
                onParamsChange={handleParamsChange}
                onApply={handleApplyFilter}
                onDefaultFilter={handleDefaultFilter}
              />
              <div className='idx-mt-24'>
                <ScreenerComps.CandidatesTable
                  data={rawData}
                  limit={limit}
                  offset={offset}
                  totalCount={totalCount}
                  {...(totalCountLabel != null && { totalCountLabel })}
                  onPage={handlePageChange}
                  onRowClick={handleRowClick}
                  searchValue={searchQuery}
                  onSearchChange={handleSearchChange}
                  loading={candidatesLoading}
                  error={candidatesError}
                  emptyMessage={searchForRequest !== ''
                    ? 'Tidak ada hasil untuk pencarian ini.'
                    : 'Tidak ada kandidat yang memenuhi filter. Coba longgarkan filter atau klik "Reset Ke Default".'}
                  watchlistCodes={watchlistCodes}
                  onWatchlistToggle={toggleWatchlist}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>
            <aside>
              <ScreenerComps.SectorStrength
                data={sectorData}
                loading={sectorLoading}
                week={sectorWeek}
                onWeekChange={setSectorWeek}
              />
            </aside>
          </div>
        )}
        {mainTab === 'technical' && (
          <div className='idx-technical-row'>
            <ScreenerComps.RsiMarketView
              data={screenerRsiData}
              loading={screenerRsiLoading}
              error={screenerRsiError}
              onRefetch={refetchScreenerRsi}
            />
            <ScreenerComps.BidOfferMarketView
              data={screenerBidOfferData}
              loading={screenerBidOfferLoading}
              error={screenerBidOfferError}
              onRefetch={refetchScreenerBidOffer}
            />
          </div>
        )}
        {mainTab === 'watchlist' && (
          <div className='idx-mt-24'>
            <ScreenerComps.CandidatesTable
              data={watchlistRows}
              limit={watchlistRows.length || 10}
              offset={0}
              totalCount={watchlistRows.length}
              onPage={handlePageChange}
              onRowClick={handleRowClick}
              loading={false}
              error={null}
              emptyMessage='Belum ada emiten di watchlist. Dari tab Analisa Fundamental, klik bintang di baris kandidat untuk menambah.'
              watchlistCodes={watchlistCodes}
              onWatchlistToggle={toggleWatchlist}
            />
          </div>
        )}
      </div>
      {detailCode && (
        <ScreenerComps.StockDetailModal
          detail={detailData}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
