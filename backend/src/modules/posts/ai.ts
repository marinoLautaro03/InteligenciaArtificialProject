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

const FALLBACK_COPIES: AllNetworkCopies = {
  instagram: { copy: "", hashtags: [] },
  x: { copy: "", hashtags: [] },
  linkedin: { copy: "", hashtags: [] },
  facebook: { copy: "", hashtags: [] },
};

function parseAllNetworkCopies(raw: string): AllNetworkCopies {
  // Strip markdown code fences if the model wraps in ```json ... ```
  const stripped = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();

  // Find first { ... } block
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) return FALLBACK_COPIES;

  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
    const networks: (keyof AllNetworkCopies)[] = ["instagram", "x", "linkedin", "facebook"];

    const result: AllNetworkCopies = { ...FALLBACK_COPIES };
    for (const net of networks) {
      const val = parsed[net];
      if (val && typeof val === "object" && "copy" in val) {
        result[net] = {
          copy: String((val as Record<string, unknown>).copy ?? ""),
          hashtags: Array.isArray((val as Record<string, unknown>).hashtags)
            ? ((val as Record<string, unknown>).hashtags as unknown[]).map(String)
            : [],
        };
      }
    }
    return result;
  } catch {
    return FALLBACK_COPIES;
  }
}

export const createAiService = (config: AiConfig): AiService => {
  return {
    generateAllCopies: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const prompt = [
        `Sos un community manager experto generando contenido para "${input.projectName}".`,
        `Descripción del proyecto: "${input.projectDescription}"`,
        input.primaryColor ? `Color primario: ${input.primaryColor}` : null,
        `Brief: "${input.userDescription}"`,
        `Tono: ${toneHints[input.tone] ?? input.tone}`,
        "",
        "Generá copy para las 4 redes sociales. Respondé ÚNICAMENTE con JSON válido, sin explicaciones ni markdown:",
        `{`,
        `  "instagram": { "copy": "texto sin hashtags", "hashtags": ["#tag1", "#tag2"] },`,
        `  "x":         { "copy": "texto sin hashtags", "hashtags": ["#tag1"] },`,
        `  "linkedin":  { "copy": "texto sin hashtags", "hashtags": ["#tag1", "#tag2"] },`,
        `  "facebook":  { "copy": "texto sin hashtags", "hashtags": ["#tag1"] }`,
        `}`,
        "",
        "Reglas:",
        "- Instagram: hasta 1500 caracteres, hasta 8 hashtags, creativo con emojis",
        "- X: máximo 240 caracteres en total (copy + hashtags juntos), 2 hashtags",
        "- LinkedIn: hasta 1300 caracteres, hasta 4 hashtags, tono profesional",
        "- Facebook: hasta 400 caracteres, hasta 2 hashtags, conversacional",
        "- Los hashtags van en el array, NO dentro del copy",
      ]
        .filter(Boolean)
        .join("\n");

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Text generation failed (${textRes.status}): ${body}`);
      }

      let raw = "";
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
            raw += parsed.choices[0]?.delta?.content ?? "";
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      return parseAllNetworkCopies(raw);
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
