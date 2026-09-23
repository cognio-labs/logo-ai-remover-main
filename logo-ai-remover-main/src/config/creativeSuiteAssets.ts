export interface ProductCardItem {
  id: string;
  title: string;
  link: string;
  thumbnail: string;
  badge?: string;
  category?: string;
  description?: string;
}

/**
 * 20 Distinct Production Creative Suite Assets
 * All generated via neural AI models (16:9 widescreen, hyper-realistic, zero duplicate imagery).
 * Perfectly distributed across 4 rows of 5 cards each.
 */
export const CREATIVE_SUITE_ASSETS: ProductCardItem[] = [
  // --- ROW 1: Flagship Neural Engines ---
  {
    id: "video-enhancer",
    title: "AI Video Enhancer & Upscaler",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/video_enhancer_cyberpunk.jpg",
    badge: "Real-ESRGAN Pro",
    category: "Neural Upscaling & Denoising",
    description: "Multi-stage temporal enhancement for 4K/8K footage with motion stabilization.",
  },
  {
    id: "background-remover",
    title: "AI Background Remover",
    link: "/background-remover",
    thumbnail: "/creative-suite/background_remover_studio.jpg",
    badge: "Instant Alpha",
    category: "BiRefNet Neural Cutout",
    description: "Sub-pixel alpha masking for glass, fine hair, transparent materials, and complex edges.",
  },
  {
    id: "upscale-8k",
    title: "8K Neural Image Upscaler",
    link: "/upscale",
    thumbnail: "/creative-suite/upscaler_macro_8k.jpg",
    badge: "Gigapixel 8K",
    category: "Super Resolution",
    description: "Micro-texture hallucination and artifact reconstruction up to 800% scale.",
  },
  {
    id: "image-watermark-remover",
    title: "Image Watermark Remover",
    link: "/remove/image",
    thumbnail: "/creative-suite/watermark_remover_city.jpg",
    badge: "Lossless Inpaint",
    category: "Temporal Inpainting",
    description: "Deep neural inpainting eliminating logos and stamps across photos seamlessly.",
  },
  {
    id: "pdf-watermark-remover",
    title: "PDF Watermark Remover",
    link: "/pdf-watermark-remover",
    thumbnail: "/creative-suite/pdf_cleaner_blueprint.jpg",
    badge: "Vector Lossless",
    category: "Document Restoration",
    description: "Deterministic PDF stream parser removing background watermarks without rasterizing.",
  },

  // --- ROW 2: Generative Inpainting & Visual Restoration ---
  {
    id: "object-eraser",
    title: "AI Object & Logo Eraser",
    link: "/remove/image",
    thumbnail: "/creative-suite/inpainter_landscape.jpg",
    badge: "Zero Smudge",
    category: "LaMa Inpainting",
    description: "Fast Fourier transform neural inpainting removing unwanted objects and tourists seamlessly.",
  },
  {
    id: "portrait-restorer",
    title: "Portrait & Face Enhancer",
    link: "/upscale",
    thumbnail: "/creative-suite/portrait_restorer.jpg",
    badge: "Micro-Texture",
    category: "GFPGAN + CodeFormer",
    description: "High-fidelity facial detail synthesis preserving natural skin pores and realistic iris depth.",
  },
  {
    id: "motion-interpolator",
    title: "4K Neural Frame Interpolator",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/motion_interpolator.jpg",
    badge: "60 FPS Boost",
    category: "RIFE Flow Synthesis",
    description: "Bi-directional motion estimation generating butter-smooth 60fps / 120fps video.",
  },
  {
    id: "vector-reconstruct",
    title: "Vector & Typography Reconstruction",
    link: "/pdf-watermark-remover",
    thumbnail: "/creative-suite/vector_typography.jpg",
    badge: "Lossless Paths",
    category: "Vector Synthesis",
    description: "Mathematical Bézier path reconstruction preserving razor-sharp typography.",
  },
  {
    id: "color-grading",
    title: "Cinematic HDR Color Grading",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/color_grade_hdr.jpg",
    badge: "HDR 10-Bit",
    category: "Neural Colorimetry",
    description: "Rec.2020 / DCI-P3 dynamic range tone mapping with cinema-grade highlight recovery.",
  },

  // --- ROW 3: Infrastructure, Intelligence & Security ---
  {
    id: "audio-temporal",
    title: "Audio Temporal & Stem Cleaner",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/audio_temporal_studio.jpg",
    badge: "Studio Grade",
    category: "Temporal Frequency",
    description: "AI-assisted stem isolation and noise purification accompanying video sequences.",
  },
  {
    id: "schema-clean",
    title: "Document Schema & Watermark Purge",
    link: "/pdf-watermark-remover",
    thumbnail: "/creative-suite/document_schema_clean.jpg",
    badge: "100% Vector",
    category: "Font & Vector Intact",
    description: "Automated batch processing for contracts, certificates, blueprints, and forms.",
  },
  {
    id: "texture-synth",
    title: "Neural Texture Synthesizer",
    link: "/upscale",
    thumbnail: "/creative-suite/neural_texture_synth.jpg",
    badge: "Sub-Pixel Detail",
    category: "Deep Neural Fill",
    description: "Diffusion-driven micro-surface generation for CGI, game textures, and materials.",
  },
  {
    id: "gpu-cloud",
    title: "Ultra-Fast GPU Cloud Processing",
    link: "/pricing",
    thumbnail: "/creative-suite/gpu_tensor_cloud.jpg",
    badge: "NVIDIA H100",
    category: "High-Throughput Cluster",
    description: "Instant scale tensor cores delivering sub-second inference pipelines on demand.",
  },
  {
    id: "privacy-vault",
    title: "Zero-Retention Privacy Vault",
    link: "/about",
    thumbnail: "/creative-suite/privacy_vault_shield.jpg",
    badge: "256-Bit SSL",
    category: "Transient In-Memory",
    description: "Ephemeral processing architecture with instant RAM disposal and zero permanent storage.",
  },

  // --- ROW 4: Advanced Cinema & Macro Refinement ---
  {
    id: "drone-stabilizer",
    title: "8K Neural Drone Stabilizer",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/cinematic_drone_8k.jpg",
    badge: "Gyroscopic 8K",
    category: "Aerial Cinematography",
    description: "Deep horizon leveling and atmospheric haze penetration for dynamic drone footage.",
  },
  {
    id: "luxury-couple-studio",
    title: "Haute Couture Model & Luxury Couple Studio",
    link: "/upscale",
    thumbnail: "/creative-suite/attractive_couple_portrait.jpg",
    badge: "Glamour 8K",
    category: "Fashion Editorial",
    description: "Ultra-high fidelity facial aesthetics, glowing skin textures, and haute couture lighting.",
  },
  {
    id: "anime-dog-cutout",
    title: "Anime Pet & Character Background Remover",
    link: "/background-remover",
    thumbnail: "/creative-suite/anime_dog_cutout.jpg",
    badge: "Instant Alpha",
    category: "AI Pet & Anime Cutout",
    description: "Sub-pixel background isolation for cute anime pets, character illustrations, and furry textures.",
  },
  {
    id: "macro-jewelry",
    title: "Macro Jewelry & Diamond Refiner",
    link: "/upscale",
    thumbnail: "/creative-suite/macro_jewelry_diamond.jpg",
    badge: "Prismatic 8K",
    category: "Commercial Macro",
    description: "Extreme optical clarity rendering prismatic caustic reflections on precious gems.",
  },
  {
    id: "night-vision",
    title: "Zero-Lux Night Vision Denoising",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/night_vision_denoise.jpg",
    badge: "Sub-Lux ISO",
    category: "Low-Light Enhancement",
    description: "Temporal noise extraction revealing hidden depth under extreme low-light environments.",
  },
  {
    id: "neural-restoration-studio",
    title: "Cinematic Neural Restoration",
    link: "/video-enhancer",
    thumbnail: "/creative-suite/neural_restoration_studio.png",
    badge: "Studio Restore",
    category: "Film & Texture Recovery",
    description: "Restores damaged footage while preserving natural grain, color, and fine detail.",
  },
  {
    id: "private-processing-vault",
    title: "Private Media Processing",
    link: "/about",
    thumbnail: "/creative-suite/privacy_processing_vault.png",
    badge: "Zero Retention",
    category: "Secure Local Pipeline",
    description: "A privacy-first transient workflow that clears media as soon as processing finishes.",
  },];

