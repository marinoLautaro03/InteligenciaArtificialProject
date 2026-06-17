export type CopyPromptInput = {
  projectName: string;
  projectDescription: string;
  primaryColor: string | null;
  userDescription: string;
  tone: "formal" | "casual" | "humoristico" | "inspiracional";
};

export type CopyPromptResult = {
  system: string;
  user: string;
};

export type ImagePromptInput = {
  projectName: string;
  projectDescription: string;
  primaryColor: string | null;
  userDescription: string;
  originalBrief?: string;
  tone: "formal" | "casual" | "humoristico" | "inspiracional";
};

export type EnrichPromptInput = {
  projectName: string;
  projectDescription: string;
  primaryColor: string | null;
  userDescription: string;
};

export type EnrichPromptResult = {
  system: string;
  user: string;
};

export type Tone = CopyPromptInput["tone"];
