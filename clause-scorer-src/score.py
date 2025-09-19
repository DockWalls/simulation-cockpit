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

# Emit scoring metrics
metrics = {
    "frame_id": frame_id,
    "clause_id": clause_id,
    "avatar_pose_confidence": actual["confidence"],
    "animation_alignment_score": 1.0 if actual["animation"] == expected.get("animation") else 0.0,
    "pose_match": len(pose_deviations) == 0,
    "animation_match": actual["animation"] == expected.get("animation"),
    "confidence_pass": actual["confidence"] >= expected.get("confidence_threshold", 0.9)
}

Path("score-bundle.json").write_text(json.dumps(metrics, indent=2))
Path("pose-deviation-events.json").write_text(json.dumps(pose_deviations, indent=2))