set -euo pipefail

mkdir -p charts k8s/policy k8s/tekton

# --- Makefile ---
cat > Makefile <<'MAKE'
SHELL := /bin/bash
NS ?= jallybean-telemetry
KUSTOMIZE_DIR := k8s
HELM_TIMEOUT := 10m
VAULT_REL := jallybean-vault
KEYCLOAK_REL := jallybean-keycloak
GRAFANA_REL := jallybean-grafana
MARQUEZ_REL := jallybean-marquez

.PHONY: deploy init helm-repos deploy-charts deploy-k8s lint destroy pf-grafana pf-keycloak logs worm-setup vault-init vault-status send-sample

deploy: init lint deploy-charts deploy-k8s
 @echo "Deploy completed."

init:
	kubectl get ns $(NS) >/dev/null 2>&1 || kubectl create ns $(NS)
	$(MAKE) helm-repos

helm-repos:
	helm repo add hashicorp https://helm.releases.hashicorp.com
	helm repo add bitnami https://charts.bitnami.com/bitnami
	helm repo add grafana https://grafana.github.io/helm-charts
	helm repo add marquez https://marquezproject.github.io/marquez
	helm repo update

deploy-charts:
	helm upgrade --install $(VAULT_REL) hashicorp/vault \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/vault-values.yaml
	helm upgrade --install $(KEYCLOAK_REL) bitnami/keycloak \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/keycloak-values.yaml
	helm upgrade --install $(GRAFANA_REL) grafana/grafana \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/grafana-values.yaml
	helm upgrade --install $(MARQUEZ_REL) marquez/marquez \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/marquez-values.yaml

deploy-k8s:
	kubectl apply -k $(KUSTOMIZE_DIR)

lint:
	@marquez/api/src/main/java/marquez/cli/DbMigrateCommand.java -v yamllint >/dev/null 2>&1 || { echo "Installing yamllint in user space..."; pip3 install --user yamllint >/dev/null 2>&1 || true; }
	yamllint -s .


destroy:
	-kubectl delete -k $(KUSTOMIZE_DIR)
	-helm uninstall $(GRAFANA_REL) -n $(NS)
	-helm uninstall $(KEYCLOAK_REL) -n $(NS)
	-helm uninstall $(VAULT_REL) -n $(NS)
	-helm uninstall $(MARQUEZ_REL) -n $(NS)
	-kubectl delete ns $(NS)


pf-grafana:
	kubectl -n $(NS) port-forward svc/$(GRAFANA_REL) 3000:80


pf-keycloak:
	kubectl -n $(NS) port-forward svc/$(KEYCLOAK_REL) 8080:80


logs:
	kubectl -n $(NS) logs -l app=telemetry-ingestor --tail=200 -f


vault-status:
	kubectl -n $(NS) exec statefulset/$(VAULT_REL) -- vault status || true


vault-init:
	kubectl -n $(NS) exec statefulset/$(VAULT_REL) -- vault operator init


worm-setup:
	@echo "Configure org-level immutable logging in your cloud provider."


send-sample:
	-kubectl -n $(NS) port-forward svc/telemetry-ingestor 8081:8080 >/dev/null 2>&1 &
	sleep 2
	curl -sS -X POST http://localhost:8081/telemetry -H "Content-Type: application/json" -d @sample-event.json | tee /dev/stderr
MAKE

# --- charts values ---
cat > charts/grafana-values.yaml <<'YML'
adminUser: admin
adminPassword: "JallySecure2025"
service:
  type: ClusterIP
grafana.ini:
  security:
    cookie_secure: true
    allow_embedding: true
  render:
    capture_timeout: 30
imageRenderer:
  enabled: true
  serviceMonitor:
    enabled: false
YML

cat > charts/keycloak-values.yaml <<'YML'
auth:
  adminUser: admin
  adminPassword: "ChangeMeAdminPwd"
