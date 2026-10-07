const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== "node_modules" && item !== ".git" && item !== ".venv" && item !== "dist") {
        files.push(...walk(full));
      }
    } else {
      files.push(full);
    }
  }
  return files;
}

const srcFiles = walk("src");
const imageRefs = new Set();
const regex = /["'`]([^"'`\s]+\.(?:png|jpg|jpeg|webp))(?:\?[^"'`]*)?["'`]/gi;

for (const file of srcFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = regex.exec(content)) !== null) {
    let p = match[1];
    if (p.startsWith("/")) p = p.slice(1);
    if (!p.startsWith("http")) {
      imageRefs.add(p);
    }
  }
}

console.log("Found " + imageRefs.size + " unique image paths referenced in src:");
const sorted = Array.from(imageRefs).sort();
for (const img of sorted) {
  const pubPath = path.join("public", img);
  if (fs.existsSync(pubPath)) {
    const stat = fs.statSync(pubPath);
    console.log(`EXISTS: ${img} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`NOT IN PUBLIC: ${img}`);
  }
}
