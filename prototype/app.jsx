// App shell — sidebar nav + screen routing + global state
const { useState: useS, useEffect: useEf, useMemo: useM } = React;

const Sidebar = ({ projects, activeProject, screen, onScreen, onSelectProject, onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SC</div>
        <div>
          <div className="brand-name">Social Content Studio</div>
          <div className="brand-sub">v0.1 · MVP</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">General</div>
        <button className={"nav-item" + (screen === "dashboard" ? " active" : "")} onClick={() => onScreen("dashboard")}>
          <Icons.Folder/> Proyectos <span className="count">{projects.length}</span>
        </button>
        <button className={"nav-item" + (screen === "settings" ? " active" : "")} onClick={() => alert("Settings (fuera de scope MVP)")}>
          <Icons.Settings/> Ajustes
        </button>
      </div>

      {activeProject && (
        <div className="nav-section">
          <div className="nav-label">{activeProject.name}</div>
          <button className={"nav-item" + (screen === "generator" ? " active" : "")} onClick={() => onScreen("generator")}>
            <Icons.Sparkle/> Generador
          </button>
          <button className={"nav-item" + (screen === "history" || screen === "detail" ? " active" : "")} onClick={() => onScreen("history")}>
            <Icons.History/> Historial <span className="count">{activeProject.posts}</span>
          </button>
        </div>
      )}

      <div className="nav-section">
        <div className="nav-label">Acceso rápido</div>
        {projects.slice(0, 4).map(p => (
          <button key={p.id} className={"nav-item" + (activeProject?.id === p.id ? " active" : "")} onClick={() => onSelectProject(p)}>
            <span style={{
              width:16, height:16, background:"var(--surface-2)", border:"1px solid var(--border)",
              borderRadius:4, display:"grid", placeItems:"center", fontFamily:"var(--font-mono)", fontSize:9, color:"var(--fg)"
            }}>{p.glyph}</span>
            {p.name}
          </button>
        ))}
      </div>

      <div className="spacer"/>

      <div className="user-card">
        <div className="user-avatar">LU</div>
        <div className="user-meta">
          <div className="name">Lucía M.</div>
          <div className="email">lucia@cafeaurora.co</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onLogout} style={{marginLeft:"auto"}} title="Salir">
          <Icons.X/>
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ activeProject, screen, onScreen }) => {
  return (
    <div className="topbar">
      <div className="crumbs">
        {!activeProject && <span className="current">Proyectos</span>}
        {activeProject && (
          <>
            <span style={{cursor:"pointer"}} onClick={() => onScreen("dashboard")}>Proyectos</span>
            <span className="sep">/</span>
            <span style={{cursor:"pointer"}} onClick={() => onScreen("generator")}>{activeProject.name}</span>
            {(screen === "history" || screen === "detail") && (<><span className="sep">/</span><span className="current">Historial</span></>)}
            {screen === "generator" && (<><span className="sep">/</span><span className="current">Generador</span></>)}
            {screen === "detail" && (<><span className="sep">/</span><span className="current">Post</span></>)}
          </>
        )}
      </div>
      <div className="right"></div>
    </div>
  );
};

const Toasts = ({ toasts }) => (
  <div className="toast-wrap">
    {toasts.map(t => (
      <div key={t.id} className="toast">
        <Icons.Check size={14}/> {t.text}
      </div>
    ))}
  </div>
);

const App = () => {
  // Tweaks
  const TWEAKS_DEFAULT = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "accent": "#d97757",
    "density": "comfortable",
    "showTopbar": true
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULT);

  useEf(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.style.setProperty("--accent", tweaks.accent);
  }, [tweaks.theme, tweaks.accent]);

  const [authed, setAuthed] = useS(true); // start logged in for fast preview
  const [screen, setScreen] = useS("generator"); // dashboard | generator | history | detail
  const [projects, setProjects] = useS(SAMPLE_PROJECTS);
  const [activeProject, setActiveProject] = useS(SAMPLE_PROJECTS[0]);
  const [history, setHistory] = useS(SAMPLE_HISTORY);
  const [activePost, setActivePost] = useS(null);
  const [toasts, setToasts] = useS([]);

  const pushToast = (text) => {
    const id = Math.random();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2200);
  };

  const handleSelectProject = (p) => {
    setActiveProject(p);
    setScreen("generator");
  };

  const handleSavePost = (postData) => {
    const newPost = {
      id: "h" + Date.now(),
      ...postData,
      img: postData.imgSeed,
      date: "Hoy",
      preview: postData.copy.split("\n")[0].slice(0, 100),
    };
    setHistory(h => [newPost, ...h]);
    pushToast("Post guardado en historial");
  };

  const handleOpenPost = (p) => {
    setActivePost(p);
    setScreen("detail");
  };

  const handleDeletePost = () => {
    setHistory(h => h.filter(p => p.id !== activePost.id));
    setActivePost(null);
    setScreen("history");
    pushToast("Post eliminado");
  };

  if (!authed) {
    return (
      <>
        <Login onLogin={() => setAuthed(true)}/>
        <TweaksUi tweaks={tweaks} setTweak={setTweak}/>
      </>
    );
  }

  return (
    <>
      <div className="app" data-density={tweaks.density}>
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          screen={screen}
          onScreen={setScreen}
          onSelectProject={handleSelectProject}
          onLogout={() => setAuthed(false)}
        />
        <div className="main">
          {tweaks.showTopbar && <TopBar activeProject={activeProject} screen={screen} onScreen={setScreen}/>}
          <div className="content">
            {screen === "dashboard" && (
              <Dashboard
                projects={projects}
                onOpen={handleSelectProject}
                onCreate={() => pushToast("Nuevo proyecto (mock)")}
              />
            )}
            {screen === "generator" && (
              <Generator
                project={activeProject}
                onSavePost={(d) => handleSavePost(d)}
                onNavigate={setScreen}
              />
            )}
            {screen === "history" && (
              <History
                posts={history}
                onOpen={handleOpenPost}
                onNew={() => setScreen("generator")}
              />
            )}
            {screen === "detail" && activePost && (
              <PostDetail
                post={activePost}
                onBack={() => setScreen("history")}
                onDelete={handleDeletePost}
                toast={pushToast}
              />
            )}
          </div>
        </div>
      </div>
      <Toasts toasts={toasts}/>
      <TweaksUi tweaks={tweaks} setTweak={setTweak}/>
    </>
  );
};

const TweaksUi = ({ tweaks, setTweak }) => (
  <TweaksPanel>
    <TweakSection title="Tema">
      <TweakRadio label="Modo" value={tweaks.theme} onChange={v => setTweak("theme", v)} options={[
        { value: "light", label: "Claro" },
        { value: "dark", label: "Oscuro" },
      ]}/>
      <TweakColor label="Acento" value={tweaks.accent} onChange={v => setTweak("accent", v)} options={[
        "#d97757", "#2a6fdb", "#1f8a5b", "#7c3aed", "#0f0f0f"
      ]}/>
    </TweakSection>
    <TweakSection title="Layout">
      <TweakToggle label="Mostrar topbar" value={tweaks.showTopbar} onChange={v => setTweak("showTopbar", v)}/>
      <TweakRadio label="Densidad" value={tweaks.density} onChange={v => setTweak("density", v)} options={[
        { value: "compact", label: "Compacta" },
        { value: "comfortable", label: "Cómoda" },
      ]}/>
    </TweakSection>
  </TweaksPanel>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
