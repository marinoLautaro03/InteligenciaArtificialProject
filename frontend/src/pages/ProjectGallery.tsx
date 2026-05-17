import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GeneratePostInput, type Post, type Project } from '../lib/api';
import './ProjectGallery.css';

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
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No pudimos cargar la galeria.');
      }
    };
    void loadData();
  }, [getToken, numericId]);

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

  if (status === 'loading') {
    return <div className="dashboard-feedback">Cargando galeria...</div>;
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
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openGenerate}>
            Generar post
          </button>
        </aside>
      </section>

      {posts.length === 0 ? (
        <div className="gallery-empty-state">
          <div className="gallery-empty-card">
            <h3>Todavia no hay posts generados.</h3>
            <p>Crea el primer post describiendo que necesitas y seleccionando una red social.</p>
            <button className="btn btn-primary" onClick={openGenerate}>
              Generar primer post
            </button>
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

      {showModal ? (
        <div
          className="modal-backdrop"
          onClick={() => { if (!generating) setShowModal(false); }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {generatedPost ? (
              <>
                <div className="modal-header">
                  <h2>Post generado</h2>
                </div>
                <img
                  src={generatedPost.imageUrl}
                  alt=""
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8 }}
                />
                <div style={{ marginTop: 12 }}>
                  <span
                    className="gallery-card-network"
                    style={{ color: socialColors[generatedPost.socialMedia] }}
                  >
                    {socialNames[generatedPost.socialMedia]}
                  </span>
                  <p className="gallery-card-text" style={{ marginTop: 8 }}>{generatedPost.text}</p>
                </div>
                <div className="generate-modal-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => { setShowModal(false); setGeneratedPost(null); }}
                  >
                    Descartar
                  </button>
                  <button className="btn btn-primary" onClick={() => handleApprove(generatedPost.id)}>
                    Aprobar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Generar nuevo post</h2>
                </div>
                <div className="project-form">
                  <div className="project-field">
                    <span>Red social</span>
                    <div className="row">
                      {(['instagram', 'x', 'facebook'] as const).map((platform) => (
                        <button
                          key={platform}
                          className={`btn${formData.socialMedia === platform ? ' btn-primary' : ''}`}
                          onClick={() => setFormData((p) => ({ ...p, socialMedia: platform }))}
                        >
                          {socialNames[platform]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="project-field">
                    <span>Descripcion</span>
                    <textarea
                      className="textarea"
                      placeholder="Describi que necesitas para el post..."
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="generate-modal-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setShowModal(false)}
                      disabled={generating}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn btn-primary"
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
    </>
  );
}
