export type HoldingStock = {
  stockCode: string
  stockName: string
  quantity: number
  averageCost: number
  purchaseAmount: number
  currentPrice: number
  evaluationAmount: number
  profitOrLoss: number
  returnRate: number
}

export type UserAssetsResponse = {
  totalAsset: number
  cashBalance: number
  availableCashBalance: number
  lockedCash: number
  totalPurchaseAmount: number
  totalEvaluationAmount: number
  totalProfitOrLoss: number
  totalReturnRate: number
  holdingStocks: HoldingStock[]
}
