import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/tools")({
  head: () => ({ meta: [{ title: "AI Tools Directory | Bellix.us" }] }),
  component: Tools,
});

const DEFAULT_TOOLS = [
  {
    id: "bg-remover",
    title: "AI Background Remover",
    desc: "Remove image backgrounds online in one click with clean edges and export a transparent PNG cutout.",
    to: "/background-remover",
    image: "/creative-suite/background_remover_studio.jpg",
    enabled: true,
    creditCost: 1,
  },
  {
    id: "pdf-cleaner",
    title: "PDF Watermark Remover",
    desc: "Clean supported PDF documents with structural background layer removal while keeping vector fonts crisp.",
    to: "/pdf-watermark-remover",
    image: "/creative-suite/pdf_cleaner_blueprint.jpg",
    enabled: true,
    creditCost: 1,
  },
  {
    id: "image-watermark",
    title: "Image Watermark Remover",
    desc: "Remove unwanted marks, logos, and timestamps from supported images with seamless neural inpainting.",
    to: "/remove/image",
    image: "/creative-suite/watermark_remover_city.jpg",
    enabled: true,
    creditCost: 1,
  },
  {
    id: "gemini-video",
    title: "Gemini Video Watermark Remover",
    desc: "Remove Gemini & Veo AI video watermarks with temporal neural inpainting and clean edge consistency.",
    to: "/gemini-video-watermark-remover",
    image: "/creative-suite/hero_ai_cyber_city.jpg",
    enabled: true,
    creditCost: 3,
  },
];

function Tools() {
  const [toolsList, setToolsList] = useState(DEFAULT_TOOLS);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadLiveTools() {
      try {
        const { data: dbTools, error } = await supabase.from("tools").select("*");
        if (!error && dbTools && dbTools.length > 0) {
          setToolsList((prev) =>
            prev.map((tool) => {
              const matched = dbTools.find(
                (t) =>
                  t.id === tool.id ||
                  t.slug === tool.id ||
                  tool.title.toLowerCase().includes(t.name.toLowerCase().split(" ")[0])
              );
              if (matched) {
                return {
                  ...tool,
                  title: matched.name,
                  desc: matched.description || tool.desc,
                  enabled: matched.enabled ?? true,
                  creditCost: matched.credit_cost ?? tool.creditCost,
                };
              }
              return tool;
            })
          );
        }
      } catch (err) {
        console.warn("Using fallback tools configuration:", err);
      }
    }
    loadLiveTools();
  }, []);

  const filtered = toolsList.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tools-page">
      <header>
        <p>AI TOOLS</p>
        <h1>AI Tools Directory</h1>
        <span>
          Find Bellix.us tools for Gemini watermark removal, image cleanup, background removal,
          upscaling, AI image and video generation, and PDF workflows — all in one workspace.
        </span>
      </header>
      <input
        aria-label="Search tools"
        placeholder="⌕   Search tools..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <nav>
        <button className="active">All Tools ({filtered.length})</button>
      </nav>
      <div className="tool-grid">
        {filtered.map((tool) => (
          <Link
            key={tool.title}
            to={tool.to as any}
            className={`relative group ${!tool.enabled ? "opacity-60 pointer-events-none" : ""}`}
          >
            <img src={tool.image} alt={tool.title} className="object-cover w-full h-full" />
            <div className="flex items-center justify-between gap-2 mt-2">
              <h2>{tool.title}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                {tool.creditCost} {tool.creditCost === 1 ? "credit" : "credits"}
              </span>
            </div>
            <p>{tool.desc}</p>
            {!tool.enabled && (
              <div className="absolute top-3 right-3 bg-amber-500 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow">
                Maintenance
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

