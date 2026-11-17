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
      "The browser engine accepts MP4, MOV, WebM, and MKV files up to 100 MB. Chrome or Edge with compatible video codecs is required. Output is re-encoded MP4.",
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
      className="mx-auto max-w-5xl px-6 py-12 space-y-6"
      aria-label={`${d.name} usage guide`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/tools">Tools</Link> / {d.name}
      </nav>
      <h2>Supported files and requirements</h2>
      <p>{d.limits}</p>
      <h2>How to use this tool</h2>
      <ol>
        <li>Select an original supported file in the tool above.</li>
        <li>Run processing and wait for the preview or an error message.</li>
        <li>
          Compare the result with your source, then use the download control if you are satisfied.
        </li>
      </ol>
      <h2>When to use it</h2>
      <p>{d.use}.</p>
      <h2>What to check before downloading</h2>
      <p>{d.caution}</p>
      <h2>Common questions</h2>
      <h3>Will every file produce a usable result?</h3>
      <p>
        No. Source quality, unsupported marks, browser resources, and service availability can
        affect processing. Keep your original.
      </p>
      <h3>What does it cost?</h3>
      <p>
        Review any access or credit requirements shown in the tool before processing. A file-size
        limit is not a promise of unlimited free usage.
      </p>
      <h3>How is my file handled?</h3>
      <p>
        {tool.startsWith("gemini-")
          ? "The supported cleanup engine runs in your browser. Avoid assuming this is a site-wide zero-retention guarantee."
          : "Review the selected workflow before using confidential media. This page does not promise zero retention for backend processing."}
      </p>
      <h2>Related tools</h2>
      <ul>
        {Object.entries(details)
          .filter(([key]) => key !== tool)
          .map(([key, value]) => (
            <li key={key}>
              <Link href={`/${key}`}>{value.name}</Link>
            </li>
          ))}
      </ul>
    </section>
  );
}
