export type ChangeDirection = 'RISE' | 'FALL' | 'EVEN'

export type StockSummary = {
  stockCode: string
  stockName: string
  currentPrice: number
  changeDirection: ChangeDirection
  changePrice: number
  changeRate: number
  tradeVolume: number
  tradeAmount: number
}

export type StocksResponse = {
  stocks: StockSummary[]
}

export type OrderBookLevel = {
  price: number
  quantity: number
}

export type OrderBookResponse = {
  stockCode: string
  currentPrice: number
  askOrders: OrderBookLevel[]
  bidOrders: OrderBookLevel[]
}
