import { buildCopyPrompt } from "./prompts/copy.js";
import { buildEnrichPrompt } from "./prompts/enrich.js";
import { buildImagePrompt } from "./prompts/image.js";
import { buildRandomBriefPrompt } from "./prompts/random-brief.js";

export type NetworkVariant = { copy: string; hashtags: string[] };

export type AllNetworkCopies = {
  instagram: NetworkVariant;
  x: NetworkVariant;
  linkedin: NetworkVariant;
  facebook: NetworkVariant;
};

export type AiService = {
  generateAllCopies: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    userDescription: string;
    tone: "formal" | "casual" | "humoristico" | "inspiracional";
  }) => Promise<AllNetworkCopies>;

  generatePostImage: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    userDescription: string;
    originalBrief?: string;
    tone: "formal" | "casual" | "humoristico" | "inspiracional";
    width: number;
    height: number;
  }) => Promise<string>;

  enrichBrief: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    userDescription: string;
  }) => Promise<string>;

  generateRandomBrief: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
  }) => Promise<string>;
};

type AiConfig = {
  textModel: string;
  textBaseUrl: string;
  textApiKey: string;
  imageModel: string;
  imageBaseUrl: string;
  imageApiKey: string;
};

const FALLBACK_COPIES: AllNetworkCopies = {
  instagram: {copy: ".", hashtags: []},
  x: {copy: ".", hashtags: []},
  linkedin: {copy: ".", hashtags: []},
  facebook: {copy: ".", hashtags: []},
};

export const createAiService = (config: AiConfig): AiService => {
  return {
    generateAllCopies: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const { system, user } = buildCopyPrompt(input);

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: {
            type: "json_object",
          }
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Text generation failed (${textRes.status}): ${body}`);
      }

      const data = await textRes.json();
      const raw = data.choices?.[0]?.message?.content;

      try {
        return JSON.parse(raw) as AllNetworkCopies;
      } catch (error) {
        console.error("Failed to parse AI response:", error);
        return FALLBACK_COPIES;
      }
    },

    generatePostImage: async (input) => {
      if (!config.imageBaseUrl || !config.imageApiKey) {
        throw new Error(
          "AI image generation is not configured. Set AI_IMAGE_BASE_URL and AI_IMAGE_API_KEY.",
        );
      }

      const modelSlug = config.imageModel.toLowerCase().replace(/\./g, "-");
      const url = `${config.imageBaseUrl}/providers/blackforestlabs/v1/${modelSlug}?api-version=preview`;

      const prompt = buildImagePrompt(input);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.imageApiKey}`,
        },
        body: JSON.stringify({
          prompt,
          model: config.imageModel,
          width: input.width,
          height: input.height
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Image generation failed (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        data?: { b64_json?: string; url?: string }[];
        images?: { b64_json?: string; url?: string }[];
      };

      const item = data.data?.[0] ?? data.images?.[0];

      if (item?.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }

      if (item?.url) {
        return item.url;
      }

      throw new Error("Image generation returned an empty response.");
    },

    enrichBrief: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const { system, user } = buildEnrichPrompt(input);

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Brief enrichment failed (${textRes.status}): ${body}`);
      }

      const data = await textRes.json();
      return (data.choices?.[0]?.message?.content ?? "").trim();
    },

    generateRandomBrief: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const { system, user } = buildRandomBriefPrompt(input);

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Random brief generation failed (${textRes.status}): ${body}`);
      }

      const data = await textRes.json();
      return (data.choices?.[0]?.message?.content ?? "").trim();
    },
  };
};
