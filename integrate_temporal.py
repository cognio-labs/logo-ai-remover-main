from pathlib import Path
p=Path('watermark-backend/processor.py');s=p.read_text(encoding='utf8');s=s[:s.index('def remove_watermark(')]+'''def remove_watermark(src: str, dst: str, progress_cb=None, manual_box=None):
    """Learn the overlay from neighboring original frames, then export real repairs."""
    import json
    from temporal_inpainter import TemporalInpainter, logo_mask, restore_translucent
    from logo_target import detect_target

    def report(p, n, stage):
        if progress_cb:
            progress_cb(p, n, stage)

    cap = cv2.VideoCapture(src)
    ok, first = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError("Cannot decode the first video frame")
    h, w = first.shape[:2]
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
    box = manual_box or detect_target(first)
    if box is None:
        cap.release()
        raise RuntimeError("No confident white sparkle detected; no arbitrary region was removed.")
    initial_width, initial_height = box[2:]
    pad = max(128, int(max(box[2:])*3.6))
    x0, y0 = max(0, box[0]-pad), max(0, box[1]-pad)
    x1, y1 = min(w, box[0]+box[2]+pad), min(h, box[1]+box[3]+pad)
    if total*(x1-x0)*(y1-y0)*6 > 512*1024*1024:
        cap.release()
        raise RuntimeError("Temporal reconstruction memory limit exceeded. Use a shorter clip.")
    crops, boxes = [], []
    frame, previous_scene, active = first, None, True
    try:
        while True:
            scene = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (32, 32))
            cut = previous_scene is not None and np.mean(np.abs(scene.astype(float)-previous_scene.astype(float))) > 35
            candidate = detect_target(frame, box)
            if candidate is not None:
                bx, by, bw, bh = candidate
                rw, rh = max(initial_width, bw), max(initial_height, bh)
                box = (max(0, bx+(bw-rw)//2), max(0, by+(bh-rh)//2), rw, rh)
                active = True
            elif cut:
                active = False
            if active and not (x0 <= box[0] and y0 <= box[1] and box[0]+box[2] <= x1 and box[1]+box[3] <= y1):
                raise RuntimeError("Tracked logo left the temporal reconstruction area; export stopped.")
            boxes.append(box if active else None)
            crops.append(frame[y0:y1, x0:x1].copy())
            previous_scene = scene
            report(min(20, 1+int(len(crops)*19/total)), len(crops), "Tracking watermark and gathering original neighboring frames")
            ok, frame = cap.read()
            if not ok:
                break
    finally:
        cap.release()
    if len(crops) != total:
        raise RuntimeError("Decoded frame count does not match source metadata")
    positions = np.array([[b[0]+b[2]/2, b[1]+b[3]/2] for b in boxes if b])
    stationary = len(positions)==total and np.max(np.linalg.norm(positions-np.median(positions, axis=0), axis=1)) < 5
    anchor = tuple(np.median(np.array([b for b in boxes if b]), axis=0).astype(int))
    masks = []
    for b, crop in zip(boxes, crops):
        region = anchor if stationary else b
        masks.append(logo_mask(crop.shape, (region[0]-x0, region[1]-y0, region[2], region[3]))
                     if region else np.zeros(crop.shape[:2], np.uint8))
    engine = TemporalInpainter(crops, masks)
    learned = None
    if stationary:
        learned = engine.learn_matte(lambda done, count: report(20+int(done*35/count), done,
            "Learning translucent logo from motion-aligned neighboring frames"))
    quality = {'method': 'temporal-measured-matte' if learned else 'motion-compensated-donor-inpainting',
               'frames': total, 'stationary_logo': stationary}
    if learned:
        quality.update(learned[2])
    command = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{w}x{h}", "-r", str(fps), "-i", "-", "-i", src,
        "-map", "0:v:0", "-map", "1:a?", "-c:v", "libx264", "-crf", "14",
        "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", dst]
    ff = subprocess.Popen(command, stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(src)
    coverages, count = [], 0
    try:
        for index in range(total):
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Source video became unreadable during export")
            if learned:
                repaired = restore_translucent(crops[index], learned[0], learned[1])
            else:
                repaired, coverage = engine.reconstruct(index)
                coverages.append(coverage)
            frame[y0:y1, x0:x1] = repaired
            ff.stdin.write(frame.tobytes())
            count += 1
            report(55+int(count*43/total), count, f"Exporting temporally reconstructed frame {count}/{total}")
    finally:
        cap.release()
        ff.stdin.close()
        ff.wait()
    if ff.returncode or count != total:
        raise RuntimeError("Video encoding failed or decoded frame count changed")
    if coverages:
        quality['mean_temporal_coverage'] = float(np.mean(coverages))
        quality['minimum_temporal_coverage'] = float(min(coverages))
    with open(dst+".quality.json", "w", encoding="utf8") as handle:
        json.dump(quality, handle, indent=2)
    report(100, count, "Export completed; inspect the processed preview for visual quality")
''';p.write_text(s,encoding='utf8')
