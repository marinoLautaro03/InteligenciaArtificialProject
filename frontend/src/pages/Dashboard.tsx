import { useClerk, useAuth, useUser } from '@clerk/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../components/ProjectForm';
import { projectsApi, type CreateProjectInput, type Project } from '../lib/api';
import './Dashboard.css';

type FormMode = 'create' | 'edit';

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatRelativeDate = (value: string) => {
  const date = new Date(value);

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export default function Dashboard() {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'Equipo';

  useEffect(() => {
    const loadProjects = async () => {
      setStatus('loading');
      setError('');

      try {
        const items = await projectsApi.list(getToken);
        setProjects(items);
        setStatus('idle');
      } catch (loadError) {
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar los proyectos.');
      }
    };

    void loadProjects();
  }, [getToken]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [projects, search]);

  const openCreateModal = () => {
    setSelectedProject(null);
    setFormMode('create');
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormMode('edit');
  };

  const closeForm = () => {
    if (isSubmitting) {
      return;
    }

    setSelectedProject(null);
    setFormMode(null);
  };

  const handleCreate = async (input: CreateProjectInput) => {
    setIsSubmitting(true);

    try {
      const createdProject = await projectsApi.create(input, getToken);
      setProjects((current) => [createdProject, ...current]);
      setFormMode(null);
      setSelectedProject(null);
      navigate(`/projects/${createdProject.id}/gallery`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (input: CreateProjectInput) => {
    if (!selectedProject) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedProject = await projectsApi.update(selectedProject.id, input, getToken);
      setProjects((current) =>
        current.map((project) => (project.id === updatedProject.id ? updatedProject : project)),
      );
      setFormMode(null);
      setSelectedProject(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`Eliminar "${project.name}"?`);

    if (!confirmed) {
      return;
    }

    setIsDeletingId(project.id);

    try {
      await projectsApi.remove(project.id, getToken);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No pudimos eliminar el proyecto.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const isEmpty = status === 'idle' && projects.length === 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-brand-mark">SC</div>
          <div>
            <div className="dashboard-brand-title">Social Content Studio</div>
            <div className="dashboard-brand-subtitle">Panel de proyectos</div>
          </div>
        </div>

        <div className="dashboard-user-actions">
          <div className="dashboard-user-copy">
            <span className="dashboard-user-label">Sesion activa</span>
            <strong>{displayName}</strong>
          </div>
          <button className="ghost-button" onClick={() => signOut({ redirectUrl: '/login' })}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">Primera parada</p>
            <h1>Tus campanas viven aca.</h1>
            <p className="dashboard-lead">
              Crea proyectos para cada cliente o campana, guarda su contexto y entra directo a la
              galeria de piezas aprobadas.
            </p>
          </div>

          <div className="dashboard-hero-panel">
            <div className="dashboard-hero-metric">
              <span>Proyectos activos</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="dashboard-hero-metric">
              <span>Listos para generar</span>
              <strong>{projects.length > 0 ? 'Si' : 'Empeza creando uno'}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-toolbar">
          <div>
            <h2>Tus proyectos</h2>
            <p>{projects.length} campanas para gestionar contenido, tono y piezas visuales.</p>
          </div>

          <div className="dashboard-toolbar-actions">
            <input
              className="project-input dashboard-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre u objetivo"
            />
            <button className="primary-button" onClick={openCreateModal}>
              Nuevo proyecto
            </button>
          </div>
        </section>

        {status === 'loading' ? <div className="dashboard-feedback">Cargando proyectos...</div> : null}
        {status === 'error' ? <div className="dashboard-feedback dashboard-error-banner">{error}</div> : null}

        {isEmpty ? (
          <section className="dashboard-empty-state">
            <div className="dashboard-empty-card">
              <p className="dashboard-kicker">Happy path</p>
              <h3>Tu lista todavia esta vacia.</h3>
              <p>
                Crea el primer proyecto con el nombre de la campana, una descripcion breve y el
                objetivo principal. Despues te llevamos a la galeria de piezas aprobadas.
              </p>
              <button className="primary-button" onClick={openCreateModal}>
                Crear primer proyecto
              </button>
            </div>
          </section>
        ) : null}

        {!isEmpty && status === 'idle' ? (
          <section className="project-grid">
            {filteredProjects.map((project) => (
              <article key={project.id} className="project-card">
                <button
                  className="project-card-cover"
                  style={{
                    background: project.primaryColor
                      ? `linear-gradient(135deg, ${project.primaryColor}, color-mix(in oklab, ${project.primaryColor} 30%, white))`
                      : undefined,
                  }}
                  onClick={() => navigate(`/projects/${project.id}/gallery`)}
                >
                  {project.logoUrl ? (
                    <img className="project-logo" src={project.logoUrl} alt="" />
                  ) : (
                    <span>{initialsFromName(project.name)}</span>
                  )}
                </button>

                <div className="project-card-body">
                  <div className="project-card-copy">
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>
                  </div>

                  <div className="project-card-meta">
                    <span>Actualizado {formatRelativeDate(project.updatedAt)}</span>
                    <span>{project.status}</span>
                  </div>

                  <div className="project-card-actions">
                    <button className="ghost-button" onClick={() => navigate(`/projects/${project.id}/gallery`)}>
                      Abrir galeria
                    </button>
                    <button className="ghost-button" onClick={() => openEditModal(project)}>
                      Editar
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => handleDelete(project)}
                      disabled={isDeletingId === project.id}
                    >
                      {isDeletingId === project.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <button className="project-create-card" onClick={openCreateModal}>
              <span>+</span>
              <strong>Crear proyecto</strong>
              <p>Nuevo cliente, campana o linea de contenido.</p>
            </button>
          </section>
        ) : null}
      </main>

      {formMode === 'create' ? (
        <ProjectForm key="create" isSubmitting={isSubmitting} onCancel={closeForm} onSubmit={handleCreate} />
      ) : null}

      {formMode === 'edit' ? (
        <ProjectForm
          key={selectedProject ? `edit-${selectedProject.id}` : 'edit'}
          initialValue={selectedProject}
          isSubmitting={isSubmitting}
          onCancel={closeForm}
          onSubmit={handleUpdate}
        />
      ) : null}
    </div>
  );
}
