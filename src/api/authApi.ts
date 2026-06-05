import { apiClient, refreshAccessTokenRequest } from './client'
import type {
  EmailCodeResponse,
  EmailCodeVerifyResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
} from '../types/auth'

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', request)
  return response.data
}

export async function requestEmailCode(email: string): Promise<EmailCodeResponse> {
  const response = await apiClient.post<EmailCodeResponse>('/auth/email/request', { email })
  return response.data
}

export async function verifyEmailCode(email: string, code: string): Promise<EmailCodeVerifyResponse> {
  const response = await apiClient.post<EmailCodeVerifyResponse>('/auth/email/verify', { email, code })
  return response.data
}

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await apiClient.post<SignupResponse>('/auth/signup', request)
  return response.data
}

export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  return refreshAccessTokenRequest()
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}
