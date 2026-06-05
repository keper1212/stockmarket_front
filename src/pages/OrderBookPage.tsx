import { Client } from '@stomp/stompjs'
import { useEffect, useMemo, useState } from 'react'
import { resolveApiError } from '../api/client'
import { StockChartPanel } from './StockChartPanel'
import { getOrderBook } from '../api/marketApi'
import type { OrderBookLevel, OrderBookResponse, StockSummary } from '../types/market'
import type { OrderType } from '../types/order'

type StockTab = 'ORDERBOOK' | 'CHART'

type OrderBookPageProps = {
  stock: StockSummary
  onBack: () => void
  onOpenOrder: (orderType: OrderType, price: number) => void
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
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

function toLevelRows(orderBook: OrderBookResponse | null): { asks: OrderBookLevel[]; bids: OrderBookLevel[] } {
  if (!orderBook) {
    return { asks: [], bids: [] }
  }

  return {
    asks: [...orderBook.askOrders].reverse(),
    bids: orderBook.bidOrders,
  }
}

export function OrderBookPage({ stock, onBack, onOpenOrder }: OrderBookPageProps) {
  const [orderBook, setOrderBook] = useState<OrderBookResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<StockTab>('ORDERBOOK')

  useEffect(() => {
    let isMounted = true

    async function loadOrderBook() {
      setError('')
      setIsLoading(true)
      try {
        const response = await getOrderBook(stock.stockCode)
        if (isMounted) {
          setOrderBook(response)
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

    loadOrderBook()

    return () => {
      isMounted = false
    }
  }, [stock.stockCode])

  useEffect(() => {
    const client = new Client({
      brokerURL: webSocketUrl(),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsRealtimeConnected(true)
        client.subscribe(`/topic/stocks/${stock.stockCode}/orderbook`, (message) => {
          setOrderBook(JSON.parse(message.body) as OrderBookResponse)
        })
      },
      onDisconnect: () => setIsRealtimeConnected(false),
      onWebSocketClose: () => setIsRealtimeConnected(false),
      onStompError: (frame) => setError(frame.headers.message ?? '실시간 호가 연결 중 오류가 발생했습니다.'),
    })

    client.activate()

    return () => {
      void client.deactivate()
    }
  }, [stock.stockCode])

  const currentPrice = orderBook?.currentPrice ?? stock.currentPrice
  const { asks, bids } = useMemo(() => toLevelRows(orderBook), [orderBook])
  const maxQuantity = useMemo(() => {
    const quantities = [...asks, ...bids].map((level) => level.quantity)
    return Math.max(1, ...quantities)
  }, [asks, bids])

  return (
    <main className="orderbook-shell">
      <header className="mobile-stock-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="뒤로가기">‹</button>
        <div className="stock-title-block">
          <span>KRX</span>
          <strong>{stock.stockName}</strong>
        </div>
        <button className="order-cta" type="button" onClick={() => onOpenOrder('BUY', currentPrice)}>주문</button>
      </header>

      <section className="quote-strip">
        <div>
          <strong>{formatNumber(currentPrice)}</strong>
          <span>{stock.stockCode}</span>
        </div>
        <p className={stock.changeDirection.toLowerCase()}>
          {stock.changeDirection === 'EVEN' ? '0' : stock.changeDirection === 'RISE' ? `▲ ${formatNumber(stock.changePrice)}` : `▼ ${formatNumber(stock.changePrice)}`}
          <br />
          {formatRate(stock)}
        </p>
        <span className={isRealtimeConnected ? 'connection-dot online' : 'connection-dot'} />
      </section>

      <nav className="stock-tabs" aria-label="종목 메뉴">
        <button className={activeTab === 'ORDERBOOK' ? 'active' : ''} type="button" onClick={() => setActiveTab('ORDERBOOK')}>호가</button>
        <button className={activeTab === 'CHART' ? 'active' : ''} type="button" onClick={() => setActiveTab('CHART')}>차트</button>
      </nav>

      {error && <p className="dashboard-alert">{error}</p>}

      {activeTab === 'CHART' ? (
        <StockChartPanel stockCode={stock.stockCode} />
      ) : (
      <section className="orderbook-board">
        <aside className="execution-pane">
          <span>체결강도</span>
          <strong>실시간</strong>
          <div className="mini-trades">
            {[1, 2, 3, 4, 5].map((item) => (
              <p key={item}><em>{formatNumber(currentPrice)}</em><span>{item}</span></p>
            ))}
          </div>
        </aside>

        <div className="price-ladder">
          {isLoading ? (
            <div className="empty-board">호가 정보를 불러오는 중입니다.</div>
          ) : (
            <>
              {asks.length === 0 && <div className="book-row empty-level">매도 대기 없음</div>}
              {asks.map((level) => (
                <button className="book-row ask-row" key={`ask-${level.price}`} type="button" onClick={() => onOpenOrder('BUY', level.price)}>
                  <span className="bar" style={{ width: `${Math.max(8, (level.quantity / maxQuantity) * 100)}%` }} />
                  <em>{formatNumber(level.quantity)}</em>
                  <strong>{formatNumber(level.price)}</strong>
                  <small>{(((level.price - currentPrice) / currentPrice) * 100).toFixed(2)}%</small>
                </button>
              ))}

              <div className="current-price-row">
                <span>현재가</span>
                <strong>{formatNumber(currentPrice)}</strong>
                <button type="button" onClick={() => onOpenOrder('BUY', currentPrice)}>주문</button>
              </div>

              {bids.map((level) => (
                <button className="book-row bid-row" key={`bid-${level.price}`} type="button" onClick={() => onOpenOrder('SELL', level.price)}>
                  <small>{(((level.price - currentPrice) / currentPrice) * 100).toFixed(2)}%</small>
                  <strong>{formatNumber(level.price)}</strong>
                  <em>{formatNumber(level.quantity)}</em>
                  <span className="bar" style={{ width: `${Math.max(8, (level.quantity / maxQuantity) * 100)}%` }} />
                </button>
              ))}
              {bids.length === 0 && <div className="book-row empty-level">매수 대기 없음</div>}
            </>
          )}
        </div>

        <aside className="market-info-pane">
          <dl>
            <dt>전일종가</dt>
            <dd>{formatNumber(stock.currentPrice - stock.changePrice)}</dd>
            <dt>상한가</dt>
            <dd className="fall">{formatNumber(Math.round(stock.currentPrice * 1.3))}</dd>
            <dt>하한가</dt>
            <dd className="rise">{formatNumber(Math.round(stock.currentPrice * 0.7))}</dd>
            <dt>거래량</dt>
            <dd>{formatNumber(stock.tradeVolume)}</dd>
          </dl>
        </aside>
      </section>
      )}
    </main>
  )
}
