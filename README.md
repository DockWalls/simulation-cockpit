# 🧭 Simulation Cockpit — Release v1.7.0

This repository contains the full simulation cockpit for clause execution, avatar fidelity scoring, and recovery telemetry. It includes:

- ✅ Clause selector panel
- ✅ Avatar viewer with HUD overlays
- ✅ Grafana dashboards for recovery and resilience
- ✅ Tekton pipelines for clause retry
- ✅ Evidence exports and simulation health reports

---

## 🔹 Live Interfaces

| Component              | Description                                                  | URL |
|------------------------|--------------------------------------------------------------|-----|
| Clause Selector Panel  | Browse and launch clause viewers                             | [`/clause-selector`](https://simulation-cockpit.web.app/clause-selector) |
| Avatar Viewer          | Visual playback of clause execution                          | [`/viewer`](https://simulation-cockpit.web.app/viewer) |
| Clause Recovery Dashboard | Retry telemetry and recovery scoring                     | [Grafana](https://grafana.sim-cockpit.io/d/clause-recovery) |
| Persona Resilience Dashboard | Benchmark persona recovery and fidelity             | [Grafana](https://grafana.sim-cockpit.io/d/persona-resilience) |
| Simulation Health Dashboard | Clause-level fidelity summary                         | [Grafana](https://grafana.sim-cockpit.io/d/simulation-health) |

---

## 🔹 Evidence Artifacts

- [`clause-manifest.yaml`](dispatch/clause-manifest.yaml)
- [`clause-fidelity-report.json`](evidence/export/clause-fidelity-report.json)
- [`simulation-health-report.json`](evidence/export/simulation-health-report.json)
- [`onboarding-guide.md`](docs/onboarding-guide.md)

---

## 🔹 CI/CD Pipelines

- [`clause-retry-pipeline.yaml`](ci_cd/tekton/clause-retry-pipeline.yaml)
- Tekton tasks for clause validation, replay, and logging

---

## 🔹 Deployment

This cockpit is deployed via Firebase Hosting and Grafana Cloud. Viewer components are built with React and Three.js. Dashboards are provisioned via JSON and YAML manifests.

---

## 🔹 License & Governance

This simulation cockpit is governed by sovereign-grade telemetry protocols and audit-grade evidence standards. All clause executions are traceable, recoverable, and exportable.

---