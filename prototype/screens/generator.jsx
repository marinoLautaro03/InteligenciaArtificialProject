// Generator screen — the heart of the app
const { useState, useEffect, useMemo, useRef } = React;

const PlaceholderImage = ({ topic, network, seed = 0 }) => {
  // Deterministic color from seed
  const hue = (seed * 47 + 30) % 360;
  return (
    <div className="placeholder-image" style={{
      background: `repeating-linear-gradient(${45 + seed * 7}deg, oklch(0.92 0.03 ${hue}) 0, oklch(0.92 0.03 ${hue}) 8px, oklch(0.96 0.02 ${hue}) 8px, oklch(0.96 0.02 ${hue}) 16px)`
    }}>
      <div className="lbl">
        IMAGEN GENERADA<br/>
        <span style={{opacity:0.6, fontSize:10}}>· {network} · {topic ? topic.slice(0,28) : "post"} ·</span>
      </div>
    </div>
  );
};

const Generator = ({ project, onSavePost, onNavigate }) => {
  const [network, setNetwork] = useState("instagram");
  const [topic, setTopic] = useState("Lanzamiento del blend de invierno — café tostado en lote pequeño con notas de cacao y naranja.");
  const [tone, setTone] = useState("casual");
  const [hasResult, setHasResult] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState(""); // "copy" | "image" | "both"
  const [progress, setProgress] = useState(0);
  const [view, setView] = useState("preview"); // "preview" | "raw"
  const [adjusting, setAdjusting] = useState(false);
  const [adjustText, setAdjustText] = useState("");

  const cfg = NETWORKS[network];
  const [copy, setCopy] = useState(cfg.sample.copy);
  const [tags, setTags] = useState(cfg.sample.tags);
  const [imgSeed, setImgSeed] = useState(3);

  // When network changes, swap to that network's sample copy/tags
  useEffect(() => {
    setCopy(NETWORKS[network].sample.copy);
    setTags(NETWORKS[network].sample.tags);
  }, [network]);

  const fullText = copy + (tags.length ? "\n\n" + tags.join(" ") : "");
  const charCount = fullText.length;
  const limit = cfg.maxChars;
  const soft = cfg.softLimit;
  const lenPct = Math.min(100, (charCount / limit) * 100);
  const lenState = charCount > limit ? "over" : charCount > soft ? "warn" : "";

  const runGen = (stage) => {
    setGenerating(true);
    setGenStage(stage);
    setProgress(0);
    let p = 0;
    const tick = () => {
      p += 6 + Math.random() * 10;
      if (p >= 100) {
        setProgress(100);
        setTimeout(() => {
          setGenerating(false);
          setHasResult(true);
          if (stage === "copy" || stage === "both") {
            setCopy(NETWORKS[network].sample.copy);
            setTags(NETWORKS[network].sample.tags);
          }
          if (stage === "image" || stage === "both") setImgSeed(s => s + 1);
        }, 250);
      } else {
        setProgress(p);
        setTimeout(tick, 90 + Math.random() * 80);
      }
    };
    tick();
  };

  const submitAdjust = () => {
    if (!adjustText.trim()) return;
    setAdjusting(false);
    runGen("both");
    setAdjustText("");
  };

  const image = <PlaceholderImage topic={topic} network={cfg.label} seed={imgSeed}/>;

  return (
    <div className="content-inner" style={{maxWidth:1280}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <div className="page-sub">Brief → copy + imagen, adaptados a la red. Regenerá lo que no te convenza.</div>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("history")}>
            <Icons.History/> Ver historial
          </button>
        </div>
      </div>

      <div className="gen-grid">
        {/* BRIEF */}
        <aside className="brief-panel" data-screen-label="Generator brief">
          <h3>1 · Red social</h3>
          <div className="network-grid">
            {Object.values(NETWORKS).map(n => {
              const I = Icons[n.icon];
              return (
                <button key={n.id} className={"network-btn" + (network === n.id ? " active" : "")} onClick={() => setNetwork(n.id)}>
                  <I/>
                  <span className="lbl">{n.label}</span>
                </button>
              );
            })}
          </div>
          <div className="network-meta">
            <div><span>Largo</span><span className="v">{cfg.softLimit}/{cfg.maxChars}</span></div>
            <div><span>#tags</span><span className="v">{cfg.hashtags.ideal} ideal</span></div>
            <div><span>Imagen</span><span className="v">{cfg.aspect}</span></div>
          </div>

          <hr className="divider-h"/>

          <h3>2 · Brief</h3>
          <div className="field">
            <label className="field-label">Tema</label>
            <textarea className="textarea" value={topic} onChange={e => setTopic(e.target.value)} placeholder="¿De qué trata el post?" rows={3}/>
          </div>
          <div className="field">
            <label className="field-label">Tono</label>
            <div className="tone-grid">
              {TONES.map(t => (
                <button key={t.id} className={"tone-btn" + (tone === t.id ? " active" : "")} onClick={() => setTone(t.id)}>
                  <span className="name">{t.name}</span>
                  <span className="hint">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" onClick={() => runGen("both")} disabled={generating}>
            <Icons.Sparkle/> {hasResult ? "Regenerar copy + imagen" : "Generar"}
          </button>
          {hasResult && (
            <button className="btn" onClick={() => onSavePost({ network, topic, tone, copy, tags, imgSeed })}>
              <Icons.Save/> Guardar post
            </button>
          )}
        </aside>

        {/* RESULT */}
        <section className="result-panel" data-screen-label="Generator result">
          <div className="result-toolbar">
            <div className="result-status">
              <span className={"dot" + (generating ? " gen" : "")}></span>
              {generating ? `Generando ${genStage === "copy" ? "copy" : genStage === "image" ? "imagen" : "copy + imagen"}…` : "Listo"}
            </div>
            <div className="seg" style={{marginLeft:12}}>
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}><Icons.Eye/> Preview</button>
              <button className={view === "raw" ? "active" : ""} onClick={() => setView("raw")}><Icons.Code/> Raw</button>
            </div>
            <div className="right">
              <button className="btn btn-sm btn-ghost" onClick={() => runGen("both")} disabled={generating}>
                <Icons.Refresh/> Regenerar todo
              </button>
            </div>
          </div>

          {view === "preview" ? (
            <div style={{position:"relative"}}>
              {generating && (genStage === "image" || genStage === "both") && (
                <div style={{
                  position:"absolute", inset:0, background:"oklch(0.98 0.004 85 / 0.7)",
                  display:"grid", placeItems:"center", zIndex:5, borderRadius:"var(--radius)"
                }}>
                  <div className="skel" style={{position:"static", background:"transparent"}}>
                    <div className="skel-spinner"/>
                    <div className="skel-label">Generando…</div>
                    <div className="skel-progress"><span style={{width: progress + "%"}}/></div>
                  </div>
                </div>
              )}
              <SocialPreview network={network} copy={copy} tags={tags} image={image} project={project}/>
            </div>
          ) : (
            <div className="result-stage">
              {/* COPY */}
              <div className="result-card">
                <div className="result-card-head">
                  <span><Icons.Text/> Copy</span>
                  <span className="right mono">{charCount} / {limit}</span>
                </div>
                <div className="result-card-body" style={{position:"relative", minHeight: 240}}>
                  {generating && (genStage === "copy" || genStage === "both") && (
                    <div className="skel">
                      <div className="skel-spinner"/>
                      <div className="skel-label">Escribiendo copy…</div>
                      <div className="skel-progress"><span style={{width: progress + "%"}}/></div>
                    </div>
                  )}
                  <textarea className="copy-text" value={copy} onChange={e => setCopy(e.target.value)}/>
                  <div style={{marginTop:8, display:"flex", flexWrap:"wrap", gap:6}}>
                    {tags.map((t, i) => (
                      <span key={i} className="chip" style={{cursor:"default", padding:"3px 9px", fontSize:11.5, fontFamily:"var(--font-mono)"}}>{t}</span>
                    ))}
                  </div>
                  <div className={"length-bar " + lenState}><span style={{width: lenPct + "%"}}/></div>
                </div>
                <div className="copy-meta">
                  <span>{tags.length} tags</span>
                  <span>{copy.split(/\s+/).filter(Boolean).length} palabras</span>
                  {lenState === "over" && <span className="warn">Excede el límite</span>}
                </div>
                <div className="result-card-actions">
                  <button className="btn btn-sm" onClick={() => runGen("copy")} disabled={generating}><Icons.Refresh/> Regenerar copy</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(fullText)}><Icons.Copy/> Copiar</button>
                </div>
              </div>

              {/* IMAGE */}
              <div className="result-card">
                <div className="result-card-head">
                  <span><Icons.Image/> Imagen</span>
                  <span className="right mono">{cfg.aspect}</span>
                </div>
                <div style={{position:"relative"}}>
                  <div className={"image-stage " + cfg.aspectClass}>
                    {generating && (genStage === "image" || genStage === "both") ? (
                      <div className="skel">
                        <div className="skel-spinner"/>
                        <div className="skel-label">Generando imagen…</div>
                        <div className="skel-progress"><span style={{width: progress + "%"}}/></div>
                      </div>
                    ) : image}
                  </div>
                </div>
                <div className="result-card-actions">
                  <button className="btn btn-sm" onClick={() => runGen("image")} disabled={generating}><Icons.Refresh/> Regenerar imagen</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setAdjusting(a => !a)}><Icons.Wand/> Ajustar prompt</button>
                </div>
              </div>
            </div>
          )}

          {/* Adjust bar */}
          {adjusting && (
            <div className="adjust-bar">
              <span className="pre">/ajustar</span>
              <input
                autoFocus
                value={adjustText}
                onChange={e => setAdjustText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitAdjust()}
                placeholder="ej: hacé el copy más corto, agregá 2 emojis sutiles, imagen más cálida…"
              />
              <button className="btn btn-sm btn-primary" onClick={submitAdjust} disabled={!adjustText.trim()}>
                <Icons.Send/> Aplicar
              </button>
              <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setAdjusting(false)}><Icons.X/></button>
            </div>
          )}
          {!adjusting && (
            <button className="btn btn-ghost" style={{alignSelf:"flex-start"}} onClick={() => setAdjusting(true)}>
              <Icons.Wand/> Ajustar en lenguaje natural
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

window.Generator = Generator;
