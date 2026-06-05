import { apiClient } from './client'
import type { UserAssetsResponse } from '../types/portfolio'

export async function getMyAssets(): Promise<UserAssetsResponse> {
  const response = await apiClient.get<UserAssetsResponse>('/users/me/assets')
  return response.data
}
