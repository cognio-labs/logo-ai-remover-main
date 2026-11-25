import fs from 'fs';

globalThis.ImageData = class ImageData {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
};

const { cleanGeminiWatermarkPrecisionSync } = await import('./src/lib/geminiPrecisionEngine.ts');

const W = 260;
const H = 365;
const buf = fs.readFileSync('d:/logo-ai-remover-main/pure_portrait_rgba.bin');
const u8 = new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength);

const imgData = new ImageData(u8, W, H);

const result = cleanGeminiWatermarkPrecisionSync(imgData, { minConfidence: 0.35 });
console.log('Client Portrait Engine Result:');
console.log('Applied:', result.applied);
console.log('Confidence:', result.confidence);
console.log('Box:', result.box);
console.log('Template:', result.template);
console.log('Scale:', result.scale);
