"""Quick end-to-end test of the backend pipeline."""
import requests
import time

with open("cartoon-source.mp4", "rb") as f:
    r = requests.post(
        "http://127.0.0.1:5000/api/video/process",
        files={"file": ("cartoon-source.mp4", f, "video/mp4")},
        data={"alpha": "0.30"},
    )
print("Upload status:", r.status_code)
job_id = r.json()["job_id"]
print("Job ID:", job_id)

for _ in range(90):
    s = requests.get(f"http://127.0.0.1:5000/api/video/status/{job_id}").json()
    state = s["state"]
    prog = s["progress"]
    print(f"  State={state} Progress={prog}%")
    if state in ("done", "error"):
        break
    time.sleep(2)

if s["state"] == "done":
    out = requests.get(f"http://127.0.0.1:5000/api/video/download/{job_id}")
    size = len(out.content)
    print(f"Download OK: {size:,} bytes")
    with open("new_test_clean.mp4", "wb") as f:
        f.write(out.content)
    print("Saved new_test_clean.mp4")
else:
    print("ERROR:", s.get("error"))

