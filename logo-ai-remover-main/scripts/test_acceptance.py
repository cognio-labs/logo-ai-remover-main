import requests
import time

with open("public/gemini-example-before.mp4", "rb") as f:
    video_bytes = f.read()

# Step 1: Upload
print("1. Uploading video to /api/video-watermark/upload...")
up_res = requests.post(
    "http://127.0.0.1:8000/api/video-watermark/upload",
    files={"file": ("acceptance_test.mp4", video_bytes, "video/mp4")},
)
print("Upload Status:", up_res.status_code)
data = up_res.json()
print("Upload Data:", data.get("status"), "Job ID:", data.get("job_id"))
job_id = data["job_id"]
assert up_res.status_code == 200
assert data["success"] is True

# Step 2: Start Processing
print("\n2. Triggering processing via /api/video-watermark/process...")
proc_res = requests.post(
    "http://127.0.0.1:8000/api/video-watermark/process",
    json={"jobId": job_id},
)
print("Process Response:", proc_res.status_code, proc_res.json())
assert proc_res.status_code == 200

# Step 3: Monitor until early preview is ready
print("\n3. Polling for real preview and completion...")
preview_seen = False
for i in range(60):
    time.sleep(1)
    st = requests.get(f"http://127.0.0.1:8000/api/video-watermark/status/{job_id}").json()
    stage = st.get("stage")
    prog = st.get("progress")
    proc_f = st.get("processedFrames", 0)
    tot_f = st.get("totalFrames", 0)
    frames_str = f"({proc_f}/{tot_f} frames)"
    has_prev = st.get("hasPreview")
    prev_url = st.get("previewUrl")
    if has_prev and not preview_seen:
        print(f"   --> REAL PREVIEW READY at {i+1}s! URL: {prev_url}")
        preview_seen = True
    print(f"   [{i+1}s] Status: {st.get('status')} | Progress: {prog}% | Stage: {stage} {frames_str}")
    if st.get("status") == "completed":
        print("\n4. Processing Completed Successfully!")
        print("   Outputs:", st.get("outputs"))
        break

# Step 4: Verify Downloads
print("\n5. Verifying downloads (720p, 1080p, 4k)...")
for q in ("720p", "1080p", "4k"):
    r_dl = requests.get(f"http://127.0.0.1:8000/api/video-watermark/download/{job_id}/{q}", stream=True)
    head = next(r_dl.iter_content(chunk_size=1024))
    print(f"   Download [{q}]: HTTP {r_dl.status_code} | First bytes: {len(head)} bytes")
    assert r_dl.status_code == 200

print("\nALL PRODUCTION ACCEPTANCE CRITERIA PASSED!")
