import { useState, type FormEvent } from 'react'
import { requestEmailCode, signup, verifyEmailCode } from '../api/authApi'
import { resolveApiError } from '../api/client'

type SignupPageProps = {
  onMoveToLogin: () => void
}

export function SignupPage({ onMoveToLogin }: SignupPageProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequestCode = async () => {
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const response = await requestEmailCode(email)
      setIsCodeSent(true)
      setMessage(`${response.message} 유효시간: ${Math.floor(response.expiresInSeconds / 60)}분`)
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async () => {
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const response = await verifyEmailCode(email, code)
      setIsVerified(true)
      setMessage(response.message)
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!isVerified) {
      setError('이메일 인증을 먼저 완료해주세요.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await signup({ email, password, name })
      setMessage(response.message)
      setTimeout(onMoveToLogin, 700)
    } catch (requestError) {
      setError(resolveApiError(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card signup-card" aria-labelledby="signup-title">
      <div className="eyebrow">Create Account</div>
      <h1 id="signup-title">모의 투자 계정 만들기</h1>
      <p className="auth-copy">이메일 인증 후 가입하면 가상 예수금으로 거래를 시작할 수 있습니다.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이메일
          <div className="inline-control">
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setIsCodeSent(false)
                setIsVerified(false)
              }}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <button type="button" className="secondary-action" onClick={handleRequestCode} disabled={!email || isSubmitting}>
              인증 요청
            </button>
          </div>
        </label>

        <label>
          인증번호
          <div className="inline-control">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="6자리 코드"
              disabled={!isCodeSent || isVerified}
              required
            />
            <button type="button" className="secondary-action" onClick={handleVerifyCode} disabled={!isCodeSent || code.length !== 6 || isVerified || isSubmitting}>
              인증 확인
            </button>
          </div>
        </label>

        <label>
          이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            autoComplete="name"
            placeholder="대시보드에 표시할 이름"
            maxLength={50}
          />
        </label>

        <label>
          비밀번호
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="8자 이상"
            required
          />
        </label>

        <label>
          비밀번호 확인
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="한 번 더 입력"
            required
          />
        </label>

        {error && <p className="form-message error">{error}</p>}
        {message && <p className="form-message success">{message}</p>}

        <button className="primary-action" type="submit" disabled={isSubmitting || !isVerified}>
          {isSubmitting ? '처리 중...' : '회원가입'}
        </button>
      </form>

      <button className="text-action" type="button" onClick={onMoveToLogin}>
        이미 계정이 있으면 로그인
      </button>
    </section>
  )
}
