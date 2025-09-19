import json
import yaml
from datetime import datetime
from math import acos
from pathlib import Path

def quaternion_angle(q1, q2):
    dot = sum(a * b for a, b in zip(q1, q2))
    dot = max(min(dot, 1.0), -1.0)
    return acos(dot) * 2 * 57.2958  # degrees

# Load pose map
with open('clause-pose-map.yaml') as f:
    pose_map = yaml.safe_load(f)['spec']['mappings']
pose_lookup = {entry['clause_id']: entry for entry in pose_map}

# Load HUD frame
with open('hud-frame.json') as f:
    hud = json.load(f)

clause_id = hud['clause_id']
persona = hud['persona']
frame_id = hud['frame_id']
actual = hud['avatar']
expected = pose_lookup.get(clause_id, {})

pose_deviations = []
for bone, expected_data in expected.get('pose_quaternion', {}).items():
    actual_data = actual.get('pose_quaternion', {}).get(bone)
    if not actual_data:
        continue
    angle_delta = quaternion_angle(expected_data, actual_data)
    threshold = expected.get('fidelity_threshold', 10.0)
    if angle_delta > threshold:
        pose_deviations.append({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "clause_id": clause_id,
            "persona": persona,
            "event": "pose_deviation",
            "frame_id": frame_id,
            "details": {
                "bone": bone,
                "angle_delta": round(angle_delta, 2),
                "threshold": threshold
            }
        })

animation_expected = expected.get("animation")
animation_actual = actual.get("animation")
alignment_score = 1.0 if animation_actual == animation_expected else 0.0

animation_mismatch = {
  "timestamp": datetime.utcnow().isoformat() + "Z",
  "clause_id": clause_id,
  "persona": persona,
  "event": "animation_misalignment",
  "frame_id": frame_id,
  "details": {
    "expected": animation_expected,
    "actual": animation_actual,
    "alignment_score": alignment_score
  }
} if animation_actual != animation_expected else None

events = pose_deviations
if animation_mismatch:
    events.append(animation_mismatch)

# Emit scoring metrics
metrics = {
    "frame_id": frame_id,
    "clause_id": clause_id,
    "avatar_pose_confidence": actual["confidence"],
    "animation_alignment_score": alignment_score, # Use the calculated alignment_score
    "pose_match": len(pose_deviations) == 0,
    "animation_match": animation_actual == animation_expected,
    "confidence_pass": actual["confidence"] >= expected.get("confidence_threshold", 0.9)
}

Path("score-bundle.json").write_text(json.dumps(metrics, indent=2))
Path("pose-deviation-events.json").write_text(json.dumps(events, indent=2))