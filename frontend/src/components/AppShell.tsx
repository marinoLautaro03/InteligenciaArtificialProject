import { useState, useEffect } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom';
import { ProjectsProvider, useProjects } from '../context/ProjectsContext';
import { Sun, Moon } from './Icons';

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

function ShellContent() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { projects } = useProjects();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSidebarOpen(false), 0);
    return () => clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId
    ? Number(projectMatch.params.projectId)
    : null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const displayName = user?.firstName ?? user?.username ?? '';
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const userInitials = initialsFromName(displayName || displayEmail) || '?';

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">SC</div>
          <div>
            <div className="brand-name">Social Content Studio</div>
            <div className="brand-sub">v0.1 · MVP</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">General</div>
          <Link to="/" className={`nav-item${!activeProject ? ' active' : ''}`}>
            Proyectos
            <span className="count">{projects.length}</span>
          </Link>
        </div>

        {activeProject && (
          <div className="nav-section">
            <div className="nav-label">{activeProject.name}</div>
            <Link
              to={`/projects/${activeProject.id}/gallery`}
              className={`nav-item${location.pathname.endsWith('/gallery') ? ' active' : ''}`}
            >
              Galería
            </Link>
            <Link
              to={`/projects/${activeProject.id}/generator`}
              className={`nav-item${location.pathname.endsWith('/generator') ? ' active' : ''}`}
            >
              Generador
            </Link>
          </div>
        )}

        {projects.length > 0 && (
          <div className="nav-section">
            <div className="nav-label">Acceso rápido</div>
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}/gallery`}
                className={`nav-item${activeProjectId === p.id ? ' active' : ''}`}
              >
                <span className="project-glyph">{initialsFromName(p.name)}</span>
                {p.name}
              </Link>
            ))}
          </div>
        )}

        <div className="spacer" />

        <button
          className="btn btn-ghost btn-icon theme-toggle"
          onClick={() => setDark((d) => !d)}
          title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="user-card">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-meta">
            <div className="name">{displayName}</div>
            <div className="email">{displayEmail}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowLogoutConfirm(true)}
            title="Cerrar sesión"
          >
            ✕
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main">
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <nav className="crumbs">
            {!activeProject ? (
              <span className="current">Proyectos</span>
            ) : (
              <>
                <Link to="/">Proyectos</Link>
                <span className="sep">/</span>
                <span className="current">{activeProject.name}</span>
              </>
            )}
          </nav>
        </div>
        <div className="content">
          <div className="content-inner">
            <Outlet />
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>
              Cerrar sesión
            </h2>
            <p style={{ marginBottom: '20px', color: 'var(--fg-secondary)' }}>
              ¿Está seguro que quiere cerrar sesión?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ padding: '8px 16px' }}
              >
                Cancelar
              </button>
              <button
                className="btn"
                onClick={() => void signOut({ redirectUrl: '/login' })}
                style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  return (
    <ProjectsProvider>
      <ShellContent />
    </ProjectsProvider>
  );
}
