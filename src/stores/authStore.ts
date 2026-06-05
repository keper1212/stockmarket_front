import { create } from 'zustand'
import type { LoginResponse } from '../types/auth'

type AuthState = {
  accessToken: string | null
  userId: number | null
  isAuthReady: boolean
  setAuth: (response: LoginResponse) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
  markAuthReady: () => void
  logout: () => void
}

function parseUserIdFromAccessToken(accessToken: string): number | null {
  const [, payload] = accessToken.split('.')
  if (!payload) {
    return null
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as { sub?: string }
    return decodedPayload.sub ? Number(decodedPayload.sub) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  isAuthReady: false,
  setAuth: (response) => {
    set({
      accessToken: response.accessToken,
      userId: response.userId,
      isAuthReady: true,
    })
  },
  setAccessToken: (accessToken) => {
    set({
      accessToken,
      userId: parseUserIdFromAccessToken(accessToken),
      isAuthReady: true,
    })
  },
  clearAuth: () => {
    set({ accessToken: null, userId: null, isAuthReady: true })
  },
  markAuthReady: () => {
    set({ isAuthReady: true })
  },
  logout: () => {
    set({ accessToken: null, userId: null, isAuthReady: true })
  },
}))
