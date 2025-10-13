import json
import uuid
import time

def emit_log(event, decision, ledger_entry):
    log = {
        "trace_id": str(uuid.uuid4()),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event,
        "decision": decision,
        "ledger_entry": ledger_entry
    }
    print(json.dumps(log, indent=2))
