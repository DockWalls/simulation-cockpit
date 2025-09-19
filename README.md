# simulation-cockpit

This repository is dedicated to viewing and analyzing simulation outputs from the Jallybean governance system. It is strictly scoped for HUD overlays, telemetry scoring, replay fidelity, and evidence bundling.

## Modules Included

- `grafana/`: Viewer dashboards for commander and analyst roles
- `telemetry/`: Loki, Promtail, and scoring logic
- `evidence/`: HUD snapshots, replay bundles, and scoring pipelines

## Usage

```bash
./start-viewer.sh
```
Governance Note
This repo does not contain clause dispatch logic, Tekton triggers, or policy enforcement modules. All governance operations remain in jallybean-i-governance.

Code

---

## ✅ 2. Generate Viewer-Only Grafana Dashboard Manifest

```yaml
apiVersion: 1
datasources:
  - name: Telemetry
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      maxLines: 1000
```
Save as grafana/datasource-job.yaml This connects Grafana to Loki for replay and scoring logs

✅ 3. Rig start-viewer.sh Script
bash
#!/bin/bash

echo "🚀 Launching Simulation Viewer Cockpit..."

# Start Loki
docker run -d --name loki -p 3100:3100 grafana/loki:latest

# Start Promtail
docker run -d --name promtail -v "$(pwd)/telemetry/promtail:/etc/promtail" grafana/promtail:latest

# Start Grafana
docker run -d --name grafana -p 3000:3000 \
  -v "$(pwd)/grafana:/var/lib/grafana/dashboards" \
  -e "GF_PATHS_PROVISIONING=/etc/grafana/provisioning" \
  grafana/grafana:latest

echo "✅ Viewer cockpit is live at http://localhost:3000"
Save as start-viewer.sh Make executable:

bash
chmod +x start-viewer.sh

```