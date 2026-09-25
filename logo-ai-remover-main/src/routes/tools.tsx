import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools")({ head: () => ({ meta: [{ title: "AI Tools Directory | Pilio" }] }), component: Tools });
const tools = [
  ["4K / 8K Upscaler", "Super-resolution for images, designs and photos. Recover texture and export sharp high-resolution outputs.", "/upscale", "image-upscaler.webp"],
  ["AI Background Remover", "Remove image backgrounds online in one click with clean edges and export a transparent PNG cutout.", "/background-remover", "background-remover.webp"],
  ["Video Enhancer", "Enhance, upscale and restore video quality with AI motion smoothing and frame detail reconstruction.", "/video-enhancer", "video-enhancer.webp"],
  ["PDF Watermark Remover", "Clean supported PDF documents with structural background layer removal while keeping vector fonts crisp.", "/pdf-watermark-remover", "pdf-watermark-remover.webp"],
  ["Image Watermark Remover", "Remove unwanted marks, logos, and timestamps from supported images with seamless neural inpainting.", "/remove/image", "image-watermark-remover.webp"],
  ["Gemini Video Watermark Remover", "Remove Gemini & Veo AI video watermarks with temporal neural inpainting and clean edge consistency.", "/gemini-video-watermark-remover", "video-enhancer.webp"],
];
function Tools() { return <div className="tools-page"><header><p>AI TOOLS</p><h1>AI Tools Directory</h1><span>Find Pilio tools for Gemini watermark removal, image cleanup, background removal, upscaling, AI image and video generation, and PDF workflows — all in one workspace.</span></header><input aria-label="Search tools" placeholder="⌕   Search tools..." /><nav><button>All</button><button>Remove Watermark</button></nav><div className="tool-grid">{tools.map(([title, description, to, image]) => <Link key={title as string} to={to as any}><img src={`https://pilio.ai/images/tools/lovart-adapted-v2/${image}?dpl=73b0d06d0bbef755e1333c9ffed2d3dafe192ca1`} alt="" /><h2>{title}</h2><p>{description}</p></Link>)}</div></div> }
