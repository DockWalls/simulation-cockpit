import json
import uuid
import time
from pathlib import Path

RULEBOOK_PATH = "/home/dockwalls2/jverse-sim/vite-project/JVerse/governance/rulebook.json"

def append_violation(source_file, violation_type, rule_reference):
    entry = {
        "uuid": str(uuid.uuid4()),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_file": source_file,
        "violation_type": violation_type,
        "rule_reference": rule_reference
    }

    path = Path(RULEBOOK_PATH)
    if not path.exists():
        path.write_text("[]", encoding="utf-8")

    data = json.loads(path.read_text(encoding="utf-8"))
    data.append(entry)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("Violation appended to rulebook:", entry["uuid"])
