import { useState } from 'react';
import type { CreateProjectInput, Project } from '../lib/api';
import { toErrorMessage, useToast } from '../context/ToastContext';

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
  if (!project) return emptyState;
  return {
    name: project.name,
    description: project.description,
    logoUrl: project.logoUrl ?? '',
    primaryColor: project.primaryColor ?? '#D97706',
  };
};

export default function ProjectForm({ initialValue, isSubmitting, onCancel, onSubmit }: ProjectFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValue));
  const [logoPreview, setLogoPreview] = useState('');
  const { showError } = useToast();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('El archivo debe ser una imagen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((s) => ({ ...s, logoUrl: dataUrl }));
      setLogoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submitLabel = initialValue ? 'Guardar cambios' : 'Crear proyecto';
  const title = initialValue ? 'Editar proyecto' : 'Crear proyecto';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const input: CreateProjectInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        primaryColor: form.primaryColor.trim() || undefined,
      };
      if (!initialValue && form.logoUrl) {
        input.logoUrl = form.logoUrl;
      }
      await onSubmit(input);
    } catch (err) {
      showError(toErrorMessage(err, 'No pudimos guardar el proyecto.'));
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="project-form-title">{title}</h2>
            <p className="modal-sub">Defini el nombre y el proposito de la campana para empezar a generar contenido.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cerrar
          </button>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <label className="project-field">
            <span>Nombre del proyecto</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Lanzamiento otono 2026"
              required
            />
          </label>

          <label className="project-field">
            <span>Descripcion y objetivo</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Que campana es, a quien le habla y que queres lograr."
              rows={5}
              required
            />
          </label>

          <div className="project-form-grid">
            {!initialValue ? (
              <label className="project-field">
                <span>Logo</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                )}
              </label>
            ) : null}

            <label className="project-field">
              <span>Color principal</span>
              <div className="project-color-row">
                <input
                  className="project-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                />
                <input
                  className="input"
                  value={form.primaryColor}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#D97706"
                />
              </div>
            </label>
          </div>

          <div className="project-form-actions">
            <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
