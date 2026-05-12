// Print version: render every key screen stacked, one per page
const { useState: pS, useEffect: pE } = React;

const PrintFrame = ({ title, children, full }) => (
  <div className="print-page">
    <div className="print-page-head">
      <span className="mono lbl">{title}</span>
      <span className="mono lbl right">Social Content Studio · MVP</span>
    </div>
    <div className={"print-stage" + (full ? " full" : "")}>{children}</div>
  </div>
);

const PrintShell = ({ activeProject, screen, projects, children }) => (
  <div className="app print-shell">
    <Sidebar
      projects={projects}
      activeProject={activeProject}
      screen={screen}
      onScreen={() => {}}
      onSelectProject={() => {}}
      onLogout={() => {}}
    />
    <div className="main">
      <TopBar activeProject={activeProject} screen={screen} onScreen={() => {}}/>
      <div className="content">{children}</div>
    </div>
  </div>
);

const PrintApp = () => {
  pE(() => { document.documentElement.dataset.theme = "light"; }, []);

  const project = SAMPLE_PROJECTS[0];
  const samplePost = SAMPLE_HISTORY[0];

  return (
    <div className="print-doc">
      {/* 1 — Login */}
      <PrintFrame title="Pantalla 01 · Login / Registro" full>
        <Login onLogin={() => {}}/>
      </PrintFrame>

      {/* 2 — Dashboard */}
      <PrintFrame title="Pantalla 02 · Dashboard">
        <PrintShell projects={SAMPLE_PROJECTS} activeProject={null} screen="dashboard">
          <Dashboard projects={SAMPLE_PROJECTS} onOpen={() => {}} onCreate={() => {}}/>
        </PrintShell>
      </PrintFrame>

      {/* 3 — Generator */}
      <PrintFrame title="Pantalla 03 · Generador de Post">
        <PrintShell projects={SAMPLE_PROJECTS} activeProject={project} screen="generator">
          <Generator project={project} onSavePost={() => {}} onNavigate={() => {}}/>
        </PrintShell>
      </PrintFrame>

      {/* 4 — History */}
      <PrintFrame title="Pantalla 04 · Historial de Posts">
        <PrintShell projects={SAMPLE_PROJECTS} activeProject={project} screen="history">
          <History posts={SAMPLE_HISTORY} onOpen={() => {}} onNew={() => {}}/>
        </PrintShell>
      </PrintFrame>

      {/* 5 — Post detail */}
      <PrintFrame title="Pantalla 05 · Detalle / Edición de Post">
        <PrintShell projects={SAMPLE_PROJECTS} activeProject={project} screen="detail">
          <PostDetail
            post={{ ...samplePost, copy: NETWORKS[samplePost.network].sample.copy, tags: NETWORKS[samplePost.network].sample.tags }}
            onBack={() => {}}
            onDelete={() => {}}
            toast={() => {}}
          />
        </PrintShell>
      </PrintFrame>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<PrintApp/>);

// Auto-print after fonts and Babel are ready
(async () => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(e) {}
  setTimeout(() => { window.print(); }, 1500);
})();
