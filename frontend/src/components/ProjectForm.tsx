import { useState } from 'react';
import type { CreateProjectInput, Project } from '../lib/api';

type ProjectFormProps = {
  initialValue?: Project | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
};

const emptyState: FormState = {
  name: '',
  description: '',
  logoUrl: '',
  primaryColor: '#D97706',
};

const toFormState = (project?: Project | null): FormState => {
  if (!project) {
    return emptyState;
  }

  return {
    name: project.name,
    description: project.description,
    logoUrl: project.logoUrl ?? '',
    primaryColor: project.primaryColor ?? '#D97706',
  };
};

export default function ProjectForm({ initialValue, isSubmitting, onCancel, onSubmit }: ProjectFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValue));
  const [error, setError] = useState('');

  const submitLabel = initialValue ? 'Guardar cambios' : 'Crear proyecto';
  const title = initialValue ? 'Editar proyecto' : 'Crear proyecto';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        primaryColor: form.primaryColor.trim() || undefined,
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No pudimos guardar el proyecto.');
    }
  };

  return (
    <div className="project-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-modal-header">
          <div>
            <h2 id="project-form-title">{title}</h2>
            <p>Defini el nombre y el proposito de la campana para empezar a generar contenido.</p>
          </div>
          <button className="ghost-button" type="button" onClick={onCancel}>
            Cerrar
          </button>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <label className="project-field">
            <span>Nombre del proyecto</span>
            <input
              className="project-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Lanzamiento otono 2026"
              required
            />
          </label>

          <label className="project-field">
            <span>Descripcion y objetivo</span>
            <textarea
              className="project-textarea"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Que campana es, a quien le habla y que queres lograr."
              rows={5}
              required
            />
          </label>

          <div className="project-form-grid">
            <label className="project-field">
              <span>Logo URL</span>
              <input
                className="project-input"
                type="url"
                value={form.logoUrl}
                onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            <label className="project-field">
              <span>Color principal</span>
              <div className="project-color-row">
                <input
                  className="project-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))}
                />
                <input
                  className="project-input"
                  value={form.primaryColor}
                  onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#D97706"
                />
              </div>
            </label>
          </div>

          {error ? <div className="project-error">{error}</div> : null}

          <div className="project-form-actions">
            <button className="ghost-button" type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
