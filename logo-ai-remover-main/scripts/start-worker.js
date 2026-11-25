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

const withWeb = process.argv.includes("--with-web");
const nextCli = withWeb ? require.resolve("next/dist/bin/next") : null;
const children = [
  spawn(pythonExe, args, {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  }),
];

if (nextCli) {
  children.push(
    spawn(process.execPath, [nextCli, "dev", "-p", "5678"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    }),
  );
}

let shuttingDown = false;
function stop(code, signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Failed to start a Bellix development service.", error);
    stop(1);
  });
  child.on("close", (code) => stop(code ?? 1));
}

process.on("SIGINT", () => stop(0, "SIGINT"));
process.on("SIGTERM", () => stop(0));
