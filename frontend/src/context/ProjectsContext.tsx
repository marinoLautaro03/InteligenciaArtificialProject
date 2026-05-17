import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { projectsApi, type Project } from '../lib/api';

type ProjectsContextValue = {
  projects: Project[];
  status: 'idle' | 'loading' | 'error';
  error: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setError('');
      try {
        const items = await projectsApi.list(getToken);
        setProjects(items);
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No pudimos cargar los proyectos.');
      }
    };
    void load();
  }, [getToken]);

  return (
    <ProjectsContext.Provider value={{ projects, status, error, setProjects }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectsProvider');
  return ctx;
}
