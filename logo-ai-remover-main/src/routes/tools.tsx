import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools")({ head: () => ({ meta: [{ title: "AI Tools Directory | Pilio" }] }), component: Tools });
const tools = [
  ["Free Online Background Remover", "Remove image backgrounds online in one click and export a transparent PNG cutout", "/background-remover", "background-remover.webp"],
  ["Free AI Image Upscaler", "Upscale images online, recover detail, enhance faces, and export sharper high-resolution results", "/upscale", "image-upscaler.webp"],
  ["Free Image Watermark Remover", "Remove image watermarks online and repair covered faces, textures, and text with AI cleanup", "/remove/image", "image-watermark-remover.webp"],
  ["Free Gemini Watermark Remover", "Upload Gemini images or videos and let AI remove the watermarks, logos, and star overlays for you", "/gemini-video-watermark-remover", "gemini-watermark-remover.webp"],
  ["Free PDF Watermark Remover", "Remove PDF watermarks online with structural cleanup and AI deep mode for tougher scanned files", "/pdf-watermark-remover", "pdf-watermark-remover.webp"],
  ["Nano Banana 2 AI Image Generator", "Generate high-fidelity AI images online with Thinking composition, image references, and web search enhancement", "/tools", "nano-banana-2.webp"],
  ["Free AI Video Watermark Remover", "Remove video watermarks online from MP4, MOV, WebM, AVI, MPG, MPEG, MKV logos, subtitles, timestamps, usernames, and moving corner marks", "/remove/video", "video-watermark-remover.webp"],
  ["AI Video Enhancer", "Enhance video quality with AI detail reconstruction. Upload blurry, compressed, or AI-generated clips and export a cleaner MP4. Try with free credits — no install needed.", "/tools", "video-enhancer.webp"],
];
function Tools() { return <div className="tools-page"><header><p>AI TOOLS</p><h1>AI Tools Directory</h1><span>Find Pilio tools for Gemini watermark removal, image cleanup, background removal, upscaling, AI image and video generation, and PDF workflows — all in one workspace.</span></header><input aria-label="Search tools" placeholder="⌕   Search tools..." /><nav><button>All</button><button>Remove Watermark</button></nav><div className="tool-grid">{tools.map(([title, description, to, image]) => <Link key={title as string} to={to as any}><img src={`https://pilio.ai/images/tools/lovart-adapted-v2/${image}?dpl=73b0d06d0bbef755e1333c9ffed2d3dafe192ca1`} alt="" /><h2>{title}</h2><p>{description}</p></Link>)}</div></div> }
