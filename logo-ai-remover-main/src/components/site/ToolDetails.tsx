import Link from "next/link";

const details = {
  "background-remover": {
    name: "Image background removal",
    limits:
      "The uploader enforces a 35 MB image limit. Use PNG, JPEG, or WebP for broad browser compatibility. Export PNG to retain transparency; JPEG needs a background.",
    use: "Product photos, portraits, and design cutouts",
    caution: "Hair, glass, shadows, and low-contrast edges may need manual review.",
  },
  "gemini-image-watermark-remover": {
    name: "Gemini image watermark cleanup",
    limits:
      "PNG, JPEG, and WebP files up to 25 MB are accepted. This tool processes supported visible sparkle marks in the browser.",
    use: "Cleaning a supported visible corner mark from your original Gemini export",
    caution:
      "Resizing, cropping, or recompressing the source can prevent a reliable match. This does not remove invisible SynthID.",
  },
  "gemini-video-watermark-remover": {
    name: "Gemini and Veo video cleanup",
    limits:
      "The video worker accepts MP4, MOV, WebM and MKV files up to 500 MB. Output is re-encoded MP4.",
    use: "Cleaning supported visible sparkle marks from original Gemini or Veo exports",
    caution:
      "Review the entire clip, including motion and audio. Re-encoding can change pixels outside the mark. This does not remove invisible SynthID.",
  },
  "pdf-watermark-remover": {
    name: "PDF watermark cleanup",
    limits:
      "The document studio limits PDFs to 50 MB and 25 pages. PDF processing requires the document service to be available.",
    use: "Removing supported watermark layers from documents you own or are permitted to edit",
    caution:
      "Flattened or scanned marks may be part of the page image. Review text, layout, and every output page.",
  },
};

export function ToolDetails({ tool }: { tool: keyof typeof details }) {
  const d = details[tool];
  const url = `https://www.bellix.us/${tool}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: d.name,
        url,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web browser",
        description: d.limits,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.bellix.us/" },
          { "@type": "ListItem", position: 2, name: "Tools", item: "https://www.bellix.us/tools" },
          { "@type": "ListItem", position: 3, name: d.name, item: url },
        ],
      },
    ],
  };
  return (
    <section
      className="mx-auto max-w-5xl px-4 sm:px-6 py-12"
      aria-label={`${d.name} usage guide`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <div className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-white p-6 sm:p-10 shadow-[6px_6px_0px_#0b0f0d] space-y-6 text-[#0b0f0d]">
        <nav aria-label="Breadcrumb" className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
          <Link href="/" className="underline">Home</Link>
          <span>/</span>
          <Link href="/tools" className="underline">Tools</Link>
          <span>/</span>
          <span>{d.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] space-y-2">
            <h2 className="text-lg font-black text-[#0b0f0d]">Supported files and requirements</h2>
            <p className="text-sm text-[#26302b] font-medium leading-relaxed">{d.limits}</p>
          </div>

          <div className="p-5 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] space-y-2">
            <h2 className="text-lg font-black text-[#0b0f0d]">How to use this tool</h2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-[#26302b] font-medium">
              <li>Select an original supported file in the tool above.</li>
              <li>Run processing and wait for the preview or an error message.</li>
              <li>Compare the result with your source, then download when ready.</li>
            </ol>
          </div>

          <div className="p-5 rounded-lg border-2 border-[#0b0f0d] bg-[#a8e6cf] space-y-2">
            <h2 className="text-lg font-black text-[#0b0f0d]">When to use it</h2>
            <p className="text-sm text-[#0b0f0d] font-semibold">{d.use}.</p>
          </div>

          <div className="p-5 rounded-lg border-2 border-[#0b0f0d] bg-[#ffe500] space-y-2">
            <h2 className="text-lg font-black text-[#0b0f0d]">What to check before downloading</h2>
            <p className="text-sm text-[#0b0f0d] font-semibold">{d.caution}</p>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t-2 border-[#0b0f0d]">
          <h2 className="text-2xl font-black text-[#0b0f0d]">Common questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border-2 border-[#0b0f0d] bg-white">
              <h3 className="text-sm font-black text-[#0b0f0d] mb-1.5">Will every file produce a usable result?</h3>
              <p className="text-xs text-[#26302b] leading-relaxed font-medium">
                No. Source quality, unsupported marks, browser resources, and service availability can affect processing. Keep your original.
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-[#0b0f0d] bg-white">
              <h3 className="text-sm font-black text-[#0b0f0d] mb-1.5">What does it cost?</h3>
              <p className="text-xs text-[#26302b] leading-relaxed font-medium">
                Review any access or credit requirements shown in the tool before processing. A file-size limit is not a promise of unlimited free usage.
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-[#0b0f0d] bg-white">
              <h3 className="text-sm font-black text-[#0b0f0d] mb-1.5">How is my file handled?</h3>
              <p className="text-xs text-[#26302b] leading-relaxed font-medium">
                {tool === "gemini-video-watermark-remover"
                  ? "The video worker deletes the upload after processing and keeps the exported MP4 available for 15 minutes."
                  : tool === "gemini-image-watermark-remover"
                    ? "The image cleanup engine runs in your browser."
                    : "Review the selected workflow before using confidential media."}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t-2 border-[#0b0f0d]">
          <h2 className="text-lg font-black text-[#0b0f0d] mb-3">Related tools</h2>
          <ul className="flex flex-wrap gap-3">
            {Object.entries(details)
              .filter(([key]) => key !== tool)
              .map(([key, value]) => (
                <li key={key}>
                  <Link
                    href={`/${key}`}
                    className="inline-flex items-center px-4 py-2 rounded-md border-2 border-[#0b0f0d] bg-[#d0f471] hover:bg-[#ffe500] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] transition-all"
                  >
                    {value.name} →
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
