#!/usr/bin/env node
/**
 * check-environment.js — Verifies all development requirements for Bellix AI Studio.
 * Tests: Python version, installed requirements, ffmpeg on PATH, port 5000 / worker status.
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let allPassed = true;

function logPass(title, details = "") {
  console.log(` ${GREEN}✔ [PASS]${RESET} ${BOLD}${title}${RESET}${details ? ` — ${details}` : ""}`);
}

function logFail(title, error = "", hint = "") {
  allPassed = false;
  console.log(` ${RED}✖ [FAIL]${RESET} ${BOLD}${title}${RESET}`);
  if (error) console.log(`          ${RED}${error}${RESET}`);
  if (hint) console.log(`          ${CYAN}💡 Fix: ${hint}${RESET}`);
}

function logInfo(title, details = "") {
  console.log(` ${YELLOW}ℹ [INFO]${RESET} ${BOLD}${title}${RESET}${details ? ` — ${details}` : ""}`);
}

console.log(`\n${CYAN}${BOLD}============================================================${RESET}`);
console.log(`${CYAN}${BOLD}       Bellix AI Studio — Local Environment Diagnostics     ${RESET}`);
console.log(`${CYAN}${BOLD}============================================================${RESET}\n`);

// 1. Locate Backend & Python Binary
const isWin = process.platform === "win32";
const candidateBackendDirs = [
  path.resolve(__dirname, "../../watermark-backend"),
  path.resolve(__dirname, "../watermark-backend"),
  path.resolve(process.cwd(), "../watermark-backend"),
  path.resolve(process.cwd(), "watermark-backend"),
];
const backendDir = candidateBackendDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, "main.py")));

let pythonExe = null;
if (backendDir) {
  const venvPython = path.join(backendDir, ".venv", isWin ? "Scripts/python.exe" : "bin/python");
  if (fs.existsSync(venvPython)) {
    pythonExe = venvPython;
  }
}
if (!pythonExe) {
  pythonExe = isWin ? "python.exe" : "python3";
}

// Check 1: Python Version
try {
  const pyVerOut = execSync(`"${pythonExe}" --version`, { encoding: "utf-8" }).trim();
  const match = pyVerOut.match(/Python\s+([0-9]+)\.([0-9]+)\.([0-9]+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major === 3 && minor >= 10) {
      logPass("Python Version", `${pyVerOut} (${path.basename(pythonExe)} at ${pythonExe})`);
    } else {
      logFail("Python Version", `Found ${pyVerOut}, but Python 3.10+ is required.`, "Install Python 3.10 or 3.11.");
    }
  } else {
    logPass("Python Version", pyVerOut);
  }
} catch (e) {
  logFail("Python Installation", e.message, "Ensure Python is installed and added to your system PATH.");
}

// Check 2: Installed Backend Requirements
try {
  const reqCheckCmd = `"${pythonExe}" -c "import fastapi, uvicorn, cv2, PIL, numpy; print('ALL_IMPORTS_OK')"`;
  const reqOut = execSync(reqCheckCmd, { encoding: "utf-8", cwd: backendDir || process.cwd() }).trim();
  if (reqOut.includes("ALL_IMPORTS_OK")) {
    logPass("Python Dependencies", "fastapi, uvicorn, opencv-python, pillow, numpy verified");
  } else {
    logFail("Python Dependencies", reqOut, "Run: pip install -r requirements.txt in watermark-backend/.venv");
  }
} catch (e) {
  logFail("Python Dependencies", "Missing one or more required Python packages (fastapi, cv2, etc.).", "cd watermark-backend && .\\.venv\\Scripts\\pip install -r requirements.txt");
}

// Check 3: FFmpeg on PATH
let ffmpegOk = false;
let ffprobeOk = false;
try {
  const ffOut = execSync("ffmpeg -version", { encoding: "utf-8" });
  const firstLine = ffOut.split("\n")[0].trim();
  ffmpegOk = true;
  logPass("FFmpeg on PATH", firstLine);
} catch {
  logFail("FFmpeg on PATH", "ffmpeg command not found.", "Download ffmpeg from gyan.dev/ffmpeg or via winget install Gyan.FFmpeg and add bin/ to PATH.");
}

try {
  const ffprobeOut = execSync("ffprobe -version", { encoding: "utf-8" });
  const firstLine = ffprobeOut.split("\n")[0].trim();
  ffprobeOk = true;
  logPass("FFprobe on PATH", firstLine);
} catch {
  logFail("FFprobe on PATH", "ffprobe command not found.", "Ensure ffprobe.exe is in the same folder as ffmpeg.exe and on system PATH.");
}

// Check 4: Port 5000 & Worker Reachability
function checkWorkerHealth() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:5000/health", { timeout: 2500 }, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(raw);
          if (res.statusCode === 200 && (data.ok || data.status === "ok" || data.status === "healthy")) {
            resolve({ running: true, healthy: true, data });
          } else {
            resolve({ running: true, healthy: false, data, status: res.statusCode });
          }
        } catch {
          resolve({ running: true, healthy: false, raw });
        }
      });
    });
    req.on("error", (err) => {
      resolve({ running: false, error: err.message });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ running: false, error: "Connection timed out" });
    });
  });
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false); // occupied
      } else {
        resolve(true);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(true); // free
    });
    server.listen(port, "127.0.0.1");
  });
}

async function runNetworkChecks() {
  const workerStatus = await checkWorkerHealth();
  if (workerStatus.running) {
    if (workerStatus.healthy) {
      logPass("Python Video Worker", `Active & Healthy on http://127.0.0.1:5000 (ffmpeg: ${workerStatus.data.ffmpeg ? "yes" : "no"})`);
    } else {
      logFail("Python Video Worker", `Running on http://127.0.0.1:5000 but health check failed (HTTP ${workerStatus.status})`, "Check watermark-backend console logs.");
    }
  } else {
    const portFree = await checkPortFree(5000);
    if (portFree) {
      logInfo("Port 5000 Status", "Port 5000 is free (ready for worker).");
      logInfo("Worker Command", "Run 'npm run worker' to launch the Python backend, or 'npm run dev:all'.");
    } else {
      logFail("Port 5000", "Port 5000 is occupied by another process, but /health did not respond.", "Kill conflicting process on port 5000: netstat -ano | findstr :5000");
    }
  }

  // Check 5: Environment variable alignment
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("localhost:5000") && !envContent.includes("127.0.0.1:5000")) {
      logFail("Environment Configuration", ".env.local still uses 'http://localhost:5000' which can cause IPv6 mismatches on Windows.", "Change to http://127.0.0.1:5000");
    } else {
      logPass("Environment Configuration", ".env.local configured with IPv4 127.0.0.1:5000");
    }
  }

  console.log(`\n${CYAN}------------------------------------------------------------${RESET}`);
  if (allPassed) {
    console.log(`${GREEN}${BOLD}✔ All core dependencies & prerequisites are ready!${RESET}`);
    console.log(`\n${BOLD}Quick Start Commands:${RESET}`);
    console.log(`  ${CYAN}npm run worker${RESET}   -> Starts Python worker on http://127.0.0.1:5000`);
    console.log(`  ${CYAN}npm run dev${RESET}      -> Starts Next.js app on http://localhost:5678`);
    console.log(`  ${CYAN}npm run dev:all${RESET}  -> Starts both Next.js and the Python worker together\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}✖ Some checks failed. Review the hints above to fix them.${RESET}\n`);
    process.exit(1);
  }
}

runNetworkChecks();
