import { useEffect, useMemo, useState } from 'react'
import { resolveApiError } from '../api/client'
import { getMyAssets } from '../api/portfolioApi'
import type { HoldingStock, UserAssetsResponse } from '../types/portfolio'

type PortfolioPageProps = {
  onBack: () => void
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`
}

function signedClass(value: number): string {
  if (value > 0) {
    return 'profit'
  }
  if (value < 0) {
    return 'loss'
  }
  return 'flat'
}

function signedNumber(value: number): string {
  if (value > 0) {
    return `+${formatNumber(value)}`
  }
  return formatNumber(value)
}

function StockHoldingRow({ holding }: { holding: HoldingStock }) {
  return (
    <tr>
      <td>
        <strong>{holding.stockName}</strong>
        <span>{holding.stockCode}</span>
      </td>
      <td>{formatNumber(holding.quantity)}주</td>
      <td>{formatNumber(holding.averageCost)}원</td>
      <td>{formatNumber(holding.currentPrice)}원</td>
      <td>{formatNumber(holding.purchaseAmount)}원</td>
      <td>{formatNumber(holding.evaluationAmount)}원</td>
      <td className={signedClass(holding.profitOrLoss)}>{signedNumber(holding.profitOrLoss)}원</td>
      <td className={signedClass(holding.profitOrLoss)}>{formatRate(holding.returnRate)}</td>
    </tr>
  )
}

export function PortfolioPage({ onBack }: PortfolioPageProps) {
  const [assets, setAssets] = useState<UserAssetsResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadAssets() {
      setError('')
      setIsLoading(true)
      try {
        const response = await getMyAssets()
        if (isMounted) {
          setAssets(response)
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

    loadAssets()

    return () => {
      isMounted = false
    }
  }, [])

  const holdingCount = assets?.holdingStocks.length ?? 0
  const availableRatio = useMemo(() => {
    if (!assets || assets.cashBalance <= 0) {
      return 0
    }
    return Math.round((assets.availableCashBalance / assets.cashBalance) * 100)
  }, [assets])

  return (
    <main className="portfolio-shell">
      <header className="portfolio-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="뒤로가기">‹</button>
        <div>
          <p className="eyebrow">My Portfolio</p>
          <h1>주식 잔고/손익</h1>
        </div>
        <button className="order-cta current" type="button">예수금</button>
      </header>

      {error && <p className="dashboard-alert">{error}</p>}

      {isLoading ? (
        <section className="portfolio-card empty-board">잔고 정보를 불러오는 중입니다.</section>
      ) : assets ? (
        <>
          <section className="portfolio-controls">
            <div className="account-select">종합매매 계좌</div>
            <button type="button">예수금</button>
            <button type="button">환전</button>
          </section>

          <nav className="portfolio-tabs" aria-label="잔고 메뉴">
            <strong>잔고</strong>
            <span>매매손익</span>
          </nav>

          <section className="portfolio-summary">
            <article className="summary-total">
              <span>총자산</span>
              <strong>{formatNumber(assets.totalAsset)}원</strong>
              <p className={signedClass(assets.totalProfitOrLoss)}>
                {signedNumber(assets.totalProfitOrLoss)}원 · {formatRate(assets.totalReturnRate)}
              </p>
            </article>

            <article>
              <span>매입금액</span>
              <strong>{formatNumber(assets.totalPurchaseAmount)}원</strong>
            </article>
            <article>
              <span>평가금액</span>
              <strong>{formatNumber(assets.totalEvaluationAmount)}원</strong>
            </article>
            <article>
              <span>예수금</span>
              <strong>{formatNumber(assets.cashBalance)}원</strong>
            </article>
            <article>
              <span>주문가능금액</span>
              <strong>{formatNumber(assets.availableCashBalance)}원</strong>
              <em>가용 {availableRatio}%</em>
            </article>
            <article>
              <span>묶인 예수금</span>
              <strong>{formatNumber(assets.lockedCash)}원</strong>
            </article>
          </section>

          <section className="holding-board">
            <div className="holding-heading">
              <div>
                <p className="eyebrow">Holdings</p>
                <h2>보유 종목 {holdingCount}</h2>
              </div>
            </div>

            {assets.holdingStocks.length === 0 ? (
              <div className="empty-board">보유 중인 주식이 없습니다.</div>
            ) : (
              <div className="stock-table-wrap">
                <table className="stock-table holding-table">
                  <thead>
                    <tr>
                      <th>종목명</th>
                      <th>보유수량</th>
                      <th>평균단가</th>
                      <th>현재가</th>
                      <th>매입금액</th>
                      <th>평가금액</th>
                      <th>평가손익</th>
                      <th>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.holdingStocks.map((holding) => (
                      <StockHoldingRow key={holding.stockCode} holding={holding} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
