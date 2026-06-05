import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { resolveApiError } from '../api/client'
import { cancelOrder, createOrder, getMyOrderHistory } from '../api/orderApi'
import type { StockSummary } from '../types/market'
import type { OrderHistoryOrder, OrderHistoryResponse, OrderHistoryTrade, OrderType } from '../types/order'

type OrderPageProps = {
  stock: StockSummary
  initialOrderType: OrderType
  initialPrice: number
  onBackToOrderBook: () => void
  onOpenPortfolio?: () => void
}

type OrderTab = OrderType | 'HISTORY' | 'BALANCE'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return '접수'
    case 'PARTIALLY_FILLED':
      return '부분체결'
    case 'CANCEL_REQUESTED':
      return '취소요청'
    case 'FILLED':
      return '체결완료'
    case 'CANCELED':
      return '취소완료'
    case 'REJECTED':
      return '거절'
    default:
      return status
  }
}

function canCancel(order: OrderHistoryOrder): boolean {
  return order.remainingQuantity > 0 && (order.status === 'ACCEPTED' || order.status === 'PARTIALLY_FILLED')
}

function createClientOrderId(orderType: OrderType): string {
  if (crypto.randomUUID) {
    return `${orderType.toLowerCase()}-${crypto.randomUUID()}`
  }
  return `${orderType.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createClientCancelId(): string {
  if (crypto.randomUUID) {
    return `cancel-${crypto.randomUUID()}`
  }
  return `cancel-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function OrderHistoryPanel() {
  const [history, setHistory] = useState<OrderHistoryResponse | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null)

  const loadHistory = async () => {
    setError('')
    setIsLoading(true)
    try {
      setHistory(await getMyOrderHistory())
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const handleCancel = async (orderId: string) => {
    setError('')
    setMessage('')
    setCancelingOrderId(orderId)
    try {
      const response = await cancelOrder(orderId, createClientCancelId())
      setMessage(response.message)
      await loadHistory()
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setCancelingOrderId(null)
    }
  }

  const openOrders = useMemo(
    () => history?.orders.filter((order) => order.remainingQuantity > 0 && order.status !== 'CANCELED') ?? [],
    [history],
  )
  const completedTrades = history?.trades ?? []

  if (isLoading) {
    return <div className="order-history-empty">주문 내역을 불러오는 중입니다.</div>
  }

  return (
    <section className="order-history-panel">
      {error && <p className="form-message error">{error}</p>}
      {message && <p className="form-message success">{message}</p>}

      <article className="history-section">
        <div className="history-heading">
          <h3>미체결 주문</h3>
          <span>{openOrders.length}건</span>
        </div>
        {openOrders.length === 0 ? (
          <div className="order-history-empty">미체결 주문이 없습니다.</div>
        ) : (
          <div className="history-list">
            {openOrders.map((order) => (
              <div className="history-card" key={order.orderId}>
                <div>
                  <strong>{order.stockName}</strong>
                  <span>{order.stockCode} · {order.orderType === 'BUY' ? '매수' : '매도'} · {statusLabel(order.status)}</span>
                </div>
                <dl>
                  <dt>주문가</dt>
                  <dd>{formatNumber(order.price)}원</dd>
                  <dt>주문수량</dt>
                  <dd>{formatNumber(order.quantity)}주</dd>
                  <dt>체결</dt>
                  <dd>{formatNumber(order.executedQuantity)}주</dd>
                  <dt>미체결</dt>
                  <dd>{formatNumber(order.remainingQuantity)}주</dd>
                </dl>
                <div className="history-actions">
                  <time>{formatDateTime(order.acceptedAt)}</time>
                  {canCancel(order) && (
                    <button type="button" onClick={() => void handleCancel(order.orderId)} disabled={cancelingOrderId === order.orderId}>
                      {cancelingOrderId === order.orderId ? '취소 중' : '취소'}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="history-section">
        <div className="history-heading">
          <h3>체결 내역</h3>
          <span>{completedTrades.length}건</span>
        </div>
        {completedTrades.length === 0 ? (
          <div className="order-history-empty">체결 내역이 없습니다.</div>
        ) : (
          <div className="history-list">
            {completedTrades.map((trade: OrderHistoryTrade) => (
              <div className="history-card compact" key={trade.tradeId}>
                <div>
                  <strong>{trade.stockName}</strong>
                  <span>{trade.stockCode} · {trade.orderType === 'BUY' ? '매수체결' : '매도체결'}</span>
                </div>
                <dl>
                  <dt>체결가</dt>
                  <dd>{formatNumber(trade.tradePrice)}원</dd>
                  <dt>수량</dt>
                  <dd>{formatNumber(trade.tradeQuantity)}주</dd>
                  <dt>금액</dt>
                  <dd>{formatNumber(trade.tradeAmount)}원</dd>
                </dl>
                <time>{formatDateTime(trade.executedAt)}</time>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

export function OrderPage({ stock, initialOrderType, initialPrice, onBackToOrderBook, onOpenPortfolio }: OrderPageProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>(initialOrderType)
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType)
  const [price, setPrice] = useState(String(initialPrice))
  const [quantity, setQuantity] = useState('1')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const orderAmount = useMemo(() => {
    const parsedPrice = Number(price)
    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedQuantity)) {
      return 0
    }
    return parsedPrice * parsedQuantity
  }, [price, quantity])

  const selectOrderType = (nextOrderType: OrderType) => {
    setOrderType(nextOrderType)
    setActiveTab(nextOrderType)
    setMessage('')
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    const parsedPrice = Number(price)
    const parsedQuantity = Number(quantity)
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setError('주문 가격은 1원 이상의 정수여야 합니다.')
      return
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError('주문 수량은 1주 이상의 정수여야 합니다.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createOrder({
        clientOrderId: createClientOrderId(orderType),
        stockCode: stock.stockCode,
        orderType,
        price: parsedPrice,
        quantity: parsedQuantity,
      })
      setMessage(`${response.message} 주문번호: ${response.orderId}`)
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="order-entry-shell">
      <header className="mobile-stock-header order-entry-header">
        <button className="icon-button" type="button" onClick={onBackToOrderBook} aria-label="호가창으로 돌아가기">‹</button>
        <div className="stock-title-block">
          <span>{stock.stockCode}</span>
          <strong>{stock.stockName}</strong>
        </div>
        <button className="order-cta current" type="button" onClick={onBackToOrderBook}>현재가</button>
      </header>

      <section className="order-entry-layout">
        <aside className="order-entry-quote">
          <span>현재가</span>
          <strong>{formatNumber(stock.currentPrice)}</strong>
          <p>{stock.stockCode}</p>
        </aside>

        <section className="order-ticket">
          <nav className="order-tabs" aria-label="주문 유형">
            <button className={activeTab === 'BUY' ? 'active buy' : ''} type="button" onClick={() => selectOrderType('BUY')}>
              매수
            </button>
            <button className={activeTab === 'SELL' ? 'active sell' : ''} type="button" onClick={() => selectOrderType('SELL')}>
              매도
            </button>
            <button className={activeTab === 'HISTORY' ? 'active history' : ''} type="button" onClick={() => setActiveTab('HISTORY')}>
              체결/미체결
            </button>
            <button className={activeTab === 'BALANCE' ? 'active balance' : ''} type="button" onClick={() => setActiveTab('BALANCE')}>
              잔고
            </button>
          </nav>

          {(activeTab === 'BUY' || activeTab === 'SELL') && (
            <form className="order-form" onSubmit={handleSubmit}>
              <label>
                주문 가격
                <div className="stepper-input">
                  <button type="button" onClick={() => setPrice(String(Math.max(1, Number(price) - 100)))}>−</button>
                  <input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" />
                  <button type="button" onClick={() => setPrice(String(Number(price || 0) + 100))}>＋</button>
                </div>
              </label>

              <label>
                주문 수량
                <div className="stepper-input">
                  <button type="button" onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))}>−</button>
                  <input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
                  <button type="button" onClick={() => setQuantity(String(Number(quantity || 0) + 1))}>＋</button>
                </div>
              </label>

              <div className="order-amount-box">
                <span>주문금액</span>
                <strong>{formatNumber(orderAmount)}원</strong>
              </div>

              {error && <p className="form-message error">{error}</p>}
              {message && <p className="form-message success">{message}</p>}

              <div className="order-submit-row">
                <button className="secondary-dark" type="button" onClick={onBackToOrderBook}>다른 주문</button>
                <button className={orderType === 'BUY' ? 'submit-order buy' : 'submit-order sell'} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '접수 중...' : orderType === 'BUY' ? '매수' : '매도'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'HISTORY' && <OrderHistoryPanel />}

          {activeTab === 'BALANCE' && (
            <section className="order-balance-panel">
              <p>보유 주식과 예수금은 잔고 화면에서 확인할 수 있습니다.</p>
              <button type="button" onClick={onOpenPortfolio}>잔고 화면으로 이동</button>
            </section>
          )}
        </section>
      </section>
    </main>
  )
}
