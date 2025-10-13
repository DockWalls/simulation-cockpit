import uuid
import time
import json
import argparse
import subprocess
import os

WORKFLOW_NAME = "crisis-trigger"
LOCATION = "us-central1"

def invoke_workflow(event, score, source, project):
    payload = {"event": event, "score": score, "source": source}
    cmd = [
        "gcloud", "workflows", "run", WORKFLOW_NAME,
        "--location", LOCATION,
        "--project", project,
        "--data", json.dumps(payload)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Workflow response:")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Workflow invocation failed:")
        print(e.stderr)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--overlay", required=True, choices=["pandemic", "cyber", "ethics"])
    ap.add_argument("--project", help="GCP project ID (overrides env)")
    args = ap.parse_args()

    # project resolution order: CLI flag -> env -> fail
    project = args.project or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT")
    if not project:
        raise SystemExit("ERROR: GCP project is required. Pass --project or set $GOOGLE_CLOUD_PROJECT.")
    simulate_overlay(args.overlay, project)

def simulate_overlay(overlay_type, project):
    overlays = {
        "pandemic": {"event": "asset_load_spike", "score": 0.92},
        "cyber": {"event": "parser_injection", "score": 0.88},
        "ethics": {"event": "unsafe_animation", "score": 0.91}
    }
    if overlay_type not in overlays:
        print("Unknown overlay type:", overlay_type); return
    trace_id = str(uuid.uuid4())
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"Simulating overlay: {overlay_type}")
    print(f"Trace ID: {trace_id}")
    print(f"Timestamp: {timestamp}")
    params = overlays[overlay_type]
    invoke_workflow(params["event"], params["score"], overlay_type, project)

if __name__ == "__main__":
    main()