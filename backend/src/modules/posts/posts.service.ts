import type { PostsRepository } from "./posts.repository.js";
import type { GeneratePostInput } from "./posts.schemas.js";

const mockTexts: Record<string, string[]> = {
  instagram: [
    "This changes everything. 🔥 Ready to level up? Drop a ❤️ if you're in! #innovation #gamechanger",
    "Behind every great campaign is a team that never stops. 🌟 Here's to the ones who dare to dream big. #teamwork #vision",
    "Your next big idea is just one scroll away. 👀 Swipe left to see what we've been working on! #sneakpeek #comingsoon",
    "They said it couldn't be done. We said watch us. 🚀 The future is here. #breakthrough #innovation",
    "Monday mood: Turning visions into reality. ✨ What's your goal this week? #mondaymotivation #hustle",
    "Perfection is in the details. 🎯 Every pixel, every word, every moment crafted with care. #craftsmanship #design",
    "3… 2… 1… Launch! 🚀 We're live and ready to take over the world. #launchday #excited",
    "Tag someone who needs to see this! 👇 Share the inspiration. #community #together",
    "From concept to creation. 📸 Here's a glimpse into our creative process. #behindthescenes #creative",
    "The best is yet to come. 💫 Stay tuned for something extraordinary. #comingsoon #excited",
  ],
  x: [
    "Big news dropping soon. 👀 Stay tuned.",
    "Innovation isn't a destination. It's a mindset. 🧠",
    "We asked. You answered. Now watch what happens next.",
    "8 seconds. That's all it takes to change everything. ⏱️",
    "Game recognize game. 🏆 Who's stepping up?",
    "Simplicity is the ultimate sophistication. Less is more.",
    "The data speaks for itself. 📊 Check the numbers.",
    "New milestone alert! 🚀 Couldn't have done it without our community.",
    "Think bigger. Move faster. Build better. 💪",
    "It's not about the technology. It's about what you do with it.",
  ],
  facebook: [
    "We've been working on something special and we can't wait to share it with you all! What do you think of the new direction? Let us know in the comments below! 👇",
    "Big things are happening behind the scenes! 🎉 Our team has been putting in the hours to bring you an experience like no other. Stay tuned for updates!",
    "We want to hear from YOU! What matters most to you when choosing a partner for your next campaign? Drop your thoughts below! 💬",
    "Throwback to where it all started. 🕰️ It's amazing to see how far we've come, and we owe it all to your support. Thank you! ❤️",
    "Exciting update! We've just added new features that will transform the way you work. Log in now to check them out!",
    "Meet the team behind the magic! 🎩✨ Every great project starts with great people. Swipe through to get to know us!",
    "Question of the day: What's the one tool you can't live without? For us, it's definitely our community! 🛠️💬",
    "We're celebrating a major milestone today! 🎉 Thank you to everyone who has been part of this journey. Here's to many more! 🥂",
    "Tips and tricks Tuesday! 📝 Here's our top 3 tips for maximizing your social media presence this quarter. Save this for later!",
    "Let's talk about the future of content creation. 🚀 What trends are you most excited about? Join the conversation below!",
  ],
};

const mockImageUrls = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
  "https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800",
  "https://images.unsplash.com/photo-1559526324-4bc350d195b4?w=800",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
  "https://images.unsplash.com/photo-1534531173927-aeb928d54385?w=800",
  "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=800",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const createPostsService = (postsRepository: PostsRepository) => ({
  findAllByProject: (projectId: number, ownerId: string, options?: { includeUnapproved?: boolean }) => {
    return postsRepository.findAllByProject(projectId, ownerId, options);
  },

  findByIdForProject: (id: number, projectId: number, ownerId: string) => {
    return postsRepository.findByIdForProject(id, projectId, ownerId);
  },

  generatePost: async (projectId: number, ownerId: string, input: GeneratePostInput) => {
    const textsForPlatform = mockTexts[input.socialMedia] ?? mockTexts.instagram;
    const text = pickRandom(textsForPlatform);
    const imageUrl = pickRandom(mockImageUrls);

    return postsRepository.create({
      projectId,
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
