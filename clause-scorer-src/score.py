import json
import yaml

# Load pose map
with open('clause-pose-map.yaml') as f:
    pose_map = yaml.safe_load(f)['spec']['mappings']
pose_lookup = {entry['clause_id']: entry for entry in pose_map}

# Load HUD frame
with open('hud-frame.json') as f:
    hud = json.load(f)

clause_id = hud['clause_id']
actual = hud['avatar']
expected = pose_lookup.get(clause_id, {})

# Compare
pose_match = actual['pose'] == expected.get('pose')
animation_match = actual['animation'] == expected.get('animation')
confidence_pass = actual['confidence'] >= expected.get('confidence_threshold', 0.9)

# Emit metrics
metrics = {
    "frame_id": hud["frame_id"],
    "clause_id": clause_id,
    "avatar_pose_confidence": actual["confidence"],
    "animation_alignment_score": 1.0 if animation_match else 0.0,
    "pose_match": pose_match,
    "animation_match": animation_match,
    "confidence_pass": confidence_pass
}

with open('score-bundle.json', 'w') as f:
    json.dump(metrics, f, indent=2)