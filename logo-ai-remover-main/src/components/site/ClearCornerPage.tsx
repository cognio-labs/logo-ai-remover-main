"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Download, Film, Pause, Play, RotateCcw, Sparkles, Upload, Volume2, VolumeX } from "lucide-react";
import { getCornerGeometry, processClearCorner, type CornerSettings } from "@/lib/clearCornerEngine";
import "./clear-corner.css";

const DEFAULTS: CornerSettings = { sizePct: 7, distancePct: 4, strengthPct: 50 };

export default function ClearCornerPage() {
  const [file, setFile] = useState<File | null>(null), [sourceUrl, setSourceUrl] = useState(""), [cleanUrl, setCleanUrl] = useState("");
  const [downloadName, setDownloadName] = useState("clean-video.mp4"), [settings, setSettings] = useState(DEFAULTS);
  const [dimensions, setDimensions] = useState({ width: 16, height: 9 }), [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false), [hasResult, setHasResult] = useState(false), [showCleanOnly, setShowCleanOnly] = useState(false), [showTarget, setShowTarget] = useState(true);
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [split, setSplit] = useState(52), [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false), [currentTime, setCurrentTime] = useState(0), [duration, setDuration] = useState(0), [dragging, setDragging] = useState(false);
  const originalRef = useRef<HTMLVideoElement>(null), cleanRef = useRef<HTMLVideoElement>(null), workspaceRef = useRef<HTMLElement>(null), fileInputRef = useRef<HTMLInputElement>(null), splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); if (cleanUrl) URL.revokeObjectURL(cleanUrl); }, [sourceUrl, cleanUrl]);
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith("video/"));
      if (pasted) { event.preventDefault(); acceptFile(pasted); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const setVideosTime = (time: number) => { if (originalRef.current) originalRef.current.currentTime = time; if (cleanRef.current) cleanRef.current.currentTime = time; setCurrentTime(time); };
  const togglePlay = () => { const original = originalRef.current; if (!original) return; if (original.paused) { void original.play(); void cleanRef.current?.play(); setPlaying(true); } else { original.pause(); cleanRef.current?.pause(); setPlaying(false); } };
  const process = async (nextFile: File, nextSettings = settings) => {
    const original = originalRef.current; if (!original) return;
    setBusy(true); setHasResult(false); setCleanUrl(""); setError(""); setNotice(""); setProgress(0);
    try { const result = await processClearCorner(nextFile, original.videoWidth, original.videoHeight, nextSettings, (value) => setProgress(Math.round(value * 100))); setCleanUrl(result.url); setDownloadName(`${nextFile.name.replace(/\.[^.]+$/u, "")}-clean.mp4`); setHasResult(true); setProgress(100); setTimeout(() => setVideosTime(0), 100); }
    catch (err) { setError(err instanceof Error ? err.message : "FFmpeg could not process this video."); }
    finally { setBusy(false); }
  };
  const acceptFile = (candidate: File) => {
    if (!candidate.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|avi)$/iu.test(candidate.name)) { setError("Please choose a video file (MP4, MOV, WebM, MKV, or AVI)."); return; }
    if (candidate.size > 300 * 1024 * 1024) setNotice("Large videos over 300 MB may run out of browser memory.");
    if (sourceUrl) URL.revokeObjectURL(sourceUrl); const url = URL.createObjectURL(candidate);
    setFile(candidate); setSourceUrl(url); setCleanUrl(""); setHasResult(false); setProgress(0); setError(""); setShowCleanOnly(false);
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };
  const onSourceMetadata = () => { const video = originalRef.current; if (!video) return; setDimensions({ width: video.videoWidth, height: video.videoHeight }); setDuration(video.duration || 0); if (file) void process(file); };
  const changeSetting = (key: keyof CornerSettings, value: number) => { setSettings((current) => ({ ...current, [key]: value })); if (hasResult) setNotice("Settings changed. Press Reprocess to apply them."); };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); const dropped = event.dataTransfer.files[0]; if (dropped) acceptFile(dropped); };
  const geometry = getCornerGeometry(dimensions.width, dimensions.height, settings);
  const targetStyle = { width: `${(geometry.box / dimensions.width) * 100}%`, height: `${(geometry.box / dimensions.height) * 100}%`, right: `${((dimensions.width - geometry.x - geometry.box) / dimensions.width) * 100}%`, bottom: `${((dimensions.height - geometry.y - geometry.box) / dimensions.height) * 100}%` };

  useEffect(() => { const onPointerMove = (event: PointerEvent) => { if (!dragging || !splitRef.current) return; const rect = splitRef.current.getBoundingClientRect(); setSplit(Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100))); }; const onPointerUp = () => setDragging(false); window.addEventListener("pointermove", onPointerMove); window.addEventListener("pointerup", onPointerUp); return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); }; }, [dragging]);
  const onTimeUpdate = () => { const video = originalRef.current; if (!video) return; setCurrentTime(video.currentTime); if (cleanRef.current && Math.abs(cleanRef.current.currentTime - video.currentTime) > 0.12) cleanRef.current.currentTime = video.currentTime; };
  const onEnded = () => { setVideosTime(0); if (playing) { void originalRef.current?.play(); void cleanRef.current?.play(); } };

  return <main className="clearcorner-shell">
    <section className="clearcorner-hero"><div className="clearcorner-hero-inner"><div className="clearcorner-copy"><div className="clearcorner-eyebrow"><Sparkles size={15} /> RUNS 100% IN YOUR BROWSER</div><h1>Take the sparkle<br />off your Gemini<br />videos.</h1><p>Drop in a video, aim at the corner mark, and get a clean copy at the exact same resolution. Your file never leaves this device.</p><div className="clearcorner-chips"><span>No sign-up required</span><span>Original resolution kept</span><span>Audio untouched</span></div></div>
      <div className="clearcorner-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}><div className="clearcorner-corners" /><div className="clearcorner-upload-icon"><Upload size={28} /></div><strong>Drop Gemini video here</strong><small>or paste directly with <kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd></small><button type="button" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>Choose video</button><em>Processed 100% locally on this device</em><input ref={fileInputRef} hidden type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi" onChange={(event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (selected) acceptFile(selected); event.target.value = ""; }} /></div>
    </div></section>

    <section ref={workspaceRef} className={`clearcorner-workspace ${sourceUrl ? "is-visible" : ""}`}><div className="clearcorner-workspace-heading"><div><span className="clearcorner-kicker">YOUR WORKSPACE</span><h2>Aim, check, save.</h2><p>Inspect the corner sparkle in high definition. Tune the target and removal strength, then export a clean MP4.</p></div><div className="clearcorner-resolution"><Film size={16} /> {dimensions.width} × {dimensions.height}</div></div>
      {error && <div role="alert" className="clearcorner-error">{error}</div>}{notice && <div className="clearcorner-notice">{notice}</div>}
      <div className="clearcorner-grid"><div className="clearcorner-stage-wrap"><div ref={splitRef} className="clearcorner-stage" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}><video ref={originalRef} src={sourceUrl} muted={muted} playsInline preload="metadata" onLoadedMetadata={onSourceMetadata} onTimeUpdate={onTimeUpdate} onEnded={onEnded} />{cleanUrl && <div className="clearcorner-clean-layer" style={{ clipPath: showCleanOnly ? "inset(0)" : `inset(0 ${100 - split}% 0 0)` }}><video ref={cleanRef} src={cleanUrl} muted playsInline preload="metadata" /></div>}{showTarget && !showCleanOnly && <div className="clearcorner-target" style={targetStyle}><span>Target</span></div>}<span className="clearcorner-label clearcorner-label-after">After (clean)</span><span className="clearcorner-label clearcorner-label-original">Original</span>{busy && <div className="clearcorner-processing"><div className="clearcorner-spinner" /><strong>Cleaning your video</strong><span>{progress}% · keep this tab open</span><div className="clearcorner-progress"><i style={{ width: `${Math.max(3, progress)}%` }} /></div></div>}{cleanUrl && !showCleanOnly && <button className="clearcorner-handle" type="button" aria-label="Drag comparison handle" style={{ left: `${split}%` }} onPointerDown={() => setDragging(true)}><i /></button>}</div>
        {sourceUrl && <div className="clearcorner-controls"><button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><input aria-label="Video position" type="range" min="0" max={duration || 0} step="0.01" value={currentTime} onChange={(event) => setVideosTime(Number(event.target.value))} /><span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span><button type="button" onClick={() => { setMuted(!muted); if (originalRef.current) originalRef.current.muted = !muted; }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button></div>}</div>
        <aside className="clearcorner-panel"><div className="clearcorner-panel-title"><div><span className="clearcorner-kicker">CORNER REGION</span><h3>Shape the clean-up.</h3></div><span className="clearcorner-status"><span /> In-browser</span></div><label>Box size <output>{settings.sizePct}% <small>of short side</small></output><input type="range" min="2" max="20" value={settings.sizePct} onChange={(event) => changeSetting("sizePct", Number(event.target.value))} /></label><label>Distance from corner <output>{settings.distancePct}% <small>from edges</small></output><input type="range" min="0" max="20" value={settings.distancePct} onChange={(event) => changeSetting("distancePct", Number(event.target.value))} /></label><label>Removal strength <output>{settings.strengthPct}% <small>alpha correction</small></output><input type="range" min="20" max="90" value={settings.strengthPct} onChange={(event) => changeSetting("strengthPct", Number(event.target.value))} /></label><label className="clearcorner-check"><input type="checkbox" checked={showTarget} onChange={(event) => setShowTarget(event.target.checked)} /> <span>Show dashed target box on video</span></label><button className="clearcorner-secondary" type="button" onClick={() => setShowCleanOnly(!showCleanOnly)} disabled={!hasResult}>{showCleanOnly ? "Show comparison" : "Show clean video only"}</button><button className="clearcorner-primary" type="button" onClick={() => file && process(file)} disabled={!file || busy}>{busy ? `Processing ${progress}%` : <><RotateCcw size={16} /> Reprocess</>}</button><a className={`clearcorner-download ${hasResult ? "ready" : ""}`} href={cleanUrl || undefined} download={downloadName} aria-disabled={!hasResult} onClick={(event) => { if (!hasResult) event.preventDefault(); }}><Download size={17} /> Download clean MP4</a><button className="clearcorner-upload-another" type="button" onClick={() => fileInputRef.current?.click()}>Upload another video</button><p className="clearcorner-tip"><b>Tip:</b> raise strength if a faint white star remains; lower it if a dark star appears.</p></aside>
      </div>
    </section>
  </main>;
}
