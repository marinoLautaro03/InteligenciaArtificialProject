import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GenerationResult, type Project } from '../lib/api';
import SocialPreview from '../components/SocialPreview';
import { Sparkle } from '../components/Icons';
import './Generator.css';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';
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

export default function Generator() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [tone, setTone] = useState<Tone>('casual');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!numericId) return;
    projectsApi.getById(numericId, getToken).then(setProject).catch(() => {});
  }, [numericId, getToken]);

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const variant = result.networks[network];
    setSaving(true);
    setError('');
    try {
      await postsApi.save(
        numericId,
        {
          socialMedia: network,
          text: variant.copy,
          hashtags: variant.hashtags,
          imageUrl: result.imageUrl,
          generationPrompt: description,
        },
        getToken,
      );
      navigate(`/projects/${numericId}/gallery`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const activeVariant = result?.networks[network];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <p className="page-sub">Brief → copy + imagen para las 4 redes. Switcheá y guardá la que más te guste.</p>
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
              <Sparkle size={14} />
              {generating ? 'Generando…' : result ? 'Regenerar' : 'Generar'}
            </button>
          </div>
        </aside>

        <section className="result-panel">
          {generating ? (
            <div className="result-generating">
              <span>Generando copy para las 4 redes + imagen…</span>
            </div>
          ) : result ? (
            <div className="result-with-preview">
              <div className="result-save-bar">
                <span className="result-save-label">
                  Mostrando: <strong>{activeNetwork.label}</strong>
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando…' : `Guardar post de ${activeNetwork.label}`}
                </button>
              </div>
              {activeVariant && (
                <SocialPreview
                  network={network}
                  copy={activeVariant.copy}
                  hashtags={activeVariant.hashtags}
                  imageUrl={result.imageUrl}
                  projectName={project?.name ?? 'Tu marca'}
                />
              )}
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
