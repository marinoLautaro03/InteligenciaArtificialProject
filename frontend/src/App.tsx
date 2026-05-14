import type { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/react'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

function PublicRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (isSignedIn) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
