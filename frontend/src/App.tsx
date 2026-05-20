import type { ReactNode } from 'react';
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
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
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/projects/:projectId/gallery" element={<ProjectGallery />} />
        <Route path="/projects/:projectId/generator" element={<Generator />} />
        <Route path="/projects/:projectId/posts/:postId/edit" element={<Generator />} />
      </Route>
    </Routes>
  );
}
