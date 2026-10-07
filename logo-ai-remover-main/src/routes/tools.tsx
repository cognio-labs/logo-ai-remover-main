import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools")({ head: () => ({ meta: [{ title: "AI Tools Directory | Bellix.us" }] }), component: Tools });
const tools = [
  ["4K / 8K Upscaler", "Super-resolution for images, designs and photos. Recover texture and export sharp high-resolution outputs.", "/upscale", "/creative-suite/upscaler_macro_8k.jpg"],
  ["AI Background Remover", "Remove image backgrounds online in one click with clean edges and export a transparent PNG cutout.", "/background-remover", "/creative-suite/background_remover_studio.jpg"],
  ["Video Enhancer", "Enhance, upscale and restore video quality with AI motion smoothing and frame detail reconstruction.", "/video-enhancer", "/creative-suite/video_enhancer_cyberpunk.jpg"],
  ["PDF Watermark Remover", "Clean supported PDF documents with structural background layer removal while keeping vector fonts crisp.", "/pdf-watermark-remover", "/creative-suite/pdf_cleaner_blueprint.jpg"],
  ["Image Watermark Remover", "Remove unwanted marks, logos, and timestamps from supported images with seamless neural inpainting.", "/remove/image", "/creative-suite/watermark_remover_city.jpg"],
  ["Gemini Video Watermark Remover", "Remove Gemini & Veo AI video watermarks with temporal neural inpainting and clean edge consistency.", "/gemini-video-watermark-remover", "/creative-suite/hero_ai_cyber_city.jpg"],
];
function Tools() { return <div className="tools-page"><header><p>AI TOOLS</p><h1>AI Tools Directory</h1><span>Find Bellix.us tools for Gemini watermark removal, image cleanup, background removal, upscaling, AI image and video generation, and PDF workflows — all in one workspace.</span></header><input aria-label="Search tools" placeholder="⌕   Search tools..." /><nav><button>All</button><button>Remove Watermark</button></nav><div className="tool-grid">{tools.map(([title, description, to, image]) => <Link key={title as string} to={to as any}><img src={image} alt="" className="object-cover w-full h-full" /><h2>{title}</h2><p>{description}</p></Link>)}</div></div> }
