import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { ApiErrorResponse, RefreshTokenResponse } from '../types/auth'

const API_BASE_URL = '/api/v1'

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<RefreshTokenResponse> | null = null

export async function refreshAccessTokenRequest(): Promise<RefreshTokenResponse> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshTokenResponse>('/auth/refresh')
      .then((response) => response.data)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url?.startsWith('/auth/'))
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const response = await refreshAccessTokenRequest()
      useAuthStore.getState().setAccessToken(response.accessToken)
      originalRequest.headers.Authorization = `Bearer ${response.accessToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clearAuth()
      return Promise.reject(refreshError)
    }
  },
)

export function resolveApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return (
      axiosError.response?.data?.message ??
      axiosError.response?.data?.error ??
      axiosError.message ??
      '요청 처리 중 오류가 발생했습니다.'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return '요청 처리 중 오류가 발생했습니다.'
}
