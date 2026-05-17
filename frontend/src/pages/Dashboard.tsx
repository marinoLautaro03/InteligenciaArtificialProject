import { useAuth } from '@clerk/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../components/ProjectForm';
import { useProjects } from '../context/ProjectsContext';
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(value));

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { projects, status, error, setProjects } = useProjects();

  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openKebabId, setOpenKebabId] = useState<number | null>(null);

  useEffect(() => {
    if (!openKebabId) return;
    const close = () => setOpenKebabId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openKebabId]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
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
    if (isSubmitting) return;
    setSelectedProject(null);
    setFormMode(null);
  };

  const handleCreate = async (input: CreateProjectInput) => {
    setIsSubmitting(true);
    try {
      const created = await projectsApi.create(input, getToken);
      setProjects((current) => [created, ...current]);
      setFormMode(null);
      navigate(`/projects/${created.id}/gallery`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (input: CreateProjectInput) => {
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      const updated = await projectsApi.update(selectedProject.id, input, getToken);
      setProjects((current) =>
        current.map((p) => (p.id === updated.id ? updated : p)),
      );
      setFormMode(null);
      setSelectedProject(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`¿Eliminar "${project.name}"?`);
    if (!confirmed) return;
    setIsDeletingId(project.id);
    try {
      await projectsApi.remove(project.id, getToken);
      setProjects((current) => current.filter((p) => p.id !== project.id));
    } finally {
      setIsDeletingId(null);
    }
  };

  const isEmpty = status === 'idle' && projects.length === 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tus proyectos</h1>
          <p className="page-sub">
            {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} · cada proyecto agrupa posts y ajustes de marca.
          </p>
        </div>
        <div className="row">
          <input
            className="input dashboard-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
          />
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Nuevo proyecto
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="dashboard-feedback">Cargando proyectos...</div>
      ) : null}

      {status === 'error' ? (
        <div className="error-banner">{error}</div>
      ) : null}

      {isEmpty ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-card">
            <h3>Tu lista todavía está vacía.</h3>
            <p>
              Crea el primer proyecto con el nombre de la campaña, una descripción breve y el
              objetivo principal.
            </p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Crear primer proyecto
            </button>
          </div>
        </div>
      ) : null}

      {!isEmpty && status === 'idle' ? (
        <section className="project-grid">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}/gallery`)}
            >
              <div
                className="project-cover"
                style={
                  project.primaryColor
                    ? {
                        background: `linear-gradient(135deg, ${project.primaryColor}, color-mix(in oklab, ${project.primaryColor} 30%, white))`,
                      }
                    : undefined
                }
              >
                {project.logoUrl ? (
                  <img className="project-logo" src={project.logoUrl} alt="" />
                ) : (
                  <span className="glyph">{initialsFromName(project.name)}</span>
                )}
              </div>

              <div className="project-card-body">
                <div className="project-card-header">
                  <span className="name">{project.name}</span>
                  <div
                    className="project-kebab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() =>
                        setOpenKebabId(openKebabId === project.id ? null : project.id)
                      }
                    >
                      ⋮
                    </button>
                    {openKebabId === project.id && (
                      <div className="project-kebab-menu">
                        <button
                          className="kebab-item"
                          onClick={() => {
                            openEditModal(project);
                            setOpenKebabId(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="kebab-item kebab-item-danger"
                          onClick={() => {
                            void handleDelete(project);
                            setOpenKebabId(null);
                          }}
                          disabled={isDeletingId === project.id}
                        >
                          {isDeletingId === project.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="desc">{project.description}</p>

                <div className="meta">
                  <span>{project.postCount} posts</span>
                  <span>·</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </div>
            </article>
          ))}

          <button className="project-create-card" onClick={openCreateModal}>
            <span className="plus">+</span>
            <strong>Crear proyecto</strong>
            <p>Nuevo cliente, campaña o línea de contenido.</p>
          </button>
        </section>
      ) : null}

      {formMode === 'create' ? (
        <ProjectForm
          key="create"
          isSubmitting={isSubmitting}
          onCancel={closeForm}
          onSubmit={handleCreate}
        />
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
    </>
  );
}
