import React, { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, type Time, type LineWidth, ColorType, LineSeries } from 'lightweight-charts'

interface PricePoint {
  time: string
  value: number
}

interface PriceChartProps {
  data: PricePoint[]
  height?: number
  color?: string
  lineWidth?: number
  priceLine?: { value: number; color: string; label: string }[]
}

export default function PriceChart({ data, height = 200, color = '#3b82f6', lineWidth = 2, priceLine = [] }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    if (containerRef.current == null || data.length === 0) return
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8888a0', fontSize: 11 },
      grid: { vertLines: { color: '#1e1e2e' }, horzLines: { color: '#1e1e2e' } },
      crosshair: { vertLine: { color: '#3b82f640' }, horzLine: { color: '#3b82f640' } },
      rightPriceScale: { borderColor: '#2a2a3a', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: '#2a2a3a', timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height
    })
    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: lineWidth as LineWidth,
      priceLineVisible: false,
      lastValueVisible: true
    })
    series.setData(data as { time: Time; value: number }[])
    chart.timeScale().fitContent()

    for (const pl of priceLine) {
      series.createPriceLine({ price: pl.value, color: pl.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: pl.label })
    }

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (containerRef.current != null && chartRef.current != null) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; seriesRef.current = null }
  }, [data, height, color, lineWidth])

  useEffect(() => {
    const series = seriesRef.current
    if (series == null) return
    const existing = series.priceLines()
    for (const pl of existing) series.removePriceLine(pl)
    for (const pl of priceLine) {
      series.createPriceLine({ price: pl.value, color: pl.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: pl.label })
    }
  }, [priceLine])

  return <div ref={containerRef} className='w-full' />
}
