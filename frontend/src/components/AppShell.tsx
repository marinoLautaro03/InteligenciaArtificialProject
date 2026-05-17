import { useClerk, useUser } from '@clerk/react';
import { Link, Outlet, useMatch } from 'react-router-dom';
import { ProjectsProvider, useProjects } from '../context/ProjectsContext';

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

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId
    ? Number(projectMatch.params.projectId)
    : null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const displayName = user?.firstName ?? user?.username ?? '';
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const userInitials = initialsFromName(displayName || displayEmail);

  return (
    <div className="app">
      <aside className="sidebar">
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
              className="nav-item active"
            >
              Galería
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

        <div className="user-card">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-meta">
            <div className="name">{displayName}</div>
            <div className="email">{displayEmail}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => void signOut({ redirectUrl: '/login' })}
            title="Cerrar sesion"
          >
            ✕
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
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
