from flask import Flask, request, jsonify
import json, uuid, datetime

app = Flask(__name__)

@app.route('/telemetry', methods=['POST'])
def ingest():
    payload = request.get_json()
    payload['event_id'] = str(uuid.uuid4())
    payload['timestamp'] = datetime.datetime.utcnow().isoformat()
    # Optional: forward to Loki, Marquez, Grafana
    return jsonify({"status": "received", "payload": payload}), 200

app.run(host='0.0.0.0', port=8080)
