#!/usr/bin/env node
/**
 * start-worker.js — Starts the Bellix Python FastAPI worker on 127.0.0.1:5000
 * Cross-platform (Windows / macOS / Linux) runner that automatically locates the
 * python virtual environment and runs uvicorn.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Candidates for watermark-backend directory
const candidateBackendDirs = [
  path.resolve(__dirname, "../../watermark-backend"),
  path.resolve(__dirname, "../watermark-backend"),
  path.resolve(process.cwd(), "../watermark-backend"),
  path.resolve(process.cwd(), "watermark-backend"),
];

let backendDir = candidateBackendDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, "main.py")));

if (!backendDir) {
  console.error("\x1b[31m[ERROR] Could not find 'watermark-backend' directory containing main.py.\x1b[0m");
  console.error("Checked locations:", candidateBackendDirs);
  process.exit(1);
}

// Candidates for Python binary
const isWin = process.platform === "win32";
const candidatePythons = [
  path.join(backendDir, ".venv", isWin ? "Scripts/python.exe" : "bin/python"),
  path.join(backendDir, "venv", isWin ? "Scripts/python.exe" : "bin/python"),
  isWin ? "python.exe" : "python3",
  "python",
];

let pythonExe = candidatePythons.find((p) => {
  if (p.includes("/") || p.includes("\\")) {
    return fs.existsSync(p);
  }
  return true; // system command
});

console.log("\x1b[36m%s\x1b[0m", "============================================================");
console.log("\x1b[36m%s\x1b[0m", "   Bellix AI Video Worker — Local Runner (Port 5000)        ");
console.log("\x1b[36m%s\x1b[0m", "============================================================");
console.log(`\x1b[32m[OK]\x1b[0m Backend Directory: ${backendDir}`);
console.log(`\x1b[32m[OK]\x1b[0m Python Binary:     ${pythonExe}`);
console.log(`\x1b[32m[OK]\x1b[0m Target Address:    http://127.0.0.1:5000`);
console.log(`\x1b[32m[OK]\x1b[0m Health Endpoint:  http://127.0.0.1:5000/health`);
console.log("\x1b[36m%s\x1b[0m", "------------------------------------------------------------");

const args = ["-m", "uvicorn", "main:app", "--app-dir", backendDir, "--host", "127.0.0.1", "--port", "5000"];

const child = spawn(pythonExe, args, {
  cwd: backendDir,
  stdio: "inherit",
  shell: isWin,
  env: {
    ...process.env,
    PYTHONUNBUFFERED: "1",
  },
});

child.on("error", (err) => {
  console.error("\x1b[31m[ERROR] Failed to start Python worker process:\x1b[0m", err);
  process.exit(1);
});

child.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m[EXIT] Python worker stopped with exit code ${code}\x1b[0m`);
    process.exit(code);
  }
});

// Clean termination on SIGINT / SIGTERM
process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  process.exit(0);
});
