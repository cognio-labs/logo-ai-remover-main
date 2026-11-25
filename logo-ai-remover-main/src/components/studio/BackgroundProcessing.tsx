import { useEffect, useRef, useState } from "react";
import { FileImage } from "lucide-react";
import "./background-processing.css";

export function FlowerLoader() {
  return (
    <span className="bellix-flower" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function BackgroundProcessing({
  original,
  result,
  width,
  height,
  fileName,
  stage,
  onCancel,
  onComplete,
}: {
  original: string;
  result?: string;
  width: number;
  height: number;
  fileName: string;
  stage: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [boundary, setBoundary] = useState(0);
  const [ready, setReady] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (!result || !ready) return;
    let frame = 0;
    let start: number | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const advance = (now: number) => {
      start ??= now;
      const fraction = reduced ? 1 : Math.min(1, (now - start) / 1600);
      setBoundary(fraction * 100);
      if (fraction < 1) frame = requestAnimationFrame(advance);
      else completeRef.current();
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [result, ready]);

  return (
    <section className="bellix-processing" aria-label="Background removal" aria-busy="true">
      <div className="bellix-file-header">
        <div className="bellix-file">
          <FileImage size={17} />
          <span>{fileName}</span>
          <small>
            {width} × {height} px
          </small>
        </div>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="bellix-preview-wrap">
        <div
          className="bellix-preview"
          style={{
            aspectRatio: `${width} / ${height}`,
            width: `min(100%, calc(62vh * ${width / height}))`,
          }}
        >
          <img
            src={original}
            alt="Original upload"
            style={{ clipPath: result && ready ? `inset(${boundary}% 0 0)` : undefined }}
          />
          {result && (
            <div
              className="bellix-reveal"
              data-testid="actual-result-reveal"
              style={{ clipPath: `inset(0 0 ${100 - boundary}% 0)` }}
            >
              <img
                src={result}
                alt="Actual transparent result"
                onLoad={() => setReady(true)}
                onError={onCancel}
              />
            </div>
          )}
          <div
            aria-hidden="true"
            className={`bellix-beam ${ready ? "bellix-beam-reveal" : "bellix-beam-scanning"}`}
            style={ready ? { top: `${boundary}%` } : undefined}
          />
          {!ready && (
            <div className="bellix-particles" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>
      </div>
      <div className="bellix-status-footer" role="status" aria-live="polite">
        <FlowerLoader />
        <div>
          <strong>{ready ? "Revealing your transparent result..." : stage}</strong>
          <small>
            {ready
              ? "Showing the completed AI cutout"
              : "AI is analyzing your image. Fine details may need manual refinement."}
          </small>
        </div>
        <span className="bellix-live-dot" aria-hidden="true" />
      </div>
    </section>
  );
}
