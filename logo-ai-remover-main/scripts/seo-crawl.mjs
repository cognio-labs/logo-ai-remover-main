import fs from "node:fs/promises";
const base = process.argv[2] || "https://www.bellix.us";
const output = process.argv[3] || "docs/seo/baseline.json";
const routes = (await fs.readdir("src/app", { recursive: true }))
  .filter((p) => p.endsWith("page.tsx"))
  .map((p) => "/" + p.replaceAll("\\", "/").replace(/\/?page.tsx$/, ""))
  .filter((p) => !p.includes("api/"));
let sitemapRoutes = [];
try {
  const xml = await (await fetch(new URL("/sitemap.xml", base))).text();
  sitemapRoutes = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
} catch {}
const queue = [...new Set(["/", ...routes, ...sitemapRoutes, "/seo-missing-page-check"])],
  seen = new Set(),
  rows = [];
const decode = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
while (queue.length && seen.size < 100) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  try {
    const start = performance.now();
    let res = await fetch(new URL(path, base), {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    const hops = [];
    while (
      res.status >= 300 &&
      res.status < 400 &&
      res.headers.get("location") &&
      hops.length < 8
    ) {
      const destination = new URL(res.headers.get("location"), res.url);
      hops.push({ status: res.status, from: res.url, to: destination.href });
      res = await fetch(destination, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    }
    const reader = res.body.getReader();
    let html = "",
      first = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!first) first = chunk;
      html += chunk;
    }
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    for (const link of links) {
      try {
        const u = new URL(link, base);
        if (
          u.origin === new URL(base).origin &&
          !u.pathname.includes(".") &&
          !u.pathname.startsWith("/api/") &&
          !seen.has(u.pathname)
        )
          queue.push(u.pathname);
      } catch {}
    }
    const meta = (name) =>
      [...html.matchAll(/<meta\b[^>]*>/g)]
        .find((m) => m[0].includes(`name="${name}"`))?.[0]
        .match(/content="([^"]*)"/)?.[1] || null;
    rows.push({
      path,
      status: hops[0]?.status || res.status,
      finalStatus: res.status,
      hops,
      destination: res.url,
      fetchMs: Math.round(performance.now() - start),
      bytes: Buffer.byteLength(html),
      title: html.match(/<title>(.*?)<\/title>/s)?.[1],
      description: meta("description"),
      robots: meta("robots"),
      canonical: html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1],
      headings: [...html.matchAll(/<(h[1-6])\b[^>]*>(.*?)<\/h[1-6]>/gs)].map((m) => ({
        level: m[1],
        text: decode(m[2]),
      })),
      firstChunkHasH1: /<h1\b/.test(first),
      completeHasH1: /<h1\b/.test(html),
      links: [...new Set(links)],
      structuredData: [
        ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs),
      ].map((m) => {
        try {
          return JSON.parse(m[1]);
        } catch {
          return "invalid JSON";
        }
      }),
    });
  } catch (e) {
    rows.push({ path, error: String(e) });
  }
}
await fs.mkdir("docs/seo", { recursive: true });
await fs.writeFile(
  output,
  JSON.stringify(
    {
      date: new Date().toISOString(),
      base,
      notes:
        "Raw complete HTTP HTML; first network chunk is transport-dependent, not a guaranteed React shell boundary. Browser DOM and field metrics require separate measurement.",
      rows,
    },
    null,
    2,
  ),
);
console.log(`${rows.length} URLs saved to ${output}`);
