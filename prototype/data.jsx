// Network configurations — character limits, hashtag conventions, image aspect ratios
const NETWORKS = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    label: "IG",
    icon: "Instagram",
    maxChars: 2200,
    softLimit: 1500,
    hashtags: { ideal: 8, max: 30 },
    aspect: "1:1",
    aspectClass: "",
    sample: {
      copy: "Mañanas que se sienten distintas cuando elegís cómo arrancarlas. ☕\n\nUn ritual simple cambia todo el día — empezá por lo pequeño, y dejá que lo demás se acomode solo.\n\n¿Cuál es el tuyo?",
      tags: ["#ritualesdiarios", "#mindfulmornings", "#cafedelamañana", "#productividadreal", "#vidaslow", "#balance", "#bienestar", "#hábitos"]
    }
  },
  x: {
    id: "x",
    name: "X",
    label: "X",
    icon: "XSocial",
    maxChars: 280,
    softLimit: 240,
    hashtags: { ideal: 2, max: 3 },
    aspect: "16:9",
    aspectClass: "aspect-16-9",
    sample: {
      copy: "Los rituales no son rutina.\n\nUna rutina la hacés en automático.\nUn ritual te recuerda por qué lo hacés.",
      tags: ["#mindset", "#hábitos"]
    }
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    label: "IN",
    icon: "LinkedIn",
    maxChars: 3000,
    softLimit: 1300,
    hashtags: { ideal: 4, max: 5 },
    aspect: "1.91:1",
    aspectClass: "aspect-16-9",
    sample: {
      copy: "Los rituales matutinos no son una tendencia de productividad.\n\nSon una decisión.\n\nDurante años empecé el día revisando notificaciones. La sensación: que el trabajo me elegía a mí, no al revés.\n\nCambié una sola cosa: los primeros 20 minutos son míos. Sin pantallas, sin mensajes, sin urgencias ajenas.\n\nEl impacto no fue inmediato. Pero a las dos semanas noté algo: llegaba a las reuniones con claridad, no con reacciones.\n\nNo se trata de café ni de meditación. Se trata de empezar el día decidiendo, no respondiendo.",
      tags: ["#liderazgo", "#productividad", "#bienestarlaboral", "#hábitos"]
    }
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    label: "FB",
    icon: "Facebook",
    maxChars: 63206,
    softLimit: 400,
    hashtags: { ideal: 2, max: 4 },
    aspect: "1.91:1",
    aspectClass: "aspect-16-9",
    sample: {
      copy: "Pequeños rituales, grandes cambios. Estos son los 3 que más me funcionaron este año — y por qué creo que el orden importa más que el contenido. 👇\n\nEl tuyo, ¿cuál es?",
      tags: ["#hábitos", "#bienestar"]
    }
  }
};

const TONES = [
  { id: "formal", name: "Formal", hint: "Profesional, directo" },
  { id: "casual", name: "Casual", hint: "Cercano, conversacional" },
  { id: "humoristico", name: "Humorístico", hint: "Ligero, con chispa" },
  { id: "inspiracional", name: "Inspiracional", hint: "Motivador, emotivo" },
];

const SAMPLE_PROJECTS = [
  { id: "p1", name: "Café Aurora", desc: "Cafetería de especialidad — campañas semanales y lanzamientos.", glyph: "AU", posts: 24, lastEdit: "Hace 2 días" },
  { id: "p2", name: "Estudio Norte", desc: "Estudio de diseño independiente. Posts de portfolio y procesos.", glyph: "EN", posts: 12, lastEdit: "Hace 5 días" },
  { id: "p3", name: "Marca Personal — Lucía", desc: "Contenido de liderazgo y growth para LinkedIn.", glyph: "LU", posts: 38, lastEdit: "Ayer" },
  { id: "p4", name: "Podcast En Voz Baja", desc: "Promo de episodios y clips. IG + X principalmente.", glyph: "VB", posts: 7, lastEdit: "Hace 1 semana" },
];

const SAMPLE_HISTORY = [
  { id: "h1", network: "instagram", topic: "Lanzamiento blend de invierno", tone: "casual", date: "07 May", preview: "Hay algo en el primer sorbo de un café nuevo que te recuerda por qué empezaste...", img: 1 },
  { id: "h2", network: "linkedin", topic: "Cómo armamos el blend", tone: "formal", date: "05 May", preview: "Tres meses de cata. Once productores. Una decisión: el blend de invierno 2026 no nació en una oficina...", img: 2 },
  { id: "h3", network: "x", topic: "Tip de barista", tone: "humoristico", date: "03 May", preview: "El secreto de un buen espresso no es la máquina. Es la persona que decidió que vale la pena hacerlo bien.", img: 3 },
  { id: "h4", network: "facebook", topic: "Horarios fin de semana", tone: "casual", date: "01 May", preview: "Este finde abrimos extendido. Nuevos pasteles, mismo café de siempre.", img: 4 },
  { id: "h5", network: "instagram", topic: "Detrás del mostrador", tone: "inspiracional", date: "28 Abr", preview: "No es solo café. Es una conversación que arranca a las 7am y no termina hasta que cierra el local.", img: 5 },
];

window.NETWORKS = NETWORKS;
window.TONES = TONES;
window.SAMPLE_PROJECTS = SAMPLE_PROJECTS;
window.SAMPLE_HISTORY = SAMPLE_HISTORY;
