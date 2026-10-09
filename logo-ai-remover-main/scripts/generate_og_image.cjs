const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createOgImage() {
  const width = 1200;
  const height = 630;

  // Read the logo mark and navbar logo
  const markBuffer = await sharp('public/creative-suite/bellix_mark.png')
    .trim()
    .resize({ height: 160, fit: 'contain' })
    .toBuffer();
  const markBase64 = `data:image/png;base64,${markBuffer.toString('base64')}`;

  const svgBanner = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradients -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFDF9" />
        <stop offset="50%" stop-color="#FFF5F5" />
        <stop offset="100%" stop-color="#FFEBEF" />
      </linearGradient>

      <radialGradient id="glowTopRight" cx="85%" cy="15%" r="55%">
        <stop offset="0%" stop-color="#FDA4AF" stop-opacity="0.35" />
        <stop offset="60%" stop-color="#FDA4AF" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="glowBottomLeft" cx="15%" cy="85%" r="55%">
        <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.22" />
        <stop offset="60%" stop-color="#F43F5E" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
      </radialGradient>

      <!-- Card Gradient -->
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.82" />
      </linearGradient>

      <!-- Crimson Accent Gradient -->
      <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E11D48" />
        <stop offset="100%" stop-color="#BE123C" />
      </linearGradient>

      <!-- Badge Gradient -->
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFE4E6" />
        <stop offset="100%" stop-color="#FECDD3" />
      </linearGradient>

      <!-- Pill border gradient -->
      <linearGradient id="pillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#FFF1F2" />
      </linearGradient>

      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#E11D48" flood-opacity="0.12" />
        <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#000000" flood-opacity="0.05" />
      </filter>

      <filter id="pillShadow" x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.04" />
      </filter>
    </defs>

    <!-- Base Canvas -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#glowTopRight)" />
    <rect width="${width}" height="${height}" fill="url(#glowBottomLeft)" />

    <!-- Subtle Grid / Tech Pattern Overlay -->
    <g opacity="0.18">
      <line x1="80" y1="0" x2="80" y2="630" stroke="#E11D48" stroke-width="1" stroke-dasharray="4 8" />
      <line x1="1120" y1="0" x2="1120" y2="630" stroke="#E11D48" stroke-width="1" stroke-dasharray="4 8" />
      <line x1="0" y1="60" x2="1200" y2="60" stroke="#E11D48" stroke-width="1" stroke-dasharray="4 8" />
      <line x1="0" y1="570" x2="1200" y2="570" stroke="#E11D48" stroke-width="1" stroke-dasharray="4 8" />
    </g>

    <!-- Center Card -->
    <rect x="70" y="50" width="1060" height="530" rx="32" fill="url(#cardGrad)" stroke="#FFE4E6" stroke-width="2" filter="url(#cardShadow)" />

    <!-- Top Badge -->
    <g transform="translate(600, 95)">
      <rect x="-175" y="0" width="350" height="34" rx="17" fill="url(#badgeGrad)" stroke="#FDA4AF" stroke-width="1" />
      <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#BE123C" letter-spacing="1.5" text-anchor="middle">
        ✦ ALL-IN-ONE AI CREATIVE STUDIO
      </text>
    </g>

    <!-- Main Branding Header: Logo + Bellix.us -->
    <g transform="translate(600, 160)">
      <!-- Centered Logo Image - Vertically aligned with Bellix text -->
      <image href="${markBase64}" x="-235" y="-5" height="115" preserveAspectRatio="xMidYMid meet" />
      
      <!-- Brand Title -->
      <text x="-105" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="76" font-weight="900" letter-spacing="-1.5">
        <tspan fill="#09090B">Bellix</tspan><tspan fill="#E11D48">.us</tspan>
      </text>
      
      <!-- Luxury subtitle badge -->
      <text x="-100" y="104" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#71717A" letter-spacing="4">
        LUXURY AI CREATIVE SUITE
      </text>
    </g>

    <!-- Tagline description -->
    <text x="600" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="500" fill="#3F3F46" text-anchor="middle">
      Remove Backgrounds • 4K/8K Upscaler • Video Watermark Cleaner • PDF Tools
    </text>

    <!-- 4 Feature Badges (Grid) -->
    <!-- Pill 1: Background Remover -->
    <g transform="translate(130, 365)" filter="url(#pillShadow)">
      <rect width="215" height="64" rx="16" fill="url(#pillGrad)" stroke="#FECDD3" stroke-width="1.5" />
      <text x="24" y="28" font-size="20">✨</text>
      <text x="56" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#09090B">AI BG Remover</text>
      <text x="56" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#71717A">1-Click Transparent PNG</text>
    </g>

    <!-- Pill 2: 4K Upscaler -->
    <g transform="translate(365, 365)" filter="url(#pillShadow)">
      <rect width="215" height="64" rx="16" fill="url(#pillGrad)" stroke="#FECDD3" stroke-width="1.5" />
      <text x="24" y="28" font-size="20">🔍</text>
      <text x="56" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#09090B">4K Image Upscaler</text>
      <text x="56" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#71717A">Ultra HD Clarity Boost</text>
    </g>

    <!-- Pill 3: Video Watermark -->
    <g transform="translate(600, 365)" filter="url(#pillShadow)">
      <rect width="215" height="64" rx="16" fill="url(#pillGrad)" stroke="#FECDD3" stroke-width="1.5" />
      <text x="24" y="28" font-size="20">🎬</text>
      <text x="56" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#09090B">Video Mark Cleaner</text>
      <text x="56" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#71717A">Gemini + Veo Marks</text>
    </g>

    <!-- Pill 4: PDF Remover -->
    <g transform="translate(835, 365)" filter="url(#pillShadow)">
      <rect width="215" height="64" rx="16" fill="url(#pillGrad)" stroke="#FECDD3" stroke-width="1.5" />
      <text x="24" y="28" font-size="20">📄</text>
      <text x="56" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#09090B">PDF Watermark</text>
      <text x="56" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#71717A">Clean Document Stamps</text>
    </g>

    <!-- Footer Bar inside card -->
    <!-- Divider -->
    <line x1="120" y1="465" x2="1080" y2="465" stroke="#F4F4F5" stroke-width="1.5" />

    <g transform="translate(600, 505)">
      <!-- Left trust points -->
      <text x="-460" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#3F3F46">
        ✦ Free &amp; Unlimited  •  ✦ No Signup Required  •  ✦ 100% Private &amp; Secure
      </text>

      <!-- Right URL button -->
      <g transform="translate(310, -16)">
        <rect width="165" height="40" rx="20" fill="url(#crimsonGrad)" />
        <text x="82" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
          bellix.us ↗
        </text>
      </g>
    </g>
  </svg>
  `;

  // Render SVG to Buffer
  const svgBuffer = Buffer.from(svgBanner);

  // 1. Generate og-image.jpg (JPEG with quality 92 - ideal for WhatsApp crawler under 200KB)
  const jpgBuffer = await sharp(svgBuffer)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile('public/og-image.jpg');

  // 2. Generate og-image.png (optimized PNG)
  const pngBuffer = await sharp(svgBuffer)
    .png({ compressionLevel: 8 })
    .toFile('public/og-image.png');

  console.log('Generated og-image.jpg:', jpgBuffer);
  console.log('Generated og-image.png:', pngBuffer);
}

createOgImage().catch(console.error);
