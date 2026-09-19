import fs from "fs";

let css = fs.readFileSync("src/styles.css", "utf8");

const replacements = [
  ['font-family:Georgia,"Times New Roman",serif', "font-family:var(--font-sans)"],
  ['font-family:Georgia,serif', "font-family:var(--font-sans)"],
  ['font-family:Arial,Helvetica,sans-serif', "font-family:var(--font-sans)"],
  ['font-family:Arial,sans-serif', "font-family:var(--font-sans)"],
  ['font-weight:800', "font-weight:600"],
  ['font-weight:700', "font-weight:500"],
  ['font-weight:bold', "font-weight:600"],
];

for (const [from, to] of replacements) {
  css = css.split(from).join(to);
}

fs.writeFileSync("src/styles.css", css, "utf8");
console.log("Replaced fonts and weights in src/styles.css successfully!");
