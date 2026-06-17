import type { ImagePromptInput, Tone } from "./types.js";

const visualToneHints: Record<Tone, string> = {
  formal:
    "Professional, clean, and polished aesthetic. " +
    "Corporate-appropriate colors and structured composition.",
  casual:
    "Friendly and approachable aesthetic. " +
    "Warm tones and a relaxed, natural composition.",
  humoristico:
    "Playful and vibrant aesthetic. " +
    "Bright colors and dynamic, unexpected visual elements.",
  inspiracional:
    "Motivational and uplifting aesthetic. " +
    "Bright lighting, inspiring colors, and expansive, open composition.",
};

export const buildImagePrompt = (input: ImagePromptInput): string => {
  return [
    "You are a professional social media visual designer creating brand content images.",
    "",
    "GUIDELINES:",
    "\u2022 Minimalist, clean design, suitable for social media.",
    "\u2022 No text, letters, words, or typography of any kind unless explicitly requested.",
    `\u2022 ${visualToneHints[input.tone]}`,
    "",
    "PROJECT CONTEXT:",
    `Name: "${input.projectName}"`,
    `Description: ${input.projectDescription}`,
    ...(input.primaryColor ? [`Primary color: ${input.primaryColor}`] : []),
    "",
    `VISUAL TONE: ${input.tone}`,
    "",
    ...(input.originalBrief
      ? [
          "USER REQUEST (original):",
          input.originalBrief,
          "",
          "EXPANDED BRIEF:",
          input.userDescription,
        ]
      : [
          "USER REQUEST:",
          input.userDescription,
        ]),
  ].join("\n");
};
