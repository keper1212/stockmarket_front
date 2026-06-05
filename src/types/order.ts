export type OrderType = 'BUY' | 'SELL'

export type OrderCreateRequest = {
  clientOrderId: string
  stockCode: string
  orderType: OrderType
  price: number
  quantity: number
}

export type OrderCreateResponse = {
  orderId: string
  message: string
  acceptedAt: string
}

export type OrderCancelResponse = {
  orderId: string
  message: string
  cancelRequestedAt: string
}

export type OrderStatus =
  | 'ACCEPTED'
  | 'PARTIALLY_FILLED'
  | 'CANCEL_REQUESTED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED'

export type OrderHistoryOrder = {
  orderId: string
  stockCode: string
  stockName: string
  orderType: OrderType
  price: number
  quantity: number
  remainingQuantity: number
  executedQuantity: number
  status: OrderStatus
  acceptedAt: string
}

export type OrderHistoryTrade = {
  tradeId: number
  stockCode: string
  stockName: string
  orderType: OrderType
  orderId: string
  tradePrice: number
  tradeQuantity: number
  tradeAmount: number
  executedAt: string
}

export type OrderHistoryResponse = {
  orders: OrderHistoryOrder[]
  trades: OrderHistoryTrade[]
}
