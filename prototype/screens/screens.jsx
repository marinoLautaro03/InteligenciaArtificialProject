// Smaller screens: Login, Dashboard, History, Detail
const { useState: uS, useEffect: uE } = React;

// ============ LOGIN ============
const Login = ({ onLogin }) => (
  <div className="login-page" data-screen-label="Login">
    <div className="login-hero">
      <div className="brand">
        <div className="sidebar-brand-mark" style={{
          width:32, height:32, background:"var(--fg)", color:"var(--bg)",
          borderRadius:7, display:"grid", placeItems:"center",
          fontFamily:"var(--font-mono)", fontSize:14, fontWeight:600, letterSpacing:"-0.04em"
        }}>SC</div>
        <div>
          <div style={{fontSize:15, letterSpacing:"-0.02em"}}>Social Content Studio</div>
          <div className="mono" style={{fontSize:10, color:"var(--fg-soft)", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:1}}>v0.1 · MVP</div>
        </div>
      </div>
      <div className="pitch">
        <h1>Brief corto.<br/><em>Post listo para publicar.</em></h1>
        <p className="muted" style={{fontSize:14, lineHeight:1.55, maxWidth:440, margin:0}}>
          Describí en pocas palabras lo que querés publicar, elegí la red,
          y recibí copy + imagen adaptados a esa red — con sus reglas de formato y hashtags.
        </p>
        <div className="flow">
          {["Brief","Red social","Generar","Publicar"].map((s,i) => (
            <div key={i} className="flow-step">
              <div className="n">0{i+1}</div>
              <div className="label">{s}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="footer">© 2026 · hecho con cuidado</div>
    </div>
    <div className="login-form">
      <div className="clerk-card">
        <div>
          <h2>Iniciá sesión</h2>
          <div className="sub" style={{marginTop:6}}>Continuá con tu cuenta para acceder a tus proyectos.</div>
        </div>
        <div className="oauth">
          <button className="oauth-btn" onClick={onLogin}>
            <svg className="ico" viewBox="0 0 16 16" fill="none">
              <path d="M14.5 8.2c0-.5 0-.9-.1-1.3H8v2.5h3.7c-.2.9-.7 1.6-1.4 2.1v1.7h2.3c1.3-1.2 2-3 2-5Z" fill="#4285F4"/>
              <path d="M8 14.5c1.9 0 3.5-.6 4.6-1.7l-2.3-1.7c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.2-4-2.9H1.5v1.8C2.7 13 5.2 14.5 8 14.5Z" fill="#34A853"/>
              <path d="M4 8.9c-.1-.4-.2-.8-.2-1.3 0-.4.1-.9.2-1.3V4.5H1.5C1 5.4.7 6.4.7 7.6c0 1.1.3 2.2.8 3.1L4 8.9Z" fill="#FBBC04"/>
              <path d="M8 3.4c1 0 2 .4 2.7 1.1l2-2C11.4 1.3 9.9.7 8 .7 5.2.7 2.7 2.2 1.5 4.5L4 6.3c.6-1.7 2.2-2.9 4-2.9Z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          <button className="oauth-btn" onClick={onLogin}>
            <svg className="ico" viewBox="0 0 16 16" fill="#000">
              <path d="M11.4 8.3c0-1.6 1.3-2.4 1.4-2.4-.7-1-2-1.2-2.4-1.2-1-.1-2 .6-2.5.6-.5 0-1.4-.6-2.2-.6-1.1 0-2.2.7-2.7 1.7-1.2 2-.3 5 .8 6.6.6.8 1.2 1.7 2.1 1.6.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.8 2.1-1.6.6-.9.9-1.8 1-1.9-.1 0-1.9-.7-1.9-2.8ZM9.7 3.6c.4-.5.7-1.2.7-1.9-.6 0-1.4.4-1.9 1-.4.4-.8 1.2-.7 1.9.7 0 1.4-.4 1.9-1Z"/>
            </svg>
            Continuar con Apple
          </button>
        </div>
        <div className="divider">o con email</div>
        <div className="field">
          <input className="input" placeholder="tu@email.com" defaultValue="lucia@cafeaurora.co"/>
        </div>
        <button className="btn btn-primary btn-lg" style={{justifyContent:"center"}} onClick={onLogin}>
          Continuar →
        </button>
        <div className="clerk-watermark">
          Secured by · Clerk
        </div>
      </div>
    </div>
  </div>
);

// ============ DASHBOARD ============
const Dashboard = ({ projects, onOpen, onCreate }) => {
  const [search, setSearch] = uS("");
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="content-inner" data-screen-label="Dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tus proyectos</h1>
          <div className="page-sub">{projects.length} proyectos · cada proyecto agrupa posts y ajustes de marca.</div>
        </div>
        <div className="row">
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--fg-soft)"}}>
              <Icons.Search/>
            </span>
            <input className="input" style={{paddingLeft:32, width:220}} placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={onCreate}><Icons.Plus/> Nuevo proyecto</button>
        </div>
      </div>
      <div className="project-grid">
        {filtered.map(p => (
          <div key={p.id} className="project-card" onClick={() => onOpen(p)}>
            <div className="project-cover">
              <div className="glyph">{p.glyph}</div>
            </div>
            <div className="project-card-body">
              <div className="name">{p.name}</div>
              <div className="desc">{p.desc}</div>
              <div className="meta">
                <span>{p.posts} posts</span>
                <span>·</span>
                <span>{p.lastEdit}</span>
              </div>
            </div>
          </div>
        ))}
        <button className="project-card-create" onClick={onCreate}>
          <Icons.Plus size={20}/>
          <span>Crear proyecto</span>
        </button>
      </div>
    </div>
  );
};

// ============ HISTORY ============
const History = ({ posts, onOpen, onNew }) => {
  const [filter, setFilter] = uS("all");
  const filtered = filter === "all" ? posts : posts.filter(p => p.network === filter);
  return (
    <div className="content-inner" data-screen-label="History">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial</h1>
          <div className="page-sub">{posts.length} posts guardados en este proyecto.</div>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={onNew}><Icons.Plus/> Nuevo post</button>
        </div>
      </div>
      <div className="tabs" style={{marginBottom:16}}>
        <button className={"tab" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>Todos <span className="count">{posts.length}</span></button>
        {Object.values(NETWORKS).map(n => {
          const I = Icons[n.icon];
          const c = posts.filter(p => p.network === n.id).length;
          return (
            <button key={n.id} className={"tab" + (filter === n.id ? " active" : "")} onClick={() => setFilter(n.id)}>
              <I/> {n.name} <span className="count">{c}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <div className="title">Sin posts en esta red</div>
          <div className="sub">Cambiá el filtro o creá un nuevo post para esta red social.</div>
          <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={onNew}><Icons.Sparkle/> Crear el primero</button>
        </div>
      ) : (
        <div className="history-list">
          {filtered.map(p => {
            const n = NETWORKS[p.network];
            const I = Icons[n.icon];
            return (
              <div key={p.id} className="history-item" onClick={() => onOpen(p)}>
                <div className="history-thumb">
                  <PlaceholderImage topic={p.topic} network={n.label} seed={p.img}/>
                </div>
                <div className="history-copy">
                  <div className="preview">{p.preview}</div>
                  <div className="meta">
                    <span>{p.topic}</span>
                    <span>·</span>
                    <span>{p.tone}</span>
                  </div>
                </div>
                <div className="history-network"><I/> {n.name}</div>
                <div className="history-date">{p.date}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ POST DETAIL ============
const PostDetail = ({ post, onBack, onDelete, toast }) => {
  const n = NETWORKS[post.network];
  const I = Icons[n.icon];
  const [copy, setCopy] = uS(post.copy || NETWORKS[post.network].sample.copy);
  const [tags] = uS(post.tags || NETWORKS[post.network].sample.tags);
  const [editing, setEditing] = uS(false);
  const [confirmDel, setConfirmDel] = uS(false);

  return (
    <div className="content-inner" data-screen-label="Post detail">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:10, marginLeft:-8}}>
            ← Volver al historial
          </button>
          <h1 className="page-title">{post.topic || "Post guardado"}</h1>
          <div className="page-sub row" style={{gap:8}}>
            <I/> {n.name} · tono {post.tone || "casual"} · guardado {post.date || "hoy"}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { navigator.clipboard?.writeText(copy + "\n\n" + tags.join(" ")); toast("Copy copiado"); }}>
            <Icons.Copy/> Copiar copy
          </button>
          <button className="btn" onClick={() => toast("Imagen descargada")}>
            <Icons.Download/> Descargar imagen
          </button>
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
            <Icons.Trash/>
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-panel">
          <div className="card">
            <div className="result-card-head">
              <span><Icons.Text/> Copy</span>
              <button className="btn btn-sm btn-ghost" style={{marginLeft:"auto"}} onClick={() => setEditing(e => !e)}>
                <Icons.Edit/> {editing ? "Listo" : "Editar"}
              </button>
            </div>
            <div className="result-card-body">
              {editing ? (
                <textarea className="copy-text" value={copy} onChange={e => setCopy(e.target.value)} autoFocus/>
              ) : (
                <div className="copy-text" style={{minHeight:0}}>{copy}</div>
              )}
              <div style={{marginTop:8, display:"flex", flexWrap:"wrap", gap:6}}>
                {tags.map((t, i) => (
                  <span key={i} className="chip" style={{cursor:"default", padding:"3px 9px", fontSize:11.5, fontFamily:"var(--font-mono)"}}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="result-card-head">
              <span><Icons.Image/> Imagen</span>
              <span className="right mono">{n.aspect}</span>
            </div>
            <div className={"image-stage " + n.aspectClass}>
              <PlaceholderImage topic={post.topic} network={n.label} seed={post.img || 1}/>
            </div>
          </div>
        </div>

        <aside className="detail-panel">
          <div className="card card-pad">
            <div className="mono" style={{fontSize:10.5, color:"var(--fg-soft)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Detalles</div>
            <div className="detail-meta-list">
              <div className="detail-meta-row"><span className="k">Red</span><span className="v">{n.name}</span></div>
              <div className="detail-meta-row"><span className="k">Tono</span><span className="v" style={{textTransform:"capitalize"}}>{post.tone || "casual"}</span></div>
              <div className="detail-meta-row"><span className="k">Tema</span><span className="v">{post.topic}</span></div>
              <div className="detail-meta-row"><span className="k">Caracteres</span><span className="v mono">{copy.length} / {n.maxChars}</span></div>
              <div className="detail-meta-row"><span className="k">Hashtags</span><span className="v mono">{tags.length}</span></div>
              <div className="detail-meta-row"><span className="k">Guardado</span><span className="v">{post.date || "hoy"}</span></div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="mono" style={{fontSize:10.5, color:"var(--fg-soft)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Preview en {n.name}</div>
            <div style={{transform:"scale(0.85)", transformOrigin:"top left", width:"117.6%"}}>
              <SocialPreview
                network={post.network}
                copy={copy}
                tags={tags}
                project={{ name: "Café Aurora", glyph: "AU" }}
                image={<PlaceholderImage topic={post.topic} network={n.label} seed={post.img || 1}/>}
              />
            </div>
          </div>
        </aside>
      </div>

      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar este post?</h3>
            <div className="muted" style={{fontSize:13, lineHeight:1.5}}>
              Esta acción no se puede deshacer. El copy y la imagen generada se borrarán de este proyecto.
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setConfirmDel(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => { setConfirmDel(false); onDelete(); }}>
                <Icons.Trash/> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.Login = Login;
window.Dashboard = Dashboard;
window.History = History;
window.PostDetail = PostDetail;
