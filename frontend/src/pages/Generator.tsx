import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GenerationResult, type Project } from '../lib/api';
import SocialPreview from '../components/SocialPreview';
import { Sparkle } from '../components/Icons';
import './Generator.css';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';
type Tone = 'formal' | 'casual' | 'humoristico' | 'inspiracional';
type View = 'preview' | 'raw';
type GeneratingStage = 'copy' | 'image' | 'both' | null;

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
  const [generatingStage, setGeneratingStage] = useState<GeneratingStage>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<View>('preview');
  const [adjustText, setAdjustText] = useState('');

  useEffect(() => {
    if (!numericId) return;
    projectsApi.getById(numericId, getToken).then(setProject).catch(() => {});
  }, [numericId, getToken]);

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;
  const activeVariant = result?.networks[network];

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGeneratingStage('both');
    setResult(null);
    setError('');
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!description.trim()) return;
    setGeneratingStage('both');
    setError('');
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateCopy = async () => {
    if (!description.trim()) return;
    setGeneratingStage('copy');
    setError('');
    try {
      const data = await postsApi.generateCopy(numericId, { description, tone }, getToken);
      setResult((prev) => (prev ? { ...prev, networks: data.networks } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar copy.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateImage = async () => {
    if (!description.trim()) return;
    setGeneratingStage('image');
    setError('');
    try {
      const data = await postsApi.generateImage(numericId, { description }, getToken);
      setResult((prev) => (prev ? { ...prev, imageUrl: data.imageUrl } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar imagen.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleApplyAdjust = async () => {
    if (!adjustText.trim()) return;
    setGeneratingStage('both');
    setError('');
    try {
      const adjustedDescription = `${description}\n\n${adjustText}`;
      const data = await postsApi.generate(numericId, { description: adjustedDescription, tone }, getToken);
      setResult(data);
      setAdjustText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar ajuste.');
    } finally {
      setGeneratingStage(null);
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

  const statusLabel =
    generatingStage === 'copy' ? 'Generando copy…' :
    generatingStage === 'image' ? 'Generando imagen…' :
    generatingStage === 'both' ? 'Generando copy + imagen…' :
    'Listo';

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
              disabled={generatingStage !== null || !description.trim()}
            >
              <Sparkle size={14} />
              {result ? 'Regenerar' : 'Generar'}
            </button>
          </div>

          {result && (
            <button
              className="btn btn-sm"
              onClick={handleSave}
              disabled={saving || generatingStage !== null}
            >
              {saving ? 'Guardando…' : `Guardar post de ${activeNetwork.label}`}
            </button>
          )}
        </aside>

        <section className="result-panel">
          {generatingStage !== null && !result ? (
            <div className="result-generating">
              <span>{statusLabel}</span>
            </div>
          ) : result && activeVariant ? (
            <>
              <div className="result-toolbar">
                <div className="result-status">
                  <span className={`dot${generatingStage ? ' gen' : ''}`} />
                  {statusLabel}
                </div>
                <div className="seg" style={{ marginLeft: 12 }}>
                  <button
                    className={view === 'preview' ? 'active' : ''}
                    onClick={() => setView('preview')}
                  >
                    Preview
                  </button>
                  <button
                    className={view === 'raw' ? 'active' : ''}
                    onClick={() => setView('raw')}
                  >
                    Raw
                  </button>
                </div>
                <div className="toolbar-right">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleRegenerateAll}
                    disabled={generatingStage !== null}
                  >
                    Regenerar todo
                  </button>
                </div>
              </div>

              {view === 'preview' && (
                <SocialPreview
                  network={network}
                  copy={activeVariant.copy}
                  hashtags={activeVariant.hashtags}
                  imageUrl={result.imageUrl}
                  projectName={project?.name ?? 'Tu marca'}
                />
              )}

              {view === 'raw' && (() => {
                const fullText = activeVariant.hashtags.length > 0
                  ? `${activeVariant.copy}\n\n${activeVariant.hashtags.join(' ')}`
                  : activeVariant.copy;
                const charCount = fullText.length;
                const lenPct = Math.min(100, (charCount / activeNetwork.maxChars) * 100);
                const lenState =
                  charCount > activeNetwork.maxChars ? 'over' :
                  charCount > activeNetwork.softLimit ? 'warn' : '';
                const wordCount = activeVariant.copy.split(/\s+/).filter(Boolean).length;

                return (
                  <div className="result-stage">
                    <div className="result-card">
                      <div className="result-card-head">
                        <span>Copy</span>
                        <span className="mono">{charCount} / {activeNetwork.maxChars}</span>
                      </div>
                      <div className="result-card-body">
                        <p className="copy-text">{activeVariant.copy}</p>
                        {activeVariant.hashtags.length > 0 && (
                          <div className="hashtag-chips">
                            {activeVariant.hashtags.map((tag, i) => (
                              <span key={i} className="chip">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className={`length-bar ${lenState}`}>
                          <span style={{ width: `${lenPct}%` }} />
                        </div>
                        <div className="copy-meta">
                          <span>{activeVariant.hashtags.length} tags</span>
                          <span>{wordCount} palabras</span>
                        </div>
                      </div>
                      <div className="result-card-actions">
                        <button
                          className="btn btn-sm"
                          onClick={handleRegenerateCopy}
                          disabled={generatingStage !== null}
                        >
                          Regenerar copy
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigator.clipboard.writeText(fullText)}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="result-card">
                      <div className="result-card-head">
                        <span>Imagen</span>
                        <span className="mono">{activeNetwork.aspect}</span>
                      </div>
                      <div className="result-card-body no-pad">
                        {result.imageUrl && (
                          <div className="image-stage">
                            <img src={result.imageUrl} alt="" />
                          </div>
                        )}
                      </div>
                      <div className="result-card-actions">
                        <button
                          className="btn btn-sm"
                          onClick={handleRegenerateImage}
                          disabled={generatingStage !== null}
                        >
                          Regenerar imagen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="adjust-bar">
                <span className="adjust-pre">/ajustar</span>
                <input
                  value={adjustText}
                  onChange={(e) => setAdjustText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplyAdjust(); }}
                  placeholder="ej: hacé el copy más corto, agregá 2 emojis sutiles, imagen más cálida…"
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleApplyAdjust}
                  disabled={!adjustText.trim() || generatingStage !== null}
                >
                  Aplicar
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setAdjustText('')}
                  aria-label="Limpiar ajuste"
                >
                  ×
                </button>
              </div>
            </>
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
