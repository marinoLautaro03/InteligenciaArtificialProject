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
  tone: "formal" | "casual" | "humoristico" | "inspiracional";
};

export type Tone = CopyPromptInput["tone"];
