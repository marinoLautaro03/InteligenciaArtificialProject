import type { ReactNode } from 'react'
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <div style={{ padding: 32, color: 'var(--fg-muted)' }}>Cargando…</div>
  if (!isSignedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}
