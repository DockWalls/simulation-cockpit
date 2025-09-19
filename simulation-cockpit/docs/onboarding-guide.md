🔹 1. Welcome to the Simulation Cockpit
This cockpit visualizes clause execution across personas, regions, and recovery pipelines. It includes avatar viewers, HUD overlays, telemetry dashboards, and clause fidelity reports.

🔹 2. Key Interfaces
InterfaceDescriptionAccess URL
Clause Selector PanelBrowse and launch clause viewers with HUD overlays/clause-selector
Avatar ViewerVisual playback of clause execution with pose alerts/viewer?clause_id=...
Clause Recovery DashboardRetry telemetry and recovery scoringGrafana link
Persona Resilience DashboardBenchmark persona recovery and fidelityGrafana link
Simulation Health ReportClause-level fidelity summary across all personasGCS or dashboard link
🔹 3. How to Review a Clause
Open the Clause Selector Panel

Choose a clause ID (e.g. telemetry-042)

View the avatar animation and HUD alerts

Review the fidelity report for pose, animation, and confidence scoring

Check the recovery dashboard for retry status and resilience score

🔹 4. Evidence Artifacts
hud-frame.json: Pose and animation data

clause-fidelity-report.json: Deviation and recovery scoring

simulation-health-report.json: Cross-persona fidelity summary

clause-manifest.yaml: Viewer and evidence linkage

🔹 5. Governance Notes
All deviations are logged and annotated in Grafana

Retry pipelines are automated via Tekton

Reports are exportable for audit and compliance