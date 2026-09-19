import fs from "fs";
import path from "path";

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".output" && entry.name !== ".tanstack") {
        processDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      let content = fs.readFileSync(fullPath, "utf8");
      const hasBlack = content.includes("font-black");
      const hasExtrabold = content.includes("font-extrabold");
      if (hasBlack || hasExtrabold) {
        content = content.replaceAll("font-black", "font-semibold");
        content = content.replaceAll("font-extrabold", "font-semibold");
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`Softened font weights in: ${fullPath}`);
      }
    }
  }
}

processDir("src");
console.log("Completed softening font weights across src/");
