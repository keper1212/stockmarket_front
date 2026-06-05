import { apiClient } from './client'
import type {
  OrderCancelResponse,
  OrderCreateRequest,
  OrderCreateResponse,
  OrderHistoryResponse,
} from '../types/order'

export async function createOrder(request: OrderCreateRequest): Promise<OrderCreateResponse> {
  const response = await apiClient.post<OrderCreateResponse>('/orders', request)
  return response.data
}

export async function getMyOrderHistory(): Promise<OrderHistoryResponse> {
  const response = await apiClient.get<OrderHistoryResponse>('/orders/me')
  return response.data
}

export async function cancelOrder(orderId: string, clientCancelId: string): Promise<OrderCancelResponse> {
  const response = await apiClient.post<OrderCancelResponse>(`/orders/${orderId}/cancel`, { clientCancelId })
  return response.data
}
