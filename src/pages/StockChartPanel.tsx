import { Client } from '@stomp/stompjs'
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi, type LineData, type UTCTimestamp } from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveApiError } from '../api/client'
import { getStockChart } from '../api/marketApi'
import type { StockChartPoint, TradeRealtimeMessage } from '../types/market'

type StockChartPanelProps = {
  stockCode: string
}

function webSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function toChartTime(value: string): UTCTimestamp {
  return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp
}

function toLineData(point: StockChartPoint): LineData<UTCTimestamp> {
  return {
    time: toChartTime(point.time),
    value: point.price,
  }
}

export function StockChartPanel({ stockCode }: StockChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [points, setPoints] = useState<StockChartPoint[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadChart() {
      setError('')
      setIsLoading(true)
      try {
        const response = await getStockChart(stockCode)
        if (isMounted) {
          setPoints(response.points)
        }
      } catch (requestError) {
        if (isMounted) {
          setError(resolveApiError(requestError))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadChart()

    return () => {
      isMounted = false
    }
  }, [stockCode])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const chart = createChart(containerRef.current, {
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: '#fffdf8' },
        textColor: '#6e7771',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#eee7dc' },
        horzLines: { color: '#eee7dc' },
      },
      rightPriceScale: {
        borderColor: '#ded7ca',
      },
      timeScale: {
        borderColor: '#ded7ca',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    })

    const series = chart.addSeries(LineSeries, {
      color: '#2d82f3',
      lineWidth: 3,
      priceLineVisible: true,
      lastValueVisible: true,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeChart = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }

    resizeChart()
    window.addEventListener('resize', resizeChart)

    return () => {
      window.removeEventListener('resize', resizeChart)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  const lineData = useMemo(() => points.map(toLineData), [points])

  useEffect(() => {
    if (!seriesRef.current) {
      return
    }

    seriesRef.current.setData(lineData)
    chartRef.current?.timeScale().fitContent()
  }, [lineData])

  useEffect(() => {
    const client = new Client({
      brokerURL: webSocketUrl(),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/stocks/${stockCode}/trades`, (message) => {
          const trade = JSON.parse(message.body) as TradeRealtimeMessage
          setPoints((currentPoints) => [
            ...currentPoints,
            {
              time: trade.executedAt,
              price: trade.tradePrice,
              quantity: trade.tradeQuantity,
            },
          ].slice(-300))
        })
      },
      onStompError: (frame) => setError(frame.headers.message ?? '실시간 차트 연결 중 오류가 발생했습니다.'),
    })

    client.activate()

    return () => {
      void client.deactivate()
    }
  }, [stockCode])

  return (
    <section className="chart-panel">
      {error && <p className="dashboard-alert">{error}</p>}
      <div className="chart-card">
        <div className="chart-heading">
          <div>
            <p className="eyebrow">Price Line</p>
            <h2>체결가 라인 차트</h2>
          </div>
          <span>{points.length} ticks</span>
        </div>
        <div className="chart-container" ref={containerRef} />
        {!isLoading && points.length === 0 && (
          <div className="chart-empty">아직 체결 데이터가 없습니다.</div>
        )}
        {isLoading && <div className="chart-empty">차트 데이터를 불러오는 중입니다.</div>}
      </div>
    </section>
  )
}
