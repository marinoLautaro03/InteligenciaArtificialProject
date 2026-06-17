import type { CopyPromptInput, CopyPromptResult } from "./types.js";
import { toneHints } from "./tone-hints.js";

const buildSystemPrompt = (): string => {
  return [
    "Sos un community manager experto generando contenido para redes sociales.",
    "",
    "Tu tarea:",
    "Generá copy para Instagram, X, LinkedIn y Facebook.",
    "",
    "IMPORTANTE:",
    '- Respondé ÚNICAMENTE con JSON válido.',
    "- No agregues explicaciones.",
    "- No agregues markdown.",
    "- No uses ```json.",
    "- No agregues texto antes ni después del JSON.",
    "- El resultado debe poder parsearse directamente con JSON.parse()..",
    "- Todos los strings deben estar escapados correctamente.",
    "",
    "Formato EXACTO requerido:",
    `{`,
    `  "instagram": {`,
    `    "copy": "string",`,
    `    "hashtags": ["#tag1", "#tag2"]`,
    `  },`,
    `  "x": {`,
    `    "copy": "string",`,
    `    "hashtags": ["#tag1", "#tag2"]`,
    `  },`,
    `  "linkedin": {`,
    `    "copy": "string",`,
    `    "hashtags": ["#tag1", "#tag2"]`,
    `  },`,
    `  "facebook": {`,
    `    "copy": "string",`,
    `    "hashtags": ["#tag1", "#tag2"]`,
    `  }`,
    `}`,
    "",
    "Reglas:",
    "- Instagram:",
    "  - máximo 1500 caracteres",
    "  - hasta 8 hashtags",
    "  - creativo y visual",
    "  - se permiten emojis",
    "",
    "- X:",
    "  - máximo 240 caracteres TOTAL incluyendo hashtags",
    "  - máximo 2 hashtags",
    "  - directo e impactante",
    "",
    "- LinkedIn:",
    "  - máximo 1300 caracteres",
    "  - hasta 4 hashtags",
    "  - tono profesional",
    "",
    "- Facebook:",
    "  - máximo 400 caracteres",
    "  - hasta 2 hashtags",
    "  - tono conversacional",
    "",
    "- Los hashtags deben ir SOLO dentro del array \"hashtags\".",
    '- NO incluir hashtags dentro de "copy".',
    "- NO incluir saltos de línea innecesarios.",
    '- Si usás comillas dentro del copy, escapalas correctamente.',
  ].join("\n");
};

const buildUserPrompt = (input: CopyPromptInput): string => {
  const parts: string[] = [
    `Proyecto: "${input.projectName}"`,
    "",
    "Descripción del proyecto:",
    input.projectDescription,
  ];

  if (input.primaryColor) {
    parts.push("", `Color primario: ${input.primaryColor}`);
  }

  parts.push(
    "",
    "Tono:",
    toneHints[input.tone] ?? input.tone,
    "",
    "Brief del usuario:",
    input.userDescription,
  );

  return parts.join("\n");
};

export const buildCopyPrompt = (input: CopyPromptInput): CopyPromptResult => ({
  system: buildSystemPrompt(),
  user: buildUserPrompt(input),
});
