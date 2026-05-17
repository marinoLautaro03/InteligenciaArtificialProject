
export type AiService = {
  generatePostText: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    socialMedia: string;
    userDescription: string;
    tone: "formal" | "casual" | "humoristico" | "inspiracional";
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

const toneHints: Record<"formal" | "casual" | "humoristico" | "inspiracional", string> = {
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

      const systemPrompt = [
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

      const userContent = `${systemPrompt}\n\n${input.userDescription}`;

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [{ role: "user", content: userContent }],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Text generation failed (${textRes.status}): ${body}`);
      }

      let result = "";
      const reader = textRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as {
              choices: { delta: { content?: string } }[];
            };
            result += parsed.choices[0]?.delta?.content ?? "";
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      return result;
    },

    generatePostImage: async (input) => {
      if (!config.imageBaseUrl || !config.imageApiKey) {
        throw new Error(
          "AI image generation is not configured. Set AI_IMAGE_BASE_URL and AI_IMAGE_API_KEY.",
        );
      }

      const modelSlug = config.imageModel.toLowerCase().replace(/\./g, "-");
      const url = `${config.imageBaseUrl}/providers/blackforestlabs/v1/${modelSlug}?api-version=preview`;

      const prompt = [
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
          prompt,
          model: config.imageModel,
          width: 1024,
          height: 1024,
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
  };
};
