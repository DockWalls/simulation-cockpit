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
	helM repo add hashicorp https://helm.releases.hashicorp.com
	helM repo add bitnami https://charts.bitnami.com/bitnami
	helM repo add grafana https://grafana.github.io/helm-charts
	helM repo add ilum https://charts.ilum.cloud
	helM repo update

deploy-charts:
	helM upgrade --install $(VAULT_REL) hashicorp/vault \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/vault-values.yaml
	helM upgrade --install $(KEYCLOAK_REL) bitnami/keycloak \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/keycloak-values.yaml
	helM upgrade --install $(GRAFANA_REL) grafana/grafana \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/grafana-values.yaml
	helM upgrade --install $(MARQUEZ_REL) ilum/ilum-marquez \
	  --namespace $(NS) --wait --timeout $(HELM_TIMEOUT) \
	  -f charts/marquez-values.yaml


deploy-k8s:
	kubectl apply -k $(KUSTOMIZE_DIR)

lint:
	@command -v yamllint >/dev/null 2>&1 || { echo "Installing yamllint in user space..."; pip3 install --user yamllint >/dev/null 2>&1 || true; }
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