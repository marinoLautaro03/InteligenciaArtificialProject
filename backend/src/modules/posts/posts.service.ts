import type { AllNetworkCopies, AiService } from "./ai.js";
import type { PostsRepository } from "./posts.repository.js";
import type { GeneratePostInput, GenerateImageInput, SavePostInput } from "./posts.schemas.js";

const IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  instagram: { width: 864, height: 1080 },
  x:         { width: 1280, height: 720  },
  linkedin:  { width: 1024, height: 536  },
  facebook:  { width: 1024, height: 536  },
};

export type GenerationResult = {
  imageUrl: string;
  networks: AllNetworkCopies;
};

export const createPostsService = (postsRepository: PostsRepository, ai: AiService) => ({
  findAllByProject: (projectId: number, ownerId: string, options?: { includeUnapproved?: boolean }) => {
    return postsRepository.findAllByProject(projectId, ownerId, options);
  },

  findByIdForProject: (id: number, projectId: number, ownerId: string) => {
    return postsRepository.findByIdForProject(id, projectId, ownerId);
  },

  generatePostVariants: async (
    project: { id: number; name: string; description: string; primaryColor: string | null },
    _ownerId: string,
    input: GeneratePostInput,
  ): Promise<GenerationResult> => {
    const [networks, imageUrl] = await Promise.all([
      ai.generateAllCopies({
        projectName: project.name,
        projectDescription: project.description,
        primaryColor: project.primaryColor,
        userDescription: input.description,
        tone: input.tone,
      }),
      ai.generatePostImage({
        projectName: project.name,
        userDescription: input.description,
        ...IMAGE_DIMENSIONS[input.socialMedia],
      }),
    ]);

    return { imageUrl, networks };
  },

  generateCopies: async (
    project: { id: number; name: string; description: string; primaryColor: string | null },
    _ownerId: string,
    input: GeneratePostInput,
  ): Promise<AllNetworkCopies> => {
    return ai.generateAllCopies({
      projectName: project.name,
      projectDescription: project.description,
      primaryColor: project.primaryColor,
      userDescription: input.description,
      tone: input.tone,
    });
  },

  generateImage: async (
    project: { id: number; name: string; description: string },
    _ownerId: string,
    input: GenerateImageInput,
  ): Promise<{ imageUrl: string }> => {
    const imageUrl = await ai.generatePostImage({
      projectName: project.name,
      userDescription: input.description,
      ...IMAGE_DIMENSIONS[input.socialMedia],
    });
    return { imageUrl };
  },

  savePost: async (
    project: { id: number; name: string },
    _ownerId: string,
    input: SavePostInput,
  ) => {
    const fullText = input.hashtags.length > 0
      ? `${input.text}\n\n${input.hashtags.join(" ")}`
      : input.text;

    const post = await postsRepository.create({
      projectId: project.id,
      imageUrl: input.imageUrl,
      text: fullText,
      socialMedia: input.socialMedia,
      generationPrompt: input.generationPrompt,
    });

    return postsRepository.update(post.id, project.id, { approved: true });
  },

  approvePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return undefined;
    return postsRepository.update(id, projectId, { approved: true });
  },

  updatePost: async (
    id: number,
    projectId: number,
    ownerId: string,
    data: { text?: string; imageUrl?: string; generationPrompt?: string },
  ) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return undefined;
    return postsRepository.update(id, projectId, data);
  },

  deletePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return false;
    return postsRepository.remove(id, projectId);
  },
});

export type PostsService = ReturnType<typeof createPostsService>;
