import fs from "fs";
import path from "path";

function findFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findFiles(full));
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles("src");
const imageMap = {};

for (const f of files) {
  const content = fs.readFileSync(f, "utf-8");
  const matches = content.match(/\/[\w\-\.\/]+\.(png|jpg|jpeg|webp)/g);
  if (matches) {
    for (const m of matches) {
      if (!imageMap[m]) imageMap[m] = [];
      imageMap[m].push(f);
    }
  }
}

console.log(`Found ${Object.keys(imageMap).length} unique image paths in src:`);
for (const [k, v] of Object.entries(imageMap).sort()) {
  const localPath = "public" + k;
  let sizeStr = "MISSING";
  if (fs.existsSync(localPath)) {
    const sz = fs.statSync(localPath).size;
    sizeStr = (sz / 1024).toFixed(1) + " KB";
  }
  console.log(`${k} -> ${sizeStr} (used in ${v.length} files)`);
}
