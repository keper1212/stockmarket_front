import { apiClient } from './client'
import type { OrderBookResponse, StockChartResponse, StocksResponse } from '../types/market'

export async function getStocks(): Promise<StocksResponse> {
  const response = await apiClient.get<StocksResponse>('/stocks')
  return response.data
}

export async function getOrderBook(stockCode: string): Promise<OrderBookResponse> {
  const response = await apiClient.get<OrderBookResponse>(`/stocks/${stockCode}/orderbook`)
  return response.data
}


export async function getStockChart(stockCode: string): Promise<StockChartResponse> {
  const response = await apiClient.get<StockChartResponse>(`/stocks/${stockCode}/chart`)
  return response.data
}
