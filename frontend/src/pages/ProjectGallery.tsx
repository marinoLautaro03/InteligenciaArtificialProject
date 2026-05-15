import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GeneratePostInput, type Post, type Project } from '../lib/api';
import './Dashboard.css';

const socialNames: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
};

const socialColors: Record<string, string> = {
  instagram: '#E4405F',
  x: '#000',
  facebook: '#1877F2',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: '#fffdf9',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#000',
  color: '#fff',
  borderColor: '#000',
};

export default function ProjectGallery() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<GeneratePostInput>({
    socialMedia: 'instagram',
    description: '',
  });

  const numericId = Number(projectId);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setStatus('error');
        setError('Proyecto invalido.');
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
      } catch (loadError) {
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la galeria.');
      }
    };

    void loadData();
  }, [getToken, projectId, numericId]);

  const openGenerate = () => {
    setFormData({ socialMedia: 'instagram', description: '' });
    setGeneratedPost(null);
    setShowModal(true);
  };

  const handleGenerate = async () => {
    if (!formData.description.trim()) return;
    setGenerating(true);
    setGeneratedPost(null);

    try {
      const post = await postsApi.generate(numericId, formData, getToken);
      setGeneratedPost(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId: number) => {
    try {
      const approved = await postsApi.approve(numericId, postId, getToken);
      setPosts((current) => [approved, ...current]);
      setGeneratedPost(null);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar.');
    }
  };

  return (
    <div className="dashboard-page">
      <main className="dashboard-main gallery-shell">
        <div className="gallery-topbar">
          <Link className="ghost-button" to="/">
            Volver a proyectos
          </Link>
        </div>

        {status === 'loading' ? (
          <div className="dashboard-feedback">Cargando galeria...</div>
        ) : null}
        {status === 'error' ? (
          <div className="dashboard-feedback dashboard-error-banner">{error}</div>
        ) : null}

        {project && status === 'idle' ? (
          <>
            <section className="gallery-intro">
              <div>
                <p className="dashboard-kicker">Galeria aprobada</p>
                <h1>{project.name}</h1>
                <p>{project.description}</p>
              </div>
              <aside className="gallery-summary-card">
                <span>Posts aprobados</span>
                <strong>{posts.length}</strong>
                <small>Estas piezas son la base visual aprobada para cada red social.</small>
                <button className="primary-button" style={{ marginTop: 12 }} onClick={openGenerate}>
                  Generar post
                </button>
              </aside>
            </section>

            {posts.length === 0 ? (
              <section className="dashboard-empty-state">
                <div className="dashboard-empty-card">
                  <p className="dashboard-kicker">Galeria vacia</p>
                  <h3>Nothing here :( Generate your first post!</h3>
                  <p>
                    Crea tu primer post describiendo que necesitas y seleccionando una red social.
                  </p>
                  <button className="primary-button" onClick={openGenerate}>
                    Generar post
                  </button>
                </div>
              </section>
            ) : (
              <section className="gallery-grid">
                {posts.map((post) => (
                  <article key={post.id} className="gallery-card">
                    <img
                      src={post.imageUrl}
                      alt=""
                      style={{ width: '100%', height: 200, objectFit: 'cover' }}
                    />
                    <div className="gallery-card-body">
                      <span
                        style={{
                          color: socialColors[post.socialMedia],
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {socialNames[post.socialMedia]}
                      </span>
                      <p style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
                        {post.text}
                      </p>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : null}
      </main>

      {showModal ? (
        <div
          className="project-modal-backdrop"
          onClick={() => { if (!generating) setShowModal(false); }}
        >
          <div className="project-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {generatedPost ? (
              <>
                <h2 style={{ margin: 0 }}>Post generado</h2>
                <div style={{ marginTop: 16 }}>
                  <img
                    src={generatedPost.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: 220,
                      objectFit: 'cover',
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ marginTop: 12 }}>
                    <span
                      style={{
                        color: socialColors[generatedPost.socialMedia],
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {socialNames[generatedPost.socialMedia]}
                    </span>
                    <p
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {generatedPost.text}
                    </p>
                  </div>
                </div>
                <div
                  className="project-modal-header"
                  style={{ marginTop: 20, marginBottom: 0, justifyContent: 'flex-end' }}
                >
                  <button
                    className="ghost-button"
                    onClick={() => { setShowModal(false); setGeneratedPost(null); }}
                  >
                    Descartar
                  </button>
                  <button className="primary-button" onClick={() => handleApprove(generatedPost.id)}>
                    Aprobar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="project-modal-header">
                  <h2 style={{ margin: 0 }}>Generar nuevo post</h2>
                </div>

                <div className="project-form">
                  <div className="project-field">
                    <label>Red social</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['instagram', 'x', 'facebook'] as const).map((platform) => (
                        <button
                          key={platform}
                          style={formData.socialMedia === platform ? activeButtonStyle : buttonStyle}
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, socialMedia: platform }))
                          }
                        >
                          {socialNames[platform]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="project-field">
                    <label>Descripcion</label>
                    <textarea
                      className="project-input"
                      style={{ width: '100%', minHeight: 100, resize: 'vertical' }}
                      placeholder="Describi que necesitas para el post..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </div>

                  <div
                    className="project-modal-header"
                    style={{ marginTop: 4, marginBottom: 0, justifyContent: 'flex-end' }}
                  >
                    <button className="ghost-button" onClick={() => setShowModal(false)} disabled={generating}>
                      Cancelar
                    </button>
                    <button
                      className="primary-button"
                      onClick={handleGenerate}
                      disabled={generating || !formData.description.trim()}
                    >
                      {generating ? 'Generando...' : 'Generar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
