import fs from "fs";
import path from "path";

const icons = {
  gemini: { src: "gemini-color.svg" },
  veo: { src: "deepmind-color.svg" },
  openai: { src: "openai.svg", fillWhite: true },
  sora: { src: "sora-color.svg" },
  midjourney: { src: "midjourney.svg", fillWhite: true },
  runway: { src: "runway.svg", fillWhite: true },
  kling: { src: "kling-color.svg" },
  luma: { src: "luma-color.svg" },
  pika: { src: "pika.svg", fillWhite: true },
  stability: { src: "stability-color.svg" },
  haiper: { src: "haiper.svg", fillWhite: true },
};

async function run() {
  for (const [name, config] of Object.entries(icons)) {
    const res = await fetch(`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${config.src}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${name}: ${res.status}`);
    }
    let svg = await res.text();

    // Standardize width/height to 100%
    svg = svg.split('width="1em"').join('width="100%"');
    svg = svg.split('height="1em"').join('height="100%"');

    if (config.fillWhite) {
      svg = svg.split('fill="currentColor"').join('fill="#FFFFFF"');
    }

    const srcPath = path.join("src", "assets", "models", `${name}.svg`);
    const publicPath = path.join("public", "models", `${name}.svg`);

    fs.mkdirSync(path.dirname(srcPath), { recursive: true });
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });

    fs.writeFileSync(srcPath, svg, "utf8");
    fs.writeFileSync(publicPath, svg, "utf8");

    console.log(`Saved ${name}.svg (${svg.length} bytes) to src and public`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
