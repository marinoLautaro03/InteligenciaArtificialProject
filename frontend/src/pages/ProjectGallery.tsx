import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type Post, type Project } from '../lib/api';
import './ProjectGallery.css';

const socialNames: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const socialColors: Record<string, string> = {
  instagram: '#E4405F',
  x: '#000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
};

export default function ProjectGallery() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');

  const numericId = Number(projectId);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setStatus('error');
        setError('Proyecto inválido.');
        return;
      }
      setStatus('loading');
      setError('');
      try {
        const [item, postList] = await Promise.all([
          projectsApi.getById(numericId, getToken),
          postsApi.list(numericId, getToken),
        ]);
        setProject(item);
        setPosts(postList);
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No pudimos cargar la galería.');
      }
    };
    void loadData();
  }, [getToken, numericId]);

  if (status === 'loading') {
    return <div className="dashboard-feedback">Cargando galería…</div>;
  }

  if (status === 'error') {
    return <div className="error-banner">{error}</div>;
  }

  if (!project) return null;

  return (
    <>
      <section className="gallery-intro">
        <div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <aside className="gallery-summary-card">
          <span>Posts aprobados</span>
          <strong>{posts.length}</strong>
          <small>Estas piezas son la base visual aprobada para cada red social.</small>
          <Link
            to={`/projects/${numericId}/generator`}
            className="btn btn-primary"
            style={{ marginTop: 12 }}
          >
            Generar post
          </Link>
        </aside>
      </section>

      {posts.length === 0 ? (
        <div className="gallery-empty-state">
          <div className="gallery-empty-card">
            <h3>Todavía no hay posts generados.</h3>
            <p>Crea el primer post describiendo qué necesitás y seleccionando una red social.</p>
            <Link to={`/projects/${numericId}/generator`} className="btn btn-primary">
              Generar primer post
            </Link>
          </div>
        </div>
      ) : (
        <section className="gallery-grid">
          {posts.map((post) => (
            <article key={post.id} className="gallery-card">
              <img src={post.imageUrl} alt="" />
              <div className="gallery-card-body">
                <span
                  className="gallery-card-network"
                  style={{ color: socialColors[post.socialMedia] }}
                >
                  {socialNames[post.socialMedia]}
                </span>
                <p className="gallery-card-text">{post.text}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
