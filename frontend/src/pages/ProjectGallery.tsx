import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import heroImage from '../assets/hero.png';
import { projectsApi, type Project } from '../lib/api';
import './Dashboard.css';

type ApprovedAsset = {
  id: string;
  socialNetwork: string;
  title: string;
  description: string;
};

const approvedAssets: ApprovedAsset[] = [
  {
    id: 'instagram-1',
    socialNetwork: 'Instagram',
    title: 'Carrusel de producto',
    description: 'Visual calido para awareness con copy breve y CTA orientado a guardados.',
  },
  {
    id: 'linkedin-1',
    socialNetwork: 'LinkedIn',
    title: 'Post institucional',
    description: 'Imagen editorial para comunicar proposito de campana y valor para la comunidad.',
  },
  {
    id: 'facebook-1',
    socialNetwork: 'Facebook',
    title: 'Pieza promocional',
    description: 'Formato ancho pensado para promocion de evento o lanzamiento con foco local.',
  },
];

export default function ProjectGallery() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProject = async () => {
      const id = Number(projectId);

      if (!Number.isInteger(id) || id <= 0) {
        setStatus('error');
        setError('Proyecto invalido.');
        return;
      }

      setStatus('loading');
      setError('');

      try {
        const item = await projectsApi.getById(id, getToken);
        setProject(item);
        setStatus('idle');
      } catch (loadError) {
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la galeria.');
      }
    };

    void loadProject();
  }, [getToken, projectId]);

  return (
    <div className="dashboard-page">
      <main className="dashboard-main gallery-shell">
        <div className="gallery-topbar">
          <Link className="ghost-button" to="/">
            Volver a proyectos
          </Link>
        </div>

        {status === 'loading' ? <div className="dashboard-feedback">Cargando galeria...</div> : null}
        {status === 'error' ? <div className="dashboard-feedback dashboard-error-banner">{error}</div> : null}

        {project && status === 'idle' ? (
          <>
            <section className="gallery-intro">
              <div>
                <p className="dashboard-kicker">Galeria aprobada</p>
                <h1>{project.name}</h1>
                <p>{project.description}</p>
              </div>

              <aside className="gallery-summary-card">
                <span>Estado</span>
                <strong>{project.status}</strong>
                <small>Estas piezas son la base visual aprobada para cada red social.</small>
              </aside>
            </section>

            <section className="gallery-lead-card">
              <img src={heroImage} alt="" />
              <div>
                <h2>Banco inicial de imagenes</h2>
                <p>
                  Esta vista ya esta lista para mostrar pares de imagen y descripcion aprobados por
                  canal. Hoy carga una seleccion de referencia mientras el modulo de generacion se conecta.
                </p>
              </div>
            </section>

            <section className="gallery-grid">
              {approvedAssets.map((asset) => (
                <article key={asset.id} className="gallery-card">
                  <img src={heroImage} alt="" />
                  <div className="gallery-card-body">
                    <span>{asset.socialNetwork}</span>
                    <h3>{asset.title}</h3>
                    <p>{asset.description}</p>
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
