import type { RandomBriefPromptInput, RandomBriefPromptResult } from "./types.js";

export const buildRandomBriefPrompt = (input: RandomBriefPromptInput): RandomBriefPromptResult => {
  const system = [
    "You are a creative social media strategist.",
    "Your role is to generate a random post brief from scratch — a fresh idea based solely on the brand or project.",
    "",
    "RULES:",
    "- The brief must be a single sentence or short paragraph (20–40 words).",
    "- It should describe a relevant post topic for the brand: product showcase, behind-the-scenes, customer story, trend, seasonal content, etc.",
    "- Stay aligned with the brand identity and project description.",
    "- Vary the ideas — do not repeat the same topic every time.",
    "- Match the language of the project description. If it's in Spanish, respond in Spanish. If in English, respond in English. Never switch languages.",
    "- Return ONLY the brief text — no explanations, no markdown, no JSON, no prefixes, no labels.",
  ].join("\n");

  const parts: string[] = [
    `Project: "${input.projectName}"`,
    `Project description: ${input.projectDescription}`,
  ];

  if (input.primaryColor) {
    parts.push(`Brand color: ${input.primaryColor}`);
  }

  parts.push(
    "",
    "Generate a random post brief for this brand. Suggest a topic that would work well for social media — a single sentence or short paragraph with the core idea.",
  );

  return { system, user: parts.join("\n") };
};
