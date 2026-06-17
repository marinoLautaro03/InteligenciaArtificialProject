import type { EnrichPromptInput, EnrichPromptResult } from "./types.js";

export const buildEnrichPrompt = (input: EnrichPromptInput): EnrichPromptResult => {
  const system = [
    "You are a specialist in writing detailed visual descriptions for AI image generation models.",
    "Your role is to take a short user brief and expand it into a rich visual prompt of approximately 150 words.",
    "",
    "IMPORTANT: The expanded text will be passed directly to an AI image model as the USER REQUEST.",
    "It must describe what the image should look like in vivid visual detail.",
    "",
    "RULES:",
    "- Keep the original intent and spirit intact — do not change the core message.",
    "- Add visual details: composition, lighting, colors, atmosphere, mood, textures, perspective, and style.",
    "- Stay aligned with the brand identity and project description.",
    "- Do not invent contradictory information or add elements that clash with the brand.",
    "- Match the language of the original brief and the project description. If the user writes in Spanish, respond in Spanish. If in English, respond in English. Never switch languages.",
    "- Return ONLY the expanded visual description — no explanations, no markdown, no JSON, no prefixes, no labels.",
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
    `Original brief:`,
    input.userDescription,
    "",
    "Write a detailed visual description of approximately 150 words that I can pass to an AI image generation model. Describe what the image should show, the composition, mood, lighting, colors, and style — all while staying true to the project and the original intent.",
  );

  return { system, user: parts.join("\n") };
};
