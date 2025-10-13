import uuid
import time
import json
import argparse
import subprocess

WORKFLOW_NAME = "crisis-trigger"
LOCATION = "us-central1"

def invoke_workflow(event, score, source):
    payload = {
        "event": event,
        "score": score,
        "source": source
    }

    cmd = [
        "gcloud", "workflows", "executions", "run", WORKFLOW_NAME,
        "--location", LOCATION,
        "--data", json.dumps(payload)
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Workflow response:")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Workflow invocation failed:")
        print(e.stderr)

def simulate_overlay(overlay_type):
    overlays = {
        "pandemic": {"event": "asset_load_spike", "score": 0.92},
        "cyber": {"event": "parser_injection", "score": 0.88},
        "ethics": {"event": "unsafe_animation", "score": 0.91}
    }

    if overlay_type not in overlays:
        print("Unknown overlay type:", overlay_type)
        return

    trace_id = str(uuid.uuid4())
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"Simulating overlay: {overlay_type}")
    print(f"Trace ID: {trace_id}")
    print(f"Timestamp: {timestamp}")

    params = overlays[overlay_type]
    invoke_workflow(params["event"], params["score"], overlay_type)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--overlay", required=True, choices=["pandemic", "cyber", "ethics"])
    args = ap.parse_args()
    simulate_overlay(args.overlay)

if __name__ == "__main__":
    main()
