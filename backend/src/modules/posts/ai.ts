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
    width: number;
    height: number;
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
  formal:
    "Tono FORMAL: escribí de manera profesional, clara y directa. Sin emojis, sin coloquialismos. " +
    "Oraciones completas, vocabulario preciso. El lector debe sentir autoridad y confianza.",
  casual:
    "Tono CASUAL: escribí como si le hablaras a un amigo. Usá contracciones, tuteo, lenguaje cotidiano. " +
    "Podés usar algún emoji puntual. Cercano, cálido, sin sonar corporativo.",
  humoristico:
    "Tono HUMORÍSTICO: el copy DEBE hacer sonreír o sorprender. Usá juegos de palabras, ironía suave, " +
    "referencias inesperadas o giros cómicos. Los emojis deben reforzar el chiste, no ser decoración. " +
    "Si el copy no tiene al menos un momento gracioso, no sirve.",
  inspiracional:
    "Tono INSPIRACIONAL: escribí para motivar y emocionar. Usá frases con impacto, verbos de acción, " +
    "imágenes mentales poderosas. El lector debe terminar de leer con ganas de hacer algo. " +
    "Evitá los clichés vacíos — cada frase tiene que sentirse genuina.",
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

      const prompt = `
Sos un community manager experto generando contenido para "${input.projectName}".

Descripción del proyecto:
${input.projectDescription}

${input.primaryColor ? `Color primario: ${input.primaryColor}` : ""}

Tono:
${toneHints[input.tone] ?? input.tone}

Brief del usuario:
${input.userDescription}

Tu tarea:
Generá copy para Instagram, X, LinkedIn y Facebook.

IMPORTANTE:
- Respondé ÚNICAMENTE con JSON válido.
- No agregues explicaciones.
- No agregues markdown.
- No uses \`\`\`json.
- No agregues texto antes ni después del JSON.
- El resultado debe poder parsearse directamente con JSON.parse().
- Todos los strings deben estar escapados correctamente.

Formato EXACTO requerido:
{
  "instagram": {
    "copy": "string",
    "hashtags": ["#tag1", "#tag2"]
  },
  "x": {
    "copy": "string",
    "hashtags": ["#tag1", "#tag2"]
  },
  "linkedin": {
    "copy": "string",
    "hashtags": ["#tag1", "#tag2"]
  },
  "facebook": {
    "copy": "string",
    "hashtags": ["#tag1", "#tag2"]
  }
}

Reglas:
- Instagram:
  - máximo 1500 caracteres
  - hasta 8 hashtags
  - creativo y visual
  - se permiten emojis

- X:
  - máximo 240 caracteres TOTAL incluyendo hashtags
  - máximo 2 hashtags
  - directo e impactante

- LinkedIn:
  - máximo 1300 caracteres
  - hasta 4 hashtags
  - tono profesional

- Facebook:
  - máximo 400 caracteres
  - hasta 2 hashtags
  - tono conversacional

- Los hashtags deben ir SOLO dentro del array "hashtags".
- NO incluir hashtags dentro de "copy".
- NO incluir saltos de línea innecesarios.
- Si usás comillas dentro del copy, escapalas correctamente.
`;

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [{role: "user", content: prompt}],
          temperature: 0.3,
          top_p: 0.7,
          max_tokens: 5000,
          stream: false,
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
      console.log(JSON.stringify(data?.choices || {}, null, 2));
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

      const prompt = [
        `Social media image for project "${input.projectName}": ${input.userDescription}`,
        "Minimalist, clean design, suitable for social media.",
        "No text, letters, words, or typography of any kind unless explicitly requested by the user.",
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
          width: input.width,
          height: input.height,
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