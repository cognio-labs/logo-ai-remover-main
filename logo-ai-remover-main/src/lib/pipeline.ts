/**
 * Simulated AI processing pipeline.
 *
 * TODO(real AI): replace `runPipeline` with calls to the backend job API
 * (POST /api/process/image | /api/process/video, then poll GET /api/status/:jobId).
 * The stage list and progress shape below already match that contract, so only
 * the body of `runPipeline` needs to change.
 */

export type Stage = { label: string; weight: number };

export const IMAGE_STAGES: Stage[] = [
  { label: "Analyzing content…", weight: 1 },
  { label: "Detecting unwanted elements…", weight: 1.2 },
  { label: "Generating repair mask…", weight: 1 },
  { label: "AI inpainting…", weight: 2 },
  { label: "Enhancing quality…", weight: 1.4 },
  { label: "Upscaling…", weight: 1.6 },
];

export const VIDEO_STAGES: Stage[] = [
  { label: "Extracting frames…", weight: 1.4 },
  { label: "Detecting unwanted elements…", weight: 1.2 },
  { label: "Processing frames…", weight: 2.6 },
  { label: "Maintaining temporal consistency…", weight: 1.6 },
  { label: "Enhancing quality…", weight: 1.4 },
  { label: "Rebuilding video…", weight: 1.6 },
];

export const UPSCALE_STAGES: Stage[] = [
  { label: "Analyzing resolution & composition…", weight: 1 },
  { label: "Detecting AI logos & watermarks…", weight: 1.5 },
  { label: "Neural inpainting & texture synthesis…", weight: 2 },
  { label: "Super-resolution sharpening…", weight: 1.4 },
  { label: "Writing crystal-clear 4K output…", weight: 0.8 },
];

export type PipelineUpdate = { progress: number; stage: string; done: boolean };

/** Runs a simulated pipeline, reporting progress. Returns a cancel function. */
export function runPipeline(
  stages: Stage[],
  totalMs: number,
  onUpdate: (u: PipelineUpdate) => void,
) {
  const total = stages.reduce((s, x) => s + x.weight, 0);
  let elapsed = 0;
  const tick = 90;

  const id = setInterval(() => {
    elapsed += tick;
    const ratio = Math.min(1, elapsed / totalMs);
    let acc = 0;
    let stage = stages[stages.length - 1]!.label;
    for (const s of stages) {
      acc += s.weight / total;
      if (ratio <= acc) {
        stage = s.label;
        break;
      }
    }
    const done = ratio >= 1;
    onUpdate({ progress: Math.round(ratio * 100), stage: done ? "Complete" : stage, done });
    if (done) clearInterval(id);
  }, tick);

  return () => clearInterval(id);
}

export type Issue = { label: string; severity: "low" | "medium" | "high" };

export type AnalysisReport = {
  artifactScore: number;
  issues: Issue[];
  recommendations: string[];
};

/** Deterministic pseudo-analysis derived from the file itself. */
export function analyzeFile(file: File): AnalysisReport {
  const seed = (file.size + file.name.length) % 100;
  const score = 55 + (seed % 40);
  const pool: Issue[] = [
    { label: "Low effective resolution", severity: "high" },
    { label: "Compression noise detected", severity: "medium" },
    { label: "Text / logo overlay detected", severity: "high" },
    { label: "AI generation defects around edges", severity: "medium" },
    { label: "Colour banding in gradients", severity: "low" },
    { label: "Soft focus on fine detail", severity: "low" },
  ];
  const issues = pool.filter((_, i) => (seed >> i) % 2 === 0).slice(0, 4);
  return {
    artifactScore: score,
    issues: issues.length ? issues : pool.slice(0, 3),
    recommendations: ["Clean image", "Enhance quality", "Upscale to 4K"],
  };
}

export type HistoryItem = {
  id: string;
  name: string;
  type: "image" | "video" | "upscale";
  date: string;
  status: "Completed" | "Processing" | "Failed";
  thumb?: string | undefined;
};
