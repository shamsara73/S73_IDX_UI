/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Filter panel — Tailwind + electric green accents.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw } from 'lucide-react'
import type * as Types from '@app/pages/Types.ts'

function FilterGroup({ title, icon, children, defaultOpen = false }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className='border-b border-border-subtle py-2'>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text'
      >
        <span className='flex items-center gap-1.5'>
          {icon}
          {title}
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className='mt-2 space-y-2'>{children}</div>}
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder, type = 'number', min, max, step }: {
  label: string
  value: string | number | undefined
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className='flex flex-col gap-1'>
      <label className='text-[11px] text-text-dim'>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className='h-8 rounded-md border border-border bg-surface px-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30'
      />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string | number | undefined
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className='flex flex-col gap-1'>
      <label className='text-[11px] text-text-dim'>{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className='h-8 rounded-md border border-border bg-surface px-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30'
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function FilterPanel({
  params,
  sectors,
  sectorFilter,
  onSectorFilterChange,
  onParamsChange,
  onApply,
  onDefaultFilter
}: Types.FilterPanelProps) {
  const update = (key: keyof Types.CandidatesParams, val: unknown) => onParamsChange({ [key]: val })

  return (
    <div className='rounded-lg border border-border bg-surface p-3'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <span className='flex items-center gap-1.5 text-sm font-semibold'>
          <SlidersHorizontal size={14} className='text-accent' />
          Filter
        </span>
      </div>

      {/* Filter Groups */}
      <div className='mt-3'>
        <FilterGroup title='Valuasi' icon={<span className='text-accent text-xs'>$</span>} defaultOpen>
          <div className='grid grid-cols-2 gap-2'>
            <FilterInput label='PER Min' value={params.perMin} onChange={(v) => update('perMin', v ? Number(v) : undefined)} placeholder='0' />
            <FilterInput label='PER Max' value={params.perMax} onChange={(v) => update('perMax', v ? Number(v) : undefined)} placeholder='25' />
            <FilterInput label='PBV Min' value={params.pbvMin} onChange={(v) => update('pbvMin', v ? Number(v) : undefined)} />
            <FilterInput label='PBV Max' value={params.pbvMax} onChange={(v) => update('pbvMax', v ? Number(v) : undefined)} />
          </div>
        </FilterGroup>

        <FilterGroup title='Kualitas' icon={<span className='text-accent text-xs'>Q</span>}>
          <div className='grid grid-cols-2 gap-2'>
            <FilterInput label='ROE Min (%)' value={params.roeMin} onChange={(v) => update('roeMin', v ? Number(v) : undefined)} placeholder='15' />
            <FilterInput label='DER Max' value={params.derMax} onChange={(v) => update('derMax', v ? Number(v) : undefined)} placeholder='1' />
            <FilterInput label='ROA Min (%)' value={params.roaMin} onChange={(v) => update('roaMin', v ? Number(v) : undefined)} />
            <FilterInput label='NPM Min (%)' value={params.npmMin} onChange={(v) => update('npmMin', v ? Number(v) : undefined)} />
          </div>
        </FilterGroup>

        <FilterGroup title='Momentum' icon={<span className='text-accent text-xs'>M</span>}>
          <div className='grid grid-cols-2 gap-2'>
            <FilterSelect
              label='Periode'
              value={params.momentumWeek}
              onChange={(v) => update('momentumWeek', v ? Number(v) : undefined)}
              options={[
                { value: '', label: 'Default (26w)' },
                { value: '4', label: '4 minggu' },
                { value: '12', label: '12 minggu' },
                { value: '26', label: '26 minggu' },
                { value: '52', label: '52 minggu' }
              ]}
            />
            <FilterInput label='Min Return (%)' value={params.momentumMin} onChange={(v) => update('momentumMin', v ? Number(v) : undefined)} />
          </div>
        </FilterGroup>

        <FilterGroup title='Dividen'>
          <div className='grid grid-cols-2 gap-2'>
            <FilterInput label='Yield Min (%)' value={params.divYieldMin} onChange={(v) => update('divYieldMin', v ? Number(v) : undefined)} placeholder='3' />
            <FilterInput label='Tahun Min' value={params.divYearsMin} onChange={(v) => update('divYearsMin', v ? Number(v) : undefined)} placeholder='2' />
          </div>
        </FilterGroup>

        <FilterGroup title='Likuiditas' icon={<span className='text-accent text-xs'>L</span>}>
          <div className='grid grid-cols-2 gap-2'>
            <FilterInput label='Min Volume' value={params.minVolume} onChange={(v) => update('minVolume', v ? Number(v) : undefined)} placeholder='100000' />
            <FilterInput label='Min Value (Rp)' value={params.minValue} onChange={(v) => update('minValue', v ? Number(v) : undefined)} placeholder='500000000' />
          </div>
        </FilterGroup>

        <FilterGroup title='Sektor'>
          <select
            value={sectorFilter}
            onChange={(e) => onSectorFilterChange(e.target.value)}
            className='h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30'
          >
            <option value=''>Semua Sektor</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FilterGroup>

        <FilterGroup title='Pengecualian'>
          <div className='space-y-1.5'>
            {[
              { key: 'excludeNotation', label: 'Tanpa Notasi' },
              { key: 'excludeCorpAction', label: 'Tanpa Corp Action' },
              { key: 'excludeUma', label: 'Tanpa UMA' }
            ].map(({ key, label }) => (
              <label key={key} className='flex items-center gap-2 text-sm text-text-muted'>
                <input
                  type='checkbox'
                  checked={Boolean(params[key as keyof Types.CandidatesParams])}
                  onChange={(e) => update(key as keyof Types.CandidatesParams, e.target.checked || undefined)}
                  className='h-3.5 w-3.5 rounded border-border accent-accent'
                />
                {label}
              </label>
            ))}
          </div>
        </FilterGroup>
      </div>

      {/* Actions */}
      <div className='mt-3 flex gap-2'>
        <button
          type='button'
          onClick={onApply}
          className='flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-background transition hover:bg-accent-light'
        >
          Terapkan
        </button>
        <button
          type='button'
          onClick={onDefaultFilter}
          className='rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition hover:bg-surface-elevated hover:text-text'
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}
