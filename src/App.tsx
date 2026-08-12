/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, History, Home as HomeIcon, Info, LineChart, PieChart } from 'lucide-react'
import Home from '@app/pages/Home.tsx'
import About from '@app/pages/About.tsx'
import Screener from '@app/pages/Screener.tsx'
import Historical from '@app/pages/Historical.tsx'
import Backtest from '@app/pages/Backtest.tsx'
import Portfolio from '@app/pages/Portfolio.tsx'
import Journal from '@app/pages/Journal.tsx'

const NAV = [
  { path: '/', label: 'Beranda', icon: HomeIcon },
  { path: '/screener', label: 'Screener', icon: BarChart3 },
  { path: '/historical', label: 'Historical', icon: History },
  { path: '/backtest', label: 'Backtest', icon: LineChart },
  { path: '/portfolio', label: 'Portfolio', icon: PieChart },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/about', label: 'Tentang', icon: Info }
]

export default function App() {
  const location = useLocation()
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname])

  return (
    <div className='min-h-screen bg-background text-text'>
      {/* ── Navbar ── */}
      <header className='sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md'>
        <div className='mx-auto flex h-12 max-w-7xl items-center gap-6 px-4'>
          {/* Logo */}
          <Link to='/' className='flex items-center gap-2 no-underline'>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-accent/10'>
              <LineChart size={16} className='text-accent' strokeWidth={2.5} />
            </div>
            <span className='text-sm font-bold tracking-tight'>
              IDX <span className='text-accent'>Screener</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className='flex items-center gap-1'>
            {NAV.map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium no-underline transition-colors ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-muted hover:bg-surface-elevated hover:text-text'
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                  <span className='hidden sm:inline'>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className='min-h-[calc(100vh-3rem)]'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/about' element={<About />} />
          <Route path='/historical' element={<Historical />} />
          <Route path='/screener' element={<Screener />} />
          <Route path='/backtest' element={<Backtest />} />
          <Route path='/portfolio' element={<Portfolio />} />
          <Route path='/journal' element={<Journal />} />
        </Routes>
      </main>
    </div>
  )
}
