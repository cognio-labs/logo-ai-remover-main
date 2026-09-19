import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("public/upscale");

async function generateTypography() {
  const svg = `
  <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E2E8F0" />
        <stop offset="50%" stop-color="#EDF2F7" />
        <stop offset="100%" stop-color="#E2E8F0" />
      </linearGradient>
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E293B" />
        <stop offset="100%" stop-color="#334155" />
      </linearGradient>
      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#3B82F6" flood-opacity="0.12"/>
      </filter>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <circle cx="300" cy="300" r="210" fill="#DBEAFE" opacity="0.45"/>
    <g filter="url(#softGlow)">
      <text x="300" y="380" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="280" fill="url(#textGrad)" letter-spacing="-6">Aa</text>
    </g>
  </svg>`;

  const highBuf = await sharp(Buffer.from(svg)).resize(500, 500).jpeg({ quality: 95 }).toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "card_typography_high.jpg"), highBuf);

  // Low quality version (blurred + slightly downsampled)
  const lowBuf = await sharp(highBuf)
    .resize(50, 50, { kernel: "nearest" })
    .blur(1.5)
    .resize(500, 500, { kernel: "nearest" })
    .jpeg({ quality: 40 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "card_typography_low.jpg"), lowBuf);
  console.log("Typography card images generated");
}

async function generateKnitTexture() {
  // Generate a procedural knit / fabric weave texture using SVG patterns
  const svg = `
  <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="knitBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E293B" />
        <stop offset="50%" stop-color="#283548" />
        <stop offset="100%" stop-color="#1E293B" />
      </linearGradient>
      <pattern id="knitPattern" width="40" height="50" patternUnits="userSpaceOnUse">
        <path d="M10,0 C15,12 25,12 30,0 M0,25 C5,12 15,12 20,25 C25,38 35,38 40,25 M10,50 C15,38 25,38 30,50" 
              stroke="#64748B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M10,0 C15,12 25,12 30,0 M0,25 C5,12 15,12 20,25 C25,38 35,38 40,25 M10,50 C15,38 25,38 30,50" 
              stroke="#94A3B8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.6"/>
        <circle cx="20" cy="12" r="2" fill="#CBD5E1" opacity="0.4"/>
        <circle cx="20" cy="38" r="2" fill="#CBD5E1" opacity="0.4"/>
      </pattern>
    </defs>
    <rect width="600" height="600" fill="url(#knitBg)"/>
    <rect width="600" height="600" fill="url(#knitPattern)"/>
    <circle cx="300" cy="300" r="240" fill="#3B82F6" opacity="0.1" filter="blur(30px)"/>
  </svg>`;

  // Or let's use wildlife fur if available, but let's also have this knit texture
  const highBuf = await sharp(Buffer.from(svg)).resize(500, 500).jpeg({ quality: 95 }).toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "card_texture_high.jpg"), highBuf);

  const lowBuf = await sharp(highBuf)
    .resize(35, 35, { kernel: "nearest" })
    .blur(2)
    .resize(500, 500, { kernel: "nearest" })
    .jpeg({ quality: 35 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "card_texture_low.jpg"), lowBuf);
  console.log("Texture card images generated");
}

async function processCardImages() {
  // 1. Sub-pixel face
  const facePath = path.join(OUT_DIR, "subpixel_face.jpg");
  if (fs.existsSync(facePath)) {
    const high = await sharp(facePath).resize(500, 500, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_subpixel_high.jpg"), high);

    const low = await sharp(facePath)
      .resize(500, 500, { fit: "cover" })
      .resize(45, 45, { kernel: "nearest" })
      .resize(500, 500, { kernel: "nearest" })
      .jpeg({ quality: 35 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_subpixel_low.jpg"), low);
    console.log("Card 1 subpixel processed");
  }

  // 2. Mountain lake
  const mountainPath = path.join(OUT_DIR, "mountain_lake.jpg");
  if (fs.existsSync(mountainPath)) {
    const high = await sharp(mountainPath).resize(500, 500, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_mountain_high.jpg"), high);

    const low = await sharp(mountainPath)
      .resize(500, 500, { fit: "cover" })
      .blur(4)
      .jpeg({ quality: 40 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_mountain_low.jpg"), low);
    console.log("Card 2 mountain processed");
  }

  // 3. Skin detail
  const skinPath = path.join(OUT_DIR, "skin_detail.jpg");
  if (fs.existsSync(skinPath)) {
    const high = await sharp(skinPath).resize(500, 500, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_skin_high.jpg"), high);

    const low = await sharp(skinPath)
      .resize(500, 500, { fit: "cover" })
      .blur(3)
      .jpeg({ quality: 45 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_skin_low.jpg"), low);
    console.log("Card 3 skin detail processed");
  }

  // 4. Wildlife texture (Snow Leopard fur & whiskers)
  const wildlifePath = path.join(OUT_DIR, "wildlife.png");
  if (fs.existsSync(wildlifePath)) {
    const high = await sharp(wildlifePath).resize(500, 500, { fit: "cover", position: "centre" }).jpeg({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_fur_high.jpg"), high);

    const low = await sharp(wildlifePath)
      .resize(500, 500, { fit: "cover", position: "centre" })
      .resize(40, 40, { kernel: "nearest" })
      .resize(500, 500, { kernel: "nearest" })
      .jpeg({ quality: 35 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_fur_low.jpg"), low);
    console.log("Card 4 fur texture processed");
  }

  // 6. Smart Edge Restoration (Portrait edge)
  const portraitPath = path.join(OUT_DIR, "portrait.png");
  if (fs.existsSync(portraitPath)) {
    const high = await sharp(portraitPath).resize(500, 500, { fit: "cover", position: "top" }).jpeg({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_edge_high.jpg"), high);

    const low = await sharp(portraitPath)
      .resize(500, 500, { fit: "cover", position: "top" })
      .blur(3.5)
      .jpeg({ quality: 35 })
      .toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, "card_edge_low.jpg"), low);
    console.log("Card 6 edge processed");
  }
}

async function main() {
  await generateTypography();
  await generateKnitTexture();
  await processCardImages();
  console.log("All card images processed successfully!");
}

main().catch(console.error);
