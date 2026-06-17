import type { Tone } from "./types.js";

export const toneHints: Record<Tone, string> = {
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
