export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  userId: number
  accessToken: string
  message: string
}

export type SignupRequest = {
  email: string
  password: string
  name: string
}

export type SignupResponse = {
  userId: number
  message: string
}

export type RefreshTokenResponse = {
  accessToken: string
  message: string
}

export type EmailCodeResponse = {
  message: string
  expiresInSeconds: number
}

export type EmailCodeVerifyResponse = {
  message: string
}

export type ApiErrorResponse = {
  message?: string
  error?: string
}
