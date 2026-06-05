import { Client } from '@stomp/stompjs'
import { useEffect, useState } from 'react'
import { resolveApiError } from '../api/client'
import { getStocks } from '../api/marketApi'
import type { StockSummary, StocksResponse } from '../types/market'

type DashboardPageProps = {
  userId: number | null
  onLogout: () => void
  onOpenOrderBook: (stock: StockSummary) => void
  onOpenPortfolio: () => void
}

const STOCKS_TOPIC = '/topic/stocks'

function formatWon(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatSignedPrice(stock: StockSummary): string {
  if (stock.changeDirection === 'EVEN') {
    return '0'
  }
  const sign = stock.changeDirection === 'RISE' ? '+' : '-'
  return `${sign}${formatWon(stock.changePrice)}`
}

function formatRate(stock: StockSummary): string {
  if (stock.changeDirection === 'EVEN') {
    return '0.00%'
  }
  const sign = stock.changeDirection === 'RISE' ? '+' : '-'
  return `${sign}${stock.changeRate.toFixed(2)}%`
}

function webSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function DashboardPage({ userId, onLogout, onOpenOrderBook, onOpenPortfolio }: DashboardPageProps) {
  const [stocks, setStocks] = useState<StockSummary[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadStocks() {
      setError('')
      setIsLoading(true)
      try {
        const response = await getStocks()
        if (isMounted) {
          setStocks(response.stocks)
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

    loadStocks()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const client = new Client({
      brokerURL: webSocketUrl(),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsRealtimeConnected(true)
        client.subscribe(STOCKS_TOPIC, (message) => {
          const response = JSON.parse(message.body) as StocksResponse
          setStocks(response.stocks)
        })
      },
      onDisconnect: () => setIsRealtimeConnected(false),
      onWebSocketClose: () => setIsRealtimeConnected(false),
      onStompError: (frame) => {
        setError(frame.headers.message ?? '실시간 연결 중 오류가 발생했습니다.')
      },
    })

    client.activate()

    return () => {
      void client.deactivate()
    }
  }, [])

  return (
    <main className="dashboard-shell compact-dashboard">
      <header className="dashboard-header compact-header">
        <div>
          <p className="eyebrow">Market Dashboard</p>
          <h1>종목 리스트</h1>
          <p>종목을 클릭하면 해당 종목의 실시간 호가창으로 이동합니다.</p>
        </div>
        <div className="dashboard-actions">
          <span className={isRealtimeConnected ? 'connection-pill online' : 'connection-pill'}>
            {isRealtimeConnected ? 'Realtime ON' : 'Realtime OFF'}
          </span>
          <span className="user-pill">User #{userId}</span>
          <button type="button" onClick={onOpenPortfolio}>내 잔고</button>
          <button type="button" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      {error && <p className="dashboard-alert">{error}</p>}

      <section className="stock-board compact-stock-board">
        {isLoading ? (
          <div className="empty-board">종목 정보를 불러오는 중입니다.</div>
        ) : stocks.length === 0 ? (
          <div className="empty-board">조회 가능한 종목이 없습니다.</div>
        ) : (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>종목</th>
                  <th>현재가</th>
                  <th>등락</th>
                  <th>등락률</th>
                  <th>거래량</th>
                  <th>거래대금</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => (
                  <tr key={stock.stockCode} onClick={() => onOpenOrderBook(stock)}>
                    <td>
                      <strong>{stock.stockName}</strong>
                      <span>{stock.stockCode}</span>
                    </td>
                    <td>{formatWon(stock.currentPrice)}원</td>
                    <td className={stock.changeDirection.toLowerCase()}>{formatSignedPrice(stock)}</td>
                    <td className={stock.changeDirection.toLowerCase()}>{formatRate(stock)}</td>
                    <td>{formatWon(stock.tradeVolume)}</td>
                    <td>{formatWon(stock.tradeAmount)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
