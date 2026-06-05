import { useEffect, useState } from 'react'
import { logout as requestLogout, refreshAccessToken } from './api/authApi'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { OrderBookPage } from './pages/OrderBookPage'
import { OrderPage } from './pages/OrderPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { SignupPage } from './pages/SignupPage'
import { useAuthStore } from './stores/authStore'
import type { StockSummary } from './types/market'
import type { OrderType } from './types/order'
import './App.css'

type AuthView = 'login' | 'signup'
type AppView = 'dashboard' | 'orderbook' | 'order' | 'portfolio'

type AppHistoryState = {
  stockmarketView: true
  appView: AppView
  selectedStock: StockSummary | null
  orderType: OrderType
  orderPrice: number
}

function toHistoryState(
  appView: AppView,
  selectedStock: StockSummary | null,
  orderType: OrderType,
  orderPrice: number,
): AppHistoryState {
  return {
    stockmarketView: true,
    appView,
    selectedStock,
    orderType,
    orderPrice,
  }
}

function isAppHistoryState(state: unknown): state is AppHistoryState {
  return Boolean(state && typeof state === 'object' && (state as AppHistoryState).stockmarketView === true)
}

function App() {
  const [authView, setAuthView] = useState<AuthView>('login')
  const [appView, setAppView] = useState<AppView>('dashboard')
  const [selectedStock, setSelectedStock] = useState<StockSummary | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('BUY')
  const [orderPrice, setOrderPrice] = useState(0)
  const accessToken = useAuthStore((state) => state.accessToken)
  const userId = useAuthStore((state) => state.userId)
  const isAuthReady = useAuthStore((state) => state.isAuthReady)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const response = await refreshAccessToken()
        if (!cancelled) {
          setAccessToken(response.accessToken)
        }
      } catch {
        if (!cancelled) {
          clearAuth()
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [clearAuth, setAccessToken])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    if (!isAppHistoryState(window.history.state)) {
      window.history.replaceState(
        toHistoryState('dashboard', null, 'BUY', 0),
        '',
        window.location.pathname,
      )
    }

    const handlePopState = (event: PopStateEvent) => {
      if (!isAppHistoryState(event.state)) {
        return
      }

      setAppView(event.state.appView)
      setSelectedStock(event.state.selectedStock)
      setOrderType(event.state.orderType)
      setOrderPrice(event.state.orderPrice)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [accessToken])

  const pushAppView = (
    nextAppView: AppView,
    nextSelectedStock: StockSummary | null,
    nextOrderType: OrderType,
    nextOrderPrice: number,
  ) => {
    setAppView(nextAppView)
    setSelectedStock(nextSelectedStock)
    setOrderType(nextOrderType)
    setOrderPrice(nextOrderPrice)
    window.history.pushState(
      toHistoryState(nextAppView, nextSelectedStock, nextOrderType, nextOrderPrice),
      '',
      window.location.pathname,
    )
  }

  const handleLogout = async () => {
    try {
      await requestLogout()
    } finally {
      logout()
      setAppView('dashboard')
      setSelectedStock(null)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const openOrderBook = (stock: StockSummary) => {
    pushAppView('orderbook', stock, 'BUY', stock.currentPrice)
  }

  const openPortfolio = () => {
    pushAppView('portfolio', selectedStock, orderType, orderPrice)
  }

  const openOrder = (nextOrderType: OrderType, price: number) => {
    if (!selectedStock) {
      return
    }
    pushAppView('order', selectedStock, nextOrderType, price)
  }

  const goBackInsideApp = (fallbackView: AppView) => {
    if (isAppHistoryState(window.history.state)) {
      window.history.back()
      return
    }
    setAppView(fallbackView)
  }

  if (!isAuthReady) {
    return (
      <main className="auth-shell">
        <section className="form-panel" aria-label="인증 확인">
          <section className="auth-card">
            <div className="eyebrow">Session Check</div>
            <h1>접속 상태 확인 중</h1>
            <p className="auth-copy">저장된 refreshToken 쿠키로 로그인 상태를 확인하고 있습니다.</p>
          </section>
        </section>
      </main>
    )
  }

  if (accessToken) {
    if (appView === 'portfolio') {
      return <PortfolioPage onBack={() => goBackInsideApp('dashboard')} />
    }

    if (appView === 'orderbook' && selectedStock) {
      return (
        <OrderBookPage
          stock={selectedStock}
          onBack={() => goBackInsideApp('dashboard')}
          onOpenOrder={openOrder}
        />
      )
    }

    if (appView === 'order' && selectedStock) {
      return (
        <OrderPage
          stock={selectedStock}
          initialOrderType={orderType}
          initialPrice={orderPrice || selectedStock.currentPrice}
          onBackToOrderBook={() => goBackInsideApp('orderbook')}
          onOpenPortfolio={openPortfolio}
        />
      )
    }

    return (
      <DashboardPage
        userId={userId}
        onLogout={handleLogout}
        onOpenOrderBook={openOrderBook}
        onOpenPortfolio={openPortfolio}
      />
    )
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel" aria-label="서비스 소개">
        <div className="market-badge">Kafka Redis Trading Lab</div>
        <div className="brand-copy">
          <p className="kicker">Virtual exchange</p>
          <h1>실시간 체결 흐름을 보는 모의 주식 플랫폼</h1>
          <p>
            Redis 호가창, Kafka 이벤트, WebSocket 실시간 푸시까지 연결된 거래 시스템을
            프론트에서 직접 확인합니다.
          </p>
        </div>
        <div className="market-card" aria-hidden="true">
          <div className="ticker-row rise">
            <span>SAM-ELEC</span>
            <strong>292,500</strong>
            <em>+2.18%</em>
          </div>
          <div className="ticker-row fall">
            <span>SK-HYNIX</span>
            <strong>1,941,000</strong>
            <em>-0.42%</em>
          </div>
          <div className="depth-bars">
            <span style={{ width: '72%' }} />
            <span style={{ width: '46%' }} />
            <span style={{ width: '61%' }} />
          </div>
        </div>
      </section>

      <section className="form-panel" aria-label="인증">
        {authView === 'login' ? (
          <LoginPage onMoveToSignup={() => setAuthView('signup')} />
        ) : (
          <SignupPage onMoveToLogin={() => setAuthView('login')} />
        )}
      </section>
    </main>
  )
}

export default App
