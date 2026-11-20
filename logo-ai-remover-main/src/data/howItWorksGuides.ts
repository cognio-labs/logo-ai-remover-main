export type GuideVisual =
  | "image-upload"
  | "image-picker"
  | "background-result"
  | "gemini-image-upload"
  | "gemini-image-picker"
  | "sparkle-result"
  | "video-upload"
  | "video-picker"
  | "video-result";

export type HowItWorksGuideData = {
  id: string;
  howToName: string;
  label: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  uploadTargetId: string;
  steps: ReadonlyArray<{
    title: string;
    text: string;
    visual: GuideVisual;
    imageOverride: string;
    imageAlt: string;
  }>;
  tips: ReadonlyArray<string>;
  note?: string;
};

// Keep copy grouped by locale so another language can be added without changing the guide UI.
export const howItWorksGuides = {
  en: {
    background: {
      id: "background-remover-how-it-works",
      howToName: "How to remove an image background with Bellix",
      label: "How it works",
      heading: "Remove a background in 3 simple steps",
      subheading:
        "New here? No problem. Follow these steps and get a clean, transparent cutout in seconds—no design skills needed.",
      ctaLabel: "Try it now",
      uploadTargetId: "background-upload-card",
      steps: [
        {
          title: "Add your image",
          text: "Drop your photo into the upload box, or paste it straight from your clipboard with Ctrl+V (Cmd+V on Mac). PNG, JPG, WebP and AVIF are supported.",
          visual: "image-upload",
          imageOverride: "",
          imageAlt: "Illustration of the image upload card with an image dropping into it",
        },
        {
          title: "Choose the file from your device",
          text: "Click Choose image. Your computer's file window opens. Pick any photo from your folders and press Open. No photo handy? Tap one of the sample images to try it instantly.",
          visual: "image-picker",
          imageOverride: "",
          imageAlt: "Realistic file picker window with photo thumbnails and Open button",
        },
        {
          title: "Get your result",
          text: "In a few seconds the background disappears and your subject is ready with clean edges around hair and fine details. Compare before and after, change the background if you like, then download it in HD.",
          visual: "background-result",
          imageOverride: "",
          imageAlt: "Interactive before and after comparison of subject cutout with transparent background",
        },
      ],
      tips: [
        "Use a clear, well-lit photo",
        "Higher-resolution photos give sharper edges",
        "Try people, products, pets or cars",
      ],
    },
    geminiImage: {
      id: "gemini-image-how-it-works",
      howToName: "How to clean a visible Gemini corner sparkle with Bellix",
      label: "How it works",
      heading: "Remove the Gemini sparkle in 3 simple steps",
      subheading:
        "New here? No problem. Follow these steps and get a clean copy of your image at the exact same resolution—no editing skills needed.",
      ctaLabel: "Try it now",
      uploadTargetId: "gemini-image-upload-card",
      steps: [
        {
          title: "Add your image",
          text: "Drop your Gemini image into the upload box, or paste it straight from your clipboard with Ctrl+V (Cmd+V on Mac). PNG, JPG and WebP are supported, and you can add several images to process in a batch.",
          visual: "gemini-image-upload",
          imageOverride: "",
          imageAlt: "Illustration of the Gemini image upload card with an image dropping into it",
        },
        {
          title: "Pick the file from your device",
          text: "Click Choose image. Your computer's file window opens. Browse your folders, select the picture and press Open. It appears in the preview right away.",
          visual: "gemini-image-picker",
          imageOverride: "",
          imageAlt: "Illustration of a file picker with a selected image and Open button",
        },
        {
          title: "Aim the box, process, download",
          text: "Place the box over the visible corner sparkle, then press Remove Watermark. Your copy keeps the same pixel dimensions. Compare before and after, then download it.",
          visual: "sparkle-result",
          imageOverride: "",
          imageAlt: "Illustration of a sparkle selection box and cleaned before-and-after image",
        },
      ],
      tips: [
        "Place the box tightly around the visible sparkle",
        "Add several images, then process the batch",
        "Your exported image keeps its original pixel dimensions",
      ],
      note: "This tool removes the visible corner sparkle only.",
    },
    geminiVideo: {
      id: "gemini-video-how-it-works",
      howToName: "How to clean a visible Gemini or Veo video corner sparkle with Bellix",
      label: "How it works",
      heading: "Clean your Gemini or Veo video in 3 simple steps",
      subheading:
        "New here? No problem. Follow these steps and get a cleaned MP4 without the visible sparkle mark—no editing skills needed.",
      ctaLabel: "Try it now",
      uploadTargetId: "gemini-video-upload-card",
      steps: [
        {
          title: "Add your video",
          text: "Drop your original Gemini or Veo video into the upload box, or paste it from your clipboard. MP4, MOV, WebM and MKV are supported, up to 500 MB.",
          visual: "video-upload",
          imageOverride: "",
          imageAlt: "Illustration of the video upload card with browse and paste actions",
        },
        {
          title: "Pick the file from your device",
          text: "Click Browse Video. Your computer's file window opens. Browse your folders, select the video and press Open. Processing starts automatically after you choose it.",
          visual: "video-picker",
          imageOverride: "",
          imageAlt: "Illustration of a video file picker with a selected video and Open button",
        },
        {
          title: "Wait a moment, then download",
          text: "A progress bar shows how far processing has reached. When it is done, compare before and after and download your cleaned MP4. If the detector misses the mark, use Manual position to draw a small box around it and try again.",
          visual: "video-result",
          imageOverride: "",
          imageAlt: "Illustration of video processing progress and a cleaned before-and-after result",
        },
      ],
      tips: [
        "Use the original export from Gemini or Veo",
        "Keep the tab open until processing finishes",
        "Longer or larger videos can take more time",
        "Use Manual position if automatic detection misses the mark",
      ],
      note: "This tool removes the visible corner sparkle only.",
    },
  },
} as const satisfies Record<string, Record<string, HowItWorksGuideData>>;
