export type Project = {
  id: number;
  name: string;
  description: string;
  status: string;
  ownerId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  name: string;
  description: string;
  logoUrl?: string;
  primaryColor?: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const createHeaders = async (getToken: () => Promise<string | null>) => {
  const token = await getToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async <T>(
  path: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(await createHeaders(getToken)),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Request failed';

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const projectsApi = {
  list: (getToken: () => Promise<string | null>) => request<Project[]>('/projects', getToken),
  getById: (id: number, getToken: () => Promise<string | null>) => request<Project>(`/projects/${id}`, getToken),
  create: (input: CreateProjectInput, getToken: () => Promise<string | null>) =>
    request<Project>('/projects', getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: number, input: UpdateProjectInput, getToken: () => Promise<string | null>) =>
    request<Project>(`/projects/${id}`, getToken, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: number, getToken: () => Promise<string | null>) =>
    request<void>(`/projects/${id}`, getToken, {
      method: 'DELETE',
    }),
};
