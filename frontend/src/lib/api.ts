export type Project = {
  id: number;
  name: string;
  description: string;
  status: string;
  ownerId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  postCount: number;
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

export type Post = {
  id: number;
  projectId: number;
  imageUrl: string;
  text: string;
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  approved: boolean;
  generationPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type NetworkVariant = {
  copy: string;
  hashtags: string[];
};

export type GenerationResult = {
  imageUrl: string;
  networks: {
    instagram: NetworkVariant;
    x: NetworkVariant;
    linkedin: NetworkVariant;
    facebook: NetworkVariant;
  };
};

export type GenerateCopyResult = {
  networks: GenerationResult['networks'];
};

export type GenerateImageResult = {
  imageUrl: string;
};

export type GenerateImageInput = {
  description: string;
};

export type GeneratePostInput = {
  description: string;
  tone: 'formal' | 'casual' | 'humoristico' | 'inspiracional';
};

export type SavePostInput = {
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  text: string;
  hashtags: string[];
  imageUrl: string;
  generationPrompt: string;
};

export const postsApi = {
  list: (projectId: number, getToken: () => Promise<string | null>, options?: { includeUnapproved?: boolean }) =>
    request<Post[]>(`/projects/${projectId}/posts${options?.includeUnapproved ? '?includeUnapproved=true' : ''}`, getToken),

  getById: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/${postId}`, getToken),

  generate: (projectId: number, input: GeneratePostInput, getToken: () => Promise<string | null>) =>
    request<GenerationResult>(`/projects/${projectId}/posts/generate`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateCopy: (projectId: number, input: GeneratePostInput, getToken: () => Promise<string | null>) =>
    request<GenerateCopyResult>(`/projects/${projectId}/posts/generate-copy`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateImage: (projectId: number, input: GenerateImageInput, getToken: () => Promise<string | null>) =>
    request<GenerateImageResult>(`/projects/${projectId}/posts/generate-image`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  save: (projectId: number, input: SavePostInput, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/save`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  approve: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/${postId}/approve`, getToken, {
      method: 'PATCH',
    }),

  update: (
    projectId: number,
    postId: number,
    input: { text?: string; imageUrl?: string; generationPrompt?: string },
    getToken: () => Promise<string | null>,
  ) =>
    request<Post>(`/projects/${projectId}/posts/${postId}`, getToken, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  delete: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<void>(`/projects/${projectId}/posts/${postId}`, getToken, {
      method: 'DELETE',
    }),
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
