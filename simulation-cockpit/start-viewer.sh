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