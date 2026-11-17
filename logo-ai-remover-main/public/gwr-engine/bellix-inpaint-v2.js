// Bellix Inpainting Engine v2 — patch-based exemplar synthesis
// Replaces the Jacobi-diffusion blur with structure-guided patch matching.
// MIT License — Bellix.us

(function () {
  "use strict";

  // ─── 1. Utility helpers ───────────────────────────────────────────────────

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /**
   * Compute luminance-weighted color gradient energy at (x,y) inside a
   * flat RGBA Uint8ClampedArray of width `w`.  Used for texture seeding.
   */
  function gradEnergy(d, w, h, x, y) {
    const lum = (px) => 0.299 * d[px] + 0.587 * d[px + 1] + 0.114 * d[px + 2];
    const p = (py, px) => (clamp(py, 0, h - 1) * w + clamp(px, 0, w - 1)) * 4;
    const gx = lum(p(y, x + 1)) - lum(p(y, x - 1));
    const gy = lum(p(y + 1, x)) - lum(p(y - 1, x));
    return gx * gx + gy * gy;
  }

  /**
   * Sum of Squared Differences between two w×h patches taken from full-frame
   * RGBA arrays `a` (at ax,ay) and `b` (at bx,by).  Only compares valid pixels
   * (alpha > 0 in mask `maskA`; pass null to compare all pixels).
   * Returns [ssd, count] so the caller can normalise.
   */
  function patchSSD(da, wa, ha, ax, ay,
                    db, wb, hb, bx, by,
                    patchR, maskA) {
    let ssd = 0, cnt = 0;
    for (let dy = -patchR; dy <= patchR; dy++) {
      const asy = ay + dy, bsy = by + dy;
      if (asy < 0 || asy >= ha || bsy < 0 || bsy >= hb) continue;
      for (let dx = -patchR; dx <= patchR; dx++) {
        const asx = ax + dx, bsx = bx + dx;
        if (asx < 0 || asx >= wa || bsx < 0 || bsx >= wb) continue;
        if (maskA) {
          const mp = (asy * wa + asx) * 4;
          if (maskA[mp + 3] === 0) continue; // skip hole pixels
        }
        const ap = (asy * wa + asx) * 4;
        const bp = (bsy * wb + bsx) * 4;
        for (let c = 0; c < 3; c++) {
          const diff = da[ap + c] - db[bp + c];
          ssd += diff * diff;
        }
        cnt++;
      }
    }
    return [ssd, cnt];
  }

  // ─── 2. Core: patch-based content-aware inpainting ───────────────────────

  /**
   * bellixPatchInpaint
   *
   * Content-aware inpainting of a rectangular `hole` region inside a canvas
   * context `ctx`.  Uses patch-match exemplar search within a surrounding
   * search window to reconstruct background texture without blurring.
   *
   * @param {CanvasRenderingContext2D} ctx   – full-frame canvas context
   * @param {{ x, y, w, h }} hole           – pixel rect of the watermark area
   * @param {Object} opts
   *   patchR      {number}  patch half-side (default 5 → 11×11 patches)
   *   searchR     {number}  search radius in pixels (default 60)
   *   iters       {number}  number of onion-peel passes (default 2)
   *   grainScale  {number}  per-pixel noise magnitude (default 1.5)
   *   temporal    {Object}  mutable state shared across consecutive frames
   *   useGrad     {boolean} weight match by gradient energy (default true)
   */
  function bellixPatchInpaint(ctx, hole, opts) {
    opts = opts || {};
    const patchR     = opts.patchR     || 5;
    const searchR    = opts.searchR    || 72;
    const iters      = opts.iters      || 2;
    const grainScale = opts.grainScale != null ? opts.grainScale : 1.5;
    const useGrad    = opts.useGrad    != null ? opts.useGrad    : true;
    const temporal   = opts.temporal   || null;

    if (!ctx || !hole) return;
    const FW = ctx.canvas ? ctx.canvas.width  : (ctx.width  || 1920);
    const FH = ctx.canvas ? ctx.canvas.height : (ctx.height || 1080);

    const { x: hx, y: hy, w: hw, h: hh } = hole;
    if (hw <= 2 || hh <= 2) return;

    // ── 2a. Grab a generous source tile from the frame (rim + hole)
    const pad  = Math.max(14, Math.round(Math.min(hw, hh) * 0.22));
    const srcX = Math.max(0, hx - pad);
    const srcY = Math.max(0, hy - pad);
    const srcX2 = Math.min(FW, hx + hw + pad);
    const srcY2 = Math.min(FH, hy + hh + pad);
    const srcW  = srcX2 - srcX;
    const srcH  = srcY2 - srcY;
    if (srcW <= 8 || srcH <= 8) return;

    const tileData = ctx.getImageData(srcX, srcY, srcW, srcH);
    const td = tileData.data;
    const tileW = srcW, tileH = srcH;

    // Hole coords in tile space
    const thx = hx - srcX;
    const thy = hy - srcY;

    // ── 2b. Build boolean hole mask (1 = needs filling)
    const holeArea = new Uint8Array(tileW * tileH); // 1 inside hole
    for (let ry = 0; ry < hh; ry++)
      for (let rx = 0; rx < hw; rx++)
        holeArea[(thy + ry) * tileW + (thx + rx)] = 1;

    // ── 2c. Compute rim (border) mean and std for grain calibration
    let rimR = 0, rimG = 0, rimB = 0, rimCnt = 0;
    for (let ty = 0; ty < tileH; ty++)
      for (let tx = 0; tx < tileW; tx++) {
        if (holeArea[ty * tileW + tx]) continue;
        const p = (ty * tileW + tx) * 4;
        rimR += td[p]; rimG += td[p + 1]; rimB += td[p + 2]; rimCnt++;
      }
    const meanR = rimCnt ? rimR / rimCnt : 128;
    const meanG = rimCnt ? rimG / rimCnt : 128;
    const meanB = rimCnt ? rimB / rimCnt : 128;
    let varSum = 0;
    for (let ty = 0; ty < tileH; ty++)
      for (let tx = 0; tx < tileW; tx++) {
        if (holeArea[ty * tileW + tx]) continue;
        const p = (ty * tileW + tx) * 4;
        const lum = 0.299 * td[p] + 0.587 * td[p + 1] + 0.114 * td[p + 2];
        const ml  = 0.299 * meanR  + 0.587 * meanG     + 0.114 * meanB;
        varSum += (lum - ml) * (lum - ml);
      }
    const rimStd = rimCnt ? Math.sqrt(varSum / rimCnt) : 8;

    // ── 2d. Temporal blend: use previous frame's reconstruction if available
    let prevFill = null;
    if (temporal && temporal.prevFill &&
        temporal.prevHW === hw && temporal.prevHH === hh) {
      const shiftDist = Math.sqrt(
        Math.pow(meanR - (temporal.prevMean[0] || 0), 2) +
        Math.pow(meanG - (temporal.prevMean[1] || 0), 2) +
        Math.pow(meanB - (temporal.prevMean[2] || 0), 2)
      );
      if (shiftDist < 20) {
        prevFill = temporal.prevFill;
      }
    }

    // ── 2e. Build a working buffer initialised from bilinear border warp
    //  (This is used ONLY as the starting seed for patch-search, NOT as the
    //   final result — so the seed can be blurry; patch-search will fix it.)
    const fill = new Float32Array(hw * hh * 3); // R,G,B per hole pixel

    // Initial seed: bilinear blend from rim edges (Coons patch)
    const du = Math.max(1, hw - 1), dt = Math.max(1, hh - 1);
    function rimPixel(tx, ty, ch) {
      const tidx = (clamp(ty, 0, tileH - 1) * tileW + clamp(tx, 0, tileW - 1)) * 4;
      return td[tidx + ch];
    }
    for (let ch = 0; ch < 3; ch++) {
      const TL = rimPixel(thx - 1, thy - 1, ch), TR = rimPixel(thx + hw, thy - 1, ch);
      const BL = rimPixel(thx - 1, thy + hh, ch), BR = rimPixel(thx + hw, thy + hh, ch);
      for (let ry = 0; ry < hh; ry++) {
        const tN = ry / dt, tS = 1 - tN;
        const Lc = rimPixel(thx - 1,    thy + ry, ch);
        const Rc = rimPixel(thx + hw, thy + ry, ch);
        for (let rx = 0; rx < hw; rx++) {
          const uE = rx / du, uW = 1 - uE;
          const Tc = rimPixel(thx + rx, thy - 1,    ch);
          const Bc = rimPixel(thx + rx, thy + hh, ch);
          fill[(ry * hw + rx) * 3 + ch] =
            uW * Lc + uE * Rc + tS * Tc + tN * Bc -
            (uW * tS * TL + uE * tS * TR + uW * tN * BL + uE * tN * BR);
        }
      }
    }

    // If we have a previous frame's fill, blend 50% with it to stabilise
    if (prevFill) {
      for (let i = 0; i < fill.length; i++)
        fill[i] = 0.5 * fill[i] + 0.5 * prevFill[i];
    }

    // ── 2f. Patch-match exemplar search — the main quality improvement
    //
    //  For each hole pixel (in onion-peel order: boundary → interior),
    //  find the best-matching patch in the rim area and copy the centre pixel.
    //  Using a simple random-search + propagation scheme (approximate NNF).

    // Build a list of hole pixels ordered from rim inward (BFS / Manhattan)
    const dist = new Float32Array(tileW * tileH).fill(Infinity);
    const queue = [];
    // Seed distances from rim pixels adjacent to hole
    for (let ry = 0; ry < hh; ry++) {
      for (let rx = 0; rx < hw; rx++) {
        const tx = thx + rx, ty = thy + ry;
        const isEdge = (rx === 0 || rx === hw - 1 || ry === 0 || ry === hh - 1);
        if (isEdge) { dist[ty * tileW + tx] = 0; queue.push([tx, ty]); }
      }
    }
    // BFS
    for (let qi = 0; qi < queue.length; qi++) {
      const [tx, ty] = queue[qi];
      const d0 = dist[ty * tileW + tx];
      for (const [nx, ny] of [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]]) {
        if (nx < thx || nx >= thx + hw || ny < thy || ny >= thy + hh) continue;
        if (!holeArea[ny * tileW + nx]) continue;
        if (dist[ny * tileW + nx] === Infinity) {
          dist[ny * tileW + nx] = d0 + 1;
          queue.push([nx, ny]);
        }
      }
    }
    // Sort hole pixels by distance (rim first)
    const holePixels = queue.slice(); // already in BFS order

    // Build list of valid exemplar centres (rim pixels at least patchR from rim)
    const exemplars = [];
    const minPatchMargin = patchR;
    for (let ty = minPatchMargin; ty < tileH - minPatchMargin; ty++) {
      for (let tx = minPatchMargin; tx < tileW - minPatchMargin; tx++) {
        if (holeArea[ty * tileW + tx]) continue;
        // Ensure the whole patch is rim-only (no hole pixels)
        let ok = true;
        outerLoop:
        for (let dy = -minPatchMargin; dy <= minPatchMargin && ok; dy++)
          for (let dx = -minPatchMargin; dx <= minPatchMargin && ok; dx++)
            if (holeArea[(ty + dy) * tileW + (tx + dx)]) ok = false;
        if (ok) exemplars.push([tx, ty]);
      }
    }

    if (exemplars.length === 0) {
      // Fall back — not enough rim area; keep bilinear seed
      applyFill();
      return;
    }

    // Create a working copy of the tile where filled pixels use current fill
    // We update this copy incrementally as we fill
    const workTd = new Uint8ClampedArray(td);

    // Helpers
    function getWorkPixel(tx, ty, ch) {
      return workTd[(ty * tileW + tx) * 4 + ch];
    }
    function setWorkPixel(tx, ty, r, g, b) {
      const p = (ty * tileW + tx) * 4;
      workTd[p] = r; workTd[p + 1] = g; workTd[p + 2] = b; workTd[p + 3] = 255;
    }

    /**
     * Find the best exemplar for a hole pixel at (thx+rx, thy+ry) using
     * random search + gradient energy weighting.
     */
    function findBestMatch(tx, ty) {
      let bestSSD = Infinity, bestEx = -1, bestEy = -1;

      // Build a mask telling patchSSD which pixels in the query patch are valid
      const qMask = new Uint8ClampedArray((2 * patchR + 1) * (2 * patchR + 1) * 4);
      for (let dy = -patchR; dy <= patchR; dy++) {
        for (let dx = -patchR; dx <= patchR; dx++) {
          const qx = tx + dx, qy = ty + dy;
          if (qx < 0 || qx >= tileW || qy < 0 || qy >= tileH) continue;
          if (holeArea[qy * tileW + qx]) continue; // skip unfilled hole pixels
          const mi = ((dy + patchR) * (2 * patchR + 1) + (dx + patchR)) * 4;
          qMask[mi + 3] = 255; // mark as valid
        }
      }

      // Search a random subset of exemplars for speed
      const candidateCount = Math.min(exemplars.length, 160);
      for (let ci = 0; ci < candidateCount; ci++) {
        const idx = Math.floor(Math.random() * exemplars.length);
        const [ex, ey] = exemplars[idx];
        const [ssd, cnt] = patchSSD(workTd, tileW, tileH, tx, ty,
                                     workTd, tileW, tileH, ex, ey,
                                     patchR, qMask);
        if (!cnt) continue;
        let score = ssd / cnt;
        if (useGrad) {
          // Prefer patches with matching gradient energy
          const qGrad = gradEnergy(workTd, tileW, tileH, tx, ty);
          const eGrad = gradEnergy(workTd, tileW, tileH, ex, ey);
          const gDiff = qGrad - eGrad;
          score += 0.3 * (gDiff * gDiff) / (qGrad + eGrad + 1);
        }
        if (score < bestSSD) { bestSSD = score; bestEx = ex; bestEy = ey; }
      }
      return [bestEx, bestEy];
    }

    // Run patch-match for each iter pass
    for (let it = 0; it < iters; it++) {
      for (const [tx, ty] of holePixels) {
        const rx = tx - thx, ry = ty - thy;
        const [ex, ey] = findBestMatch(tx, ty);
        let r, g, b;
        if (ex >= 0) {
          const ep = (ey * tileW + ex) * 4;
          r = workTd[ep]; g = workTd[ep + 1]; b = workTd[ep + 2];
        } else {
          r = fill[(ry * hw + rx) * 3];
          g = fill[(ry * hw + rx) * 3 + 1];
          b = fill[(ry * hw + rx) * 3 + 2];
        }
        // Blend with bilinear seed for first iteration at interior pixels (stability)
        if (it === 0) {
          const d = dist[ty * tileW + tx];
          const alpha = Math.min(1.0, d / 4);
          r = (1 - alpha) * fill[(ry * hw + rx) * 3    ] + alpha * r;
          g = (1 - alpha) * fill[(ry * hw + rx) * 3 + 1] + alpha * g;
          b = (1 - alpha) * fill[(ry * hw + rx) * 3 + 2] + alpha * b;
        }
        fill[(ry * hw + rx) * 3    ] = r;
        fill[(ry * hw + rx) * 3 + 1] = g;
        fill[(ry * hw + rx) * 3 + 2] = b;
        setWorkPixel(tx, ty, Math.round(clamp(r, 0, 255)),
                              Math.round(clamp(g, 0, 255)),
                              Math.round(clamp(b, 0, 255)));
      }
    }

    // ── 2g. Temporal blend: smooth with previous frame if present
    if (prevFill) {
      const alpha = 0.72; // how much current-frame result weighs
      for (let i = 0; i < fill.length; i++)
        fill[i] = alpha * fill[i] + (1 - alpha) * prevFill[i];
    }

    // Store for next frame
    if (temporal) {
      temporal.prevFill  = new Float32Array(fill);
      temporal.prevMean  = [meanR, meanG, meanB];
      temporal.prevHW    = hw;
      temporal.prevHH    = hh;
    }

    // ── 2h. Write fill to canvas with feather border + calibrated grain
    applyFill();

    function applyFill() {
      const fullTile = ctx.getImageData(srcX, srcY, srcW, srcH);
      const fData = fullTile.data;
      const grain = Math.min(3.0, Math.max(0.4, rimStd * 0.35));
      const feather = Math.max(2, Math.round(Math.min(hw, hh) * 0.12));

      for (let ry = 0; ry < hh; ry++) {
        for (let rx = 0; rx < hw; rx++) {
          const fidx = (ry * hw + rx) * 3;
          const edgeDist = Math.min(rx, hw - 1 - rx, ry, hh - 1 - ry);
          const alpha = edgeDist < feather ? edgeDist / feather : 1.0;

          const noise = (Math.random() - 0.5) * grain;
          const recR = clamp(fill[fidx    ] + noise, 0, 255);
          const recG = clamp(fill[fidx + 1] + noise, 0, 255);
          const recB = clamp(fill[fidx + 2] + noise, 0, 255);

          const dIdx = ((thy + ry) * tileW + (thx + rx)) * 4;
          fData[dIdx    ] = Math.round((1 - alpha) * fData[dIdx    ] + alpha * recR);
          fData[dIdx + 1] = Math.round((1 - alpha) * fData[dIdx + 1] + alpha * recG);
          fData[dIdx + 2] = Math.round((1 - alpha) * fData[dIdx + 2] + alpha * recB);
        }
      }
      ctx.putImageData(fullTile, srcX, srcY);
    }
  }

  // ─── 3. Replacement wrapper matching the existing API ────────────────────

  /**
   * Drop-in replacement for the previous `bellixInpaintVideoFrame`.
   * Signature is identical so `vk()` / `Ok()` can call it unchanged.
   */
  function bellixInpaintVideoFrame(ctx, pos, temporalState) {
    if (!ctx || !pos) return;

    const W = ctx.canvas ? ctx.canvas.width  : (ctx.width  || 1920);
    const H = ctx.canvas ? ctx.canvas.height : (ctx.height || 1080);

    const rawX = Number(pos.x),  rawY = Number(pos.y);
    const rawW = Number(pos.width  || pos.size || 72);
    const rawH = Number(pos.height || pos.size || 72);
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) ||
        !Number.isFinite(rawW) || !Number.isFinite(rawH)) return;
    if (rawW <= 2 || rawH <= 2) return;

    // Add a small expansion so faint antialias/glow pixels are also covered
    const expand = Math.max(2, Math.round(Math.min(rawW, rawH) * 0.08));
    const hx = Math.max(0, Math.round(rawX) - expand);
    const hy = Math.max(0, Math.round(rawY) - expand);
    const hx2 = Math.min(W, Math.round(rawX + rawW) + expand);
    const hy2 = Math.min(H, Math.round(rawY + rawH) + expand);
    const hw = hx2 - hx;
    const hh = hy2 - hy;
    if (hw <= 2 || hh <= 2) return;

    bellixPatchInpaint(ctx, { x: hx, y: hy, w: hw, h: hh }, {
      patchR:     5,
      searchR:    72,
      iters:      2,
      grainScale: 1.2,
      useGrad:    true,
      temporal:   temporalState || null,
    });
  }

  // ─── 4. Install globally (overwrite the existing function) ────────────────
  globalThis.bellixInpaintVideoFrame = bellixInpaintVideoFrame;

})();
