import { useAuth } from '@clerk/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, type Post } from '../lib/api';
import './Generator.css';

type Network = 'instagram' | 'x' | 'facebook' | 'linkedin';
type Tone = 'formal' | 'casual' | 'humoristico' | 'inspiracional';

const NETWORKS: { id: Network; label: string; maxChars: number; softLimit: number; hashtags: number; aspect: string }[] = [
  { id: 'instagram', label: 'Instagram', maxChars: 2200, softLimit: 1500, hashtags: 8, aspect: '1:1' },
  { id: 'x', label: 'X', maxChars: 280, softLimit: 240, hashtags: 2, aspect: '16:9' },
  { id: 'linkedin', label: 'LinkedIn', maxChars: 3000, softLimit: 1300, hashtags: 4, aspect: '1.91:1' },
  { id: 'facebook', label: 'Facebook', maxChars: 63206, softLimit: 400, hashtags: 2, aspect: '1.91:1' },
];

const TONES: { id: Tone; name: string; hint: string }[] = [
  { id: 'formal', name: 'Formal', hint: 'Profesional, directo' },
  { id: 'casual', name: 'Casual', hint: 'Cercano, conversacional' },
  { id: 'humoristico', name: 'Humorístico', hint: 'Ligero, con chispa' },
  { id: 'inspiracional', name: 'Inspiracional', hint: 'Motivador, emotivo' },
];

const NETWORK_COLORS: Record<Network, string> = {
  instagram: '#E4405F',
  x: '#000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
};

export default function Generator() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [tone, setTone] = useState<Tone>('casual');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Post | null>(null);
  const [error, setError] = useState('');

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const post = await postsApi.generate(numericId, { socialMedia: network, description, tone }, getToken);
      setResult(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    try {
      await postsApi.approve(numericId, result.id, getToken);
      navigate(`/projects/${numericId}/gallery`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <p className="page-sub">Brief → copy + imagen, adaptados a la red social.</p>
        </div>
        <Link to={`/projects/${numericId}/gallery`} className="btn btn-ghost btn-sm">
          Ver galería
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="gen-grid">
        <aside className="brief-panel">
          <h3>1 · Red social</h3>
          <div className="network-grid">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                className={`network-btn${network === n.id ? ' active' : ''}`}
                onClick={() => setNetwork(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="network-meta">
            <div><span>Largo</span><span className="v">{activeNetwork.softLimit}/{activeNetwork.maxChars}</span></div>
            <div><span>#tags</span><span className="v">{activeNetwork.hashtags} ideal</span></div>
            <div><span>Imagen</span><span className="v">{activeNetwork.aspect}</span></div>
          </div>

          <hr className="divider-h" />

          <h3>2 · Brief</h3>
          <div className="brief-field">
            <label>Tema</label>
            <textarea
              className="textarea"
              placeholder="¿De qué trata el post?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <h3>3 · Tono</h3>
          <div className="tone-grid">
            {TONES.map((t) => (
              <button
                key={t.id}
                className={`tone-btn${tone === t.id ? ' active' : ''}`}
                onClick={() => setTone(t.id)}
              >
                <span className="name">{t.name}</span>
                <span className="hint">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="brief-actions">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
            >
              {generating ? 'Generando…' : result ? 'Regenerar copy + imagen' : 'Generar'}
            </button>
            {result && (
              <button className="btn btn-ghost" onClick={handleApprove}>
                Guardar post
              </button>
            )}
          </div>
        </aside>

        <section className="result-panel">
          {generating ? (
            <div className="result-generating">
              <span>Generando copy + imagen…</span>
            </div>
          ) : result ? (
            <div className={`result-card${network === 'instagram' ? ' square' : ''}`}>
              <img src={result.imageUrl} alt="" />
              <div className="result-card-body">
                <span className="result-network" style={{ color: NETWORK_COLORS[result.socialMedia as Network] }}>
                  {NETWORKS.find((n) => n.id === result.socialMedia)?.label ?? result.socialMedia}
                </span>
                <p className="result-text">{result.text}</p>
              </div>
              <div className="result-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setResult(null)}
                >
                  Descartar
                </button>
                <button className="btn btn-primary" onClick={handleApprove}>
                  Aprobar post
                </button>
              </div>
            </div>
          ) : (
            <div className="result-empty">
              <p>Completá el brief y hacé clic en <strong>Generar</strong>.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
