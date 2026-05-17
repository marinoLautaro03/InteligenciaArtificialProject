import type { AiService } from "./ai.js";
import type { PostsRepository } from "./posts.repository.js";
import type { GeneratePostInput } from "./posts.schemas.js";

export const createPostsService = (postsRepository: PostsRepository, ai: AiService) => ({
  findAllByProject: (projectId: number, ownerId: string, options?: { includeUnapproved?: boolean }) => {
    return postsRepository.findAllByProject(projectId, ownerId, options);
  },

  findByIdForProject: (id: number, projectId: number, ownerId: string) => {
    return postsRepository.findByIdForProject(id, projectId, ownerId);
  },

  generatePost: async (
    project: { id: number; name: string; description: string; primaryColor: string | null },
    ownerId: string,
    input: GeneratePostInput,
  ) => {
    const [text, imageUrl] = await Promise.all([
      ai.generatePostText({
        projectName: project.name,
        projectDescription: project.description,
        primaryColor: project.primaryColor,
        socialMedia: input.socialMedia,
        userDescription: input.description,
        tone: input.tone,
      }),
      ai.generatePostImage({
        projectName: project.name,
        userDescription: input.description,
      }),
      // Promise.resolve('https://via.placeholder.com/1200x630.png?text=Generated+Image'),
    ]);

    return postsRepository.create({
      projectId: project.id,
      imageUrl,
      text,
      socialMedia: input.socialMedia,
      generationPrompt: input.description,
    });
  },

  approvePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);

    if (!post) {
      return undefined;
    }

    return postsRepository.update(id, projectId, { approved: true });
  },

  deletePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);

    if (!post) {
      return false;
    }

    return postsRepository.remove(id, projectId);
  },
});

export type PostsService = ReturnType<typeof createPostsService>;
