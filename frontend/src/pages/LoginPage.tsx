import { useState } from 'react'
import { useSignIn, useSignUp, useAuth } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

type AuthMode = 'sign-in' | 'sign-up'

const FLOW_STEPS = [
  { n: '01', label: 'Brief', icon: 'doc' },
  { n: '02', label: 'Red social', icon: 'globe' },
  { n: '03', label: 'Generar', icon: 'spark' },
  { n: '04', label: 'Publicar', icon: 'upload' },
] as const

function StepIcon({ type }: { type: string }) {
  if (type === 'doc') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M5 3.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V5A1.5 1.5 0 0 1 5 3.5Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 7.5h6M7 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'globe') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 10h13M10 3.5c2 2.2 2 10.8 0 13M10 3.5c-2 2.2-2 10.8 0 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'spark') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 2.5l1.2 4.1 4.1 1.2-4.1 1.2L10 13.1 8.8 9 4.7 7.8l4.1-1.2L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M14.5 14.5l1 3.5 3.5-1-1-3.5-3.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5 10 4.5l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4.5v11M6.5 16h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function LoginPage() {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { isLoaded } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')

  const isSignIn = authMode === 'sign-in'

  const switchAuthMode = () => {
    setAuthMode(isSignIn ? 'sign-up' : 'sign-in')
    setError('')
  }

  const loginWithOAuth = async (provider: 'oauth_google' | 'oauth_facebook') => {
    setError('')
    try {
      const auth = isSignIn ? signIn : signUp
      const result = await auth.sso({
        strategy: provider,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/sso-callback`,
      })
      if (result.error) {
        setError(result.error.message ?? 'Error al conectar con el proveedor.')
      }
    } catch {
      setError('Error al conectar con el proveedor. Intentá de nuevo.')
    }
  }

  const registerWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const createResult = await signUp.create({ emailAddress: email, password })
      if (createResult.error) {
        setError(createResult.error.message ?? 'Error al crear la cuenta')
        return
      }
      const finalResult = await signUp.finalize()
      if (finalResult.error) {
        setError(finalResult.error.message ?? 'Error al crear la cuenta')
        return
      }
      navigate('/')
    } catch {
      setError('Error al crear la cuenta. Verificá tus datos e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const createResult = await signIn.create({ identifier: email, password })
      if (createResult.error) {
        setError(createResult.error.message ?? 'Error al iniciar sesión')
        return
      }
      const finalResult = await signIn.finalize()
      if (finalResult.error) {
        setError(finalResult.error.message ?? 'Error al iniciar sesión')
        return
      }
      navigate('/')
    } catch {
      setError('Error al iniciar sesión. Verificá tus datos e intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return <div className="login-loading">Cargando…</div>
  }

  const heading = isSignIn ? 'Iniciá sesión' : 'Creá tu cuenta'
  const subheading = isSignIn
    ? 'Continuá con tu cuenta para acceder a tus proyectos.'
    : 'Registrate para empezar a crear contenido.'
  const submitLabel = loading ? 'Cargando…' : 'Continuar →'
  const toggleLabel = isSignIn ? 'Crear cuenta' : 'Ya tengo cuenta'

  return (
    <div className="login-page">
      {/* Left column — hero */}
      <div className="login-hero">
        <div className="brand">
          <div style={{
            width: 32,
            height: 32,
            background: 'var(--fg)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 6,
            flexShrink: 0,
          }}>
            SC
          </div>
          <div>
            <div style={{ fontSize: 'var(--t-base)', fontWeight: 600, color: 'var(--fg)' }}>
              Social Content Studio
            </div>
            <div style={{
              fontSize: 'var(--t-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg-soft)',
              letterSpacing: '0.08em',
            }}>
              v0.1 · MVP
            </div>
          </div>
        </div>

        <div className="pitch">
          <h1>
            Brief corto. <em>Post listo para publicar.</em>
          </h1>
          <p className="pitch-copy">
            Generá contenido para redes sociales a partir de un brief simple.
            Elegí la red, el tono y el formato — el estudio hace el resto.
          </p>
          <div className="flow" aria-label="Proceso en 4 pasos">
            <p className="flow-heading">Cómo funciona</p>
            <div className="flow-steps">
              {FLOW_STEPS.map((step, index) => (
                <div key={step.n} className="flow-step">
                  <div className="flow-step-marker">
                    <span className="flow-step-icon">
                      <StepIcon type={step.icon} />
                    </span>
                    <span className="flow-step-n">{step.n}</span>
                  </div>
                  <span className="flow-step-label">{step.label}</span>
                  {index < FLOW_STEPS.length - 1 && (
                    <span className="flow-connector" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="footer">© 2026 · hecho con cuidado</div>
      </div>

      {/* Right column — form */}
      <div className="login-form">
        <div className="clerk-card">
          <div>
            <h2>{heading}</h2>
            <div className="sub">{subheading}</div>
          </div>

          <div className="oauth">
            <button className="oauth-btn" onClick={() => loginWithOAuth('oauth_google')}>
              <svg className="ico" viewBox="0 0 16 16" fill="none">
                <path d="M14.5 8.2c0-.5 0-.9-.1-1.3H8v2.5h3.7c-.2.9-.7 1.6-1.4 2.1v1.7h2.3c1.3-1.2 2-3 2-5Z" fill="#4285F4"/>
                <path d="M8 14.5c1.9 0 3.5-.6 4.6-1.7l-2.3-1.7c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.2-4-2.9H1.5v1.8C2.7 13 5.2 14.5 8 14.5Z" fill="#34A853"/>
                <path d="M4 8.9c-.1-.4-.2-.8-.2-1.2 0-.4.1-.8.2-1.2V4.7H1.5A7.5 7.5 0 0 0 .5 8.2c0 1.2.3 2.3.8 3.3L4 9.7v-.8Z" fill="#FBBC05"/>
                <path d="M8 3.5c1 0 1.9.4 2.6 1l1.9-1.9A6.6 6.6 0 0 0 8 .9 7.5 7.5 0 0 0 1.5 4.7L4 6.5C4.6 4.8 6.2 3.5 8 3.5Z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
            <button className="oauth-btn" onClick={() => loginWithOAuth('oauth_facebook')}>
              <svg className="ico" viewBox="0 0 16 16" fill="#1877F2">
                <path d="M16 8A8 8 0 1 0 6.75 15.9v-5.6H4.72V8h2.03V6.24c0-2 1.19-3.1 3.01-3.1.87 0 1.78.16 1.78.16v1.96h-1c-.99 0-1.3.61-1.3 1.24V8h2.22l-.36 2.3h-1.86V16A8 8 0 0 0 16 8Z"/>
              </svg>
              Continuar con Facebook
            </button>
          </div>

          <div className="divider">o con email</div>

          <form
            onSubmit={isSignIn ? loginWithEmail : registerWithEmail}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div className="field">
              <input
                className="input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <input
                className="input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {submitLabel}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={switchAuthMode}
              disabled={loading}
            >
              {toggleLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
