import type { ReactNode } from 'react';
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ProjectGallery from './pages/ProjectGallery';

function PublicRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/gallery"
        element={
          <ProtectedRoute>
            <ProjectGallery />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