proxy: edge
service:
  type: ClusterIP
postgresql:
  enabled: true
extraEnvVars:
  - name: KEYCLOAK_LOGLEVEL
    value: INFO
YML

cat > charts/vault-values.yaml <<'YML'
server:
  ha:
    enabled: false
  dev:
    enabled: false
  dataStorage:
    enabled: true
    size: 1Gi
  auditStorage:
    enabled: true
    size: 1Gi
  service:
    type: ClusterIP
ui:
  enabled: true
global:
  enabled: true
YML

cat > charts/marquez-values.yaml <<'YML'
service:
  type: ClusterIP
postgresql:
  enabled: true
YML

# --- kustomize root ---
cat > k8s/kustomization.yaml <<'YML'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: jallybean-telemetry
resources:
  - ns.yaml
  - networkpolicy.yaml
  - telemetry-schema-cm.yaml
  - telemetry-ingestor-deploy.yaml
  - telemetry-ingestor-svc.yaml
  - rbac.yaml
  - policy/alert-threshold-template.yaml
  - policy/alert-threshold-085.yaml
  - tekton/serviceaccount.yaml
  - tekton/trigger-template.yaml
  - tekton/trigger-binding.yaml
  - tekton/event-listener.yaml
  - tekton/pipeline-evidence.yaml
YML

# --- manifests ---
cat > k8s/ns.yaml <<'YML'
apiVersion: v1
kind: Namespace
metadata:
  name: jallybean-telemetry
YML

cat > k8s/networkpolicy.yaml <<'YML'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes: ["Ingress","Egress"]
YML

cat > k8s/telemetry-schema-cm.yaml <<'YML'
apiVersion: v1
kind: ConfigMap
metadata:
  name: telemetry-schema
data:
  schema.json: |
    {
      "type": "object",
      "required": ["event_id", "timestamp", "metric_type", "value"],
      "properties": {
        "event_id": { "type": "string" },
        "timestamp": { "type": "string" },
        "panel": { "type": "string" },
        "metric_type": { "type": "string" },
        "value": { "type": "number" },
        "unit": { "type": "string" },
        "source": { "type": "string" },
        "status": { "type": "string" },
        "visual_trigger": { "type": "string" },
        "animation_state": { "type": "string" }
      },
      "additionalProperties": false
    }
YML

cat > k8s/telemetry-ingestor-deploy.yaml <<'YML'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telemetry-ingestor
  labels:
    app: telemetry-ingestor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: telemetry-ingestor
  template:
    metadata:
      labels:
        app: telemetry-ingestor
        jallybean_audit: "true"
    spec:
      serviceAccountName: telemetry-ingestor
      containers:
        - name: api
          image: ghcr.io/jallybean/telemetry-ingestor:stable
          imagePullPolicy: IfNotPresent
          env:
            - name: PORT
              value: "8080"
            - name: VAULT_ADDR
              value: "http://jallybean-vault.jallybean-telemetry.svc:8200"
            - name: KEYCLOAK_REALM
              value: "JallybeanTelemetry"
            - name: LOG_FORMAT
              value: "json"
          args:
            - "--require-auth=oidc"
            - "--schema=/etc/schema/schema.json"
            - "--emit-fields=trace_id,timestamp,event,decision,ledger_entry"
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet: { path: /healthz, port: 8080 }
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests: {cpu: "100m", memory: "128Mi"}
            limits: {cpu: "500m", memory: "512Mi"}
          volumeMounts:
            - name: schema
              mountPath: /etc/schema
              readOnly: true
      volumes:
        - name: schema
          configMap:
            name: telemetry-schema
YML

cat > k8s/telemetry-ingestor-svc.yaml <<'YML'
apiVersion: v1
kind: Service
metadata:
  name: telemetry-ingestor
spec:
  type: ClusterIP
  selector:
    app: telemetry-ingestor
  ports:
    - name: http
      port: 8080
      targetPort: 8080
