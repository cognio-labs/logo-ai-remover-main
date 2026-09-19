export interface AIModelData {
  id: string;
  name: string;
  version: string;
  description: string;
  mode: string;
  category?: "multimodal" | "video" | "image";
}

export const AI_MODELS: AIModelData[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    version: "Gemini 1.5 & 2.0 Flash",
    description: "Fast multimodal AI",
    mode: "Clean Inpaint",
    category: "multimodal",
  },
  {
    id: "veo",
    name: "Google Veo",
    version: "1080p / 4K 60FPS",
    description: "AI video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "sora",
    name: "OpenAI Sora",
    version: "Video Generation",
    description: "Generative video model",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "midjourney",
    name: "Midjourney v6",
    version: "Photorealistic AI",
    description: "High-quality image generation",
    mode: "Clean Inpaint",
    category: "image",
  },
  {
    id: "runway",
    name: "Runway Gen-3",
    version: "Alpha Video",
    description: "AI video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "kling",
    name: "Kling AI",
    version: "High Coherence",
    description: "AI image and video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    version: "Cinematic Camera",
    description: "Cinematic AI video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "pika",
    name: "Pika 2.0",
    version: "Physics & Effects",
    description: "Creative AI video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
  {
    id: "stability",
    name: "Stable Diffusion 3",
    version: "Ultra Fidelity",
    description: "Advanced image generation",
    mode: "Clean Inpaint",
    category: "image",
  },
  {
    id: "haiper",
    name: "Haiper AI",
    version: "AI Video",
    description: "AI video generation",
    mode: "Clean Inpaint",
    category: "video",
  },
];
