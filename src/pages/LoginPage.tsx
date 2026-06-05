import { useState, type FormEvent } from 'react'
import { login } from '../api/authApi'
import { resolveApiError } from '../api/client'
import { useAuthStore } from '../stores/authStore'

type LoginPageProps = {
  onMoveToSignup: () => void
}

export function LoginPage({ onMoveToSignup }: LoginPageProps) {
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const response = await login({ email, password })
      setAuth(response)
      setMessage(response.message)
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="eyebrow">Member Access</div>
      <h1 id="login-title">시장에 접속하기</h1>
      <p className="auth-copy">실시간 호가와 체결 흐름을 확인하려면 계정으로 로그인하세요.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="test@example.com"
            required
          />
        </label>

        <label>
          비밀번호
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="8자 이상 입력"
            required
          />
        </label>

        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}

        <button className="primary-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <button className="text-action" type="button" onClick={onMoveToSignup}>
        계정이 없으면 회원가입
      </button>
    </section>
  )
}
