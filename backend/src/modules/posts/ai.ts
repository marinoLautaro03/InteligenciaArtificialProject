import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export type AiService = {
  generatePostText: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    socialMedia: string;
    userDescription: string;
    tone: string;
  }) => Promise<string>;

  generatePostImage: (input: {
    projectName: string;
    userDescription: string;
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

const toneHints: Record<string, string> = {
  formal: "profesional y directo",
  casual: "cercano y conversacional",
  humoristico: "ligero, con humor y chispa",
  inspiracional: "motivador y emotivo",
};

export const createAiService = (config: AiConfig): AiService => {
  return {
    generatePostText: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const textProvider = createOpenAI({
        baseURL: config.textBaseUrl,
        apiKey: config.textApiKey,
      });

      const system = [
        `Eres un community manager experto generando contenido para "${input.projectName}".`,
        `Descripcion del proyecto: "${input.projectDescription}"`,
        input.primaryColor ? `Color primario: ${input.primaryColor}` : null,
        `Red social: ${input.socialMedia}`,
        `Tono: ${toneHints[input.tone] ?? input.tone}`,
        "",
        "Adapta el tono, la longitud y el formato a la plataforma:",
        "- Instagram: creativo, visual, con emojis y hashtags (max 2200 caracteres)",
        "- X: conciso, directo, maximo 280 caracteres, 2 hashtags",
        "- LinkedIn: profesional, reflexivo, maximo 3000 caracteres, 4-5 hashtags",
        "- Facebook: conversacional, mas extenso, invita a la interaccion",
        "",
        "Responde SOLO con el contenido del post, sin explicaciones adicionales.",
      ]
        .filter(Boolean)
        .join("\n");

      const { text } = await generateText({
        model: textProvider(config.textModel),
        system,
        prompt: input.userDescription,
      });

      return text;
    },

    generatePostImage: async (input) => {
      if (!config.imageBaseUrl || !config.imageApiKey) {
        throw new Error(
          "AI image generation is not configured. Set AI_IMAGE_BASE_URL and AI_IMAGE_API_KEY.",
        );
      }

      const modelPath = config.imageModel.toLowerCase().replace(/\./g, "-");
      const base = config.imageBaseUrl.replace(/\/$/, "");
      const url = `${base}/${modelPath}?api-version=preview`;

      const apiPrompt = [
        `Social media image for project "${input.projectName}": ${input.userDescription}`,
        "Minimalist, clean design, suitable for social media.",
      ].join(". ");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.imageApiKey}`,
        },
        body: JSON.stringify({
          prompt: apiPrompt,
          model: config.imageModel,
          width: 256,
          height: 256,
          n: 1,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Image generation failed (${response.status}): ${response.statusText}${body ? ` - ${body}` : ""}`,
        );
      }

      const data = (await response.json()) as {
        data: { b64_json: string }[];
      };

      if (!data.data?.[0]?.b64_json) {
        throw new Error("Image generation returned an empty response.");
      }

      return `data:image/png;base64,${data.data[0].b64_json}`;
    },
  };
};