YML

cat > k8s/rbac.yaml <<'YML'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: telemetry-ingestor
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: telemetry-read
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get","list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: telemetry-read-binding
subjects:
  - kind: ServiceAccount
    name: telemetry-ingestor
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: telemetry-read
YML

cat > k8s/policy/alert-threshold-template.yaml <<'YML'
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: alertthreshold
spec:
  crd:
    spec:
      names:
        kind: AlertThreshold
      validation:
        openAPIV3Schema:
          properties:
            threshold:
              type: number
  targets:
    - target: admission.k8s.gatekeeper
      rego: |
        package alertthreshold
        violation[{"msg": msg}] {
          input.review.object.value > input.parameters.threshold
          msg := sprintf("alert value %.3f exceeds threshold %.2f", [input.review.object.value, input.parameters.threshold])
        }
YML

cat > k8s/policy/alert-threshold-085.yaml <<'YML'
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AlertThreshold
metadata:
  name: alert-threshold-085
spec:
  parameters:
    threshold: 0.85
YML

cat > k8s/tekton/serviceaccount.yaml <<'YML'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-triggers-sa
YML

cat > k8s/tekton/trigger-template.yaml <<'YML'
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: telemetry-trigger
spec:
  params:
    - name: animation_state
  resourcetemplates:
    - apiVersion: batch/v1
      kind: Job
      metadata:
        name: animate-$(params.animation_state)
      spec:
        template:
          spec:
            containers:
              - name: animator
                image: ghcr.io/jallybean/animator:stable
                args: ["$(params.animation_state)"]
            restartPolicy: Never
YML

cat > k8s/tekton/trigger-binding.yaml <<'YML'
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: telemetry-anim-binding
spec:
  params:
    - name: animation_state
      value: $(body.animation_state)
YML

cat > k8s/tekton/event-listener.yaml <<'YML'
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: telemetry-anim-listener
spec:
  serviceAccountName: tekton-triggers-sa
  triggers:
    - name: anim
      bindings:
        - ref: telemetry-anim-binding
      template:
        ref: telemetry-trigger
YML

cat > k8s/tekton/pipeline-evidence.yaml <<'YML'
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: evidence-pack
spec:
  params:
    - name: grafana_url
      type: string
    - name: api_key
      type: string
    - name: panel_path
      type: string
  tasks:
    - name: export-dashboard
      taskSpec:
        params:
          - name: grafana_url
          - name: api_key
          - name: panel_path
        steps:
          - name: grafana-render
            image: curlimages/curl
            script: |
              set -e
              curl -H "Authorization: Bearer $(params.api_key)" \
                   "$(params.grafana_url)/render$(params.panel_path)" \
                   -o /workspace/dashboard.png
    - name: export-lineage
      taskSpec:
        steps:
          - name: lineage-export
            image: ghcr.io/jallybean/marquez-exporter:stable
            args: ["--output","/workspace/lineage.json"]
YML

# sample event
cat > sample-event.json <<'JSON'
{
  "event_id": "a7f3c2d1-9e4b-4c3f-8e1a-2b9d7f6e1a2f",
  "timestamp": "2025-09-17T02:28:00Z",
  "panel": "awareness",
  "metric_type": "alert",
  "value": 0.93,
  "unit": "percentage",
  "source": "exec_042",
  "status": "active",
  "visual_trigger": "heatmap",
  "animation_state": "pulse"
}
JSON

# readme
cat > README.md <<'MD'
# Jallybean Telemetry Bundle (Parser-Safe)
Deploy: `make deploy`
Useful:
- `make pf-grafana` -> http://localhost:3000 (admin / JallySecure2025)
- `make pf-keycloak` -> http://localhost:8080
- `make send-sample` -> POSTs sample-event.json
- `make vault-status` / `make vault-init`
Prereqs: kubectl, helm, make, cluster access.
MD
