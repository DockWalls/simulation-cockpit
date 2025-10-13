#!/usr/bin/env bash
set -euo pipefail

# gke-auth.sh
# Provision GKE access using a GCP service account and a JSON key.
# Adds --cleanup to revoke access, delete the key (locally and in IAM), remove roles,
# and optionally delete the service account itself.

# Defaults
PROJECT_ID=""
CLUSTER=""
REGION=""
SA_NAME="gke-auth-bot"
KEY_FILE="./gke-sa-key.json"
ROLES="roles/container.developer"
CLEANUP=0
DELETE_SA=0
KUBECONFIG_OUT="./kubeconfig"
PRINT_KUBECONFIG=0
DELETE_KUBECONFIG=0

usage() {
  cat <<EOF
Usage:
  $0 --project-id <id> --cluster <name> --region <region> [--sa-name <name>] [--key-file <path>] [--roles <r1,r2>]
  $0 --cleanup --project-id <id> [--sa-name <name>] [--key-file <path>] [--roles <r1,r2>] [--delete-sa]

Provision:
  --project-id       GCP project id (required)
  --cluster          GKE cluster name (required)
  --region           GKE region (required)
  --sa-name          Service account name (default: ${SA_NAME})
  --key-file         Path to write/read JSON key (default: ${KEY_FILE})
  --roles            Comma-separated IAM roles to bind (default: ${ROLES})
  --kubeconfig-out   Path to write kubeconfig (default: ./kubeconfig)
  --print-kubeconfig Print kubeconfig to stdout after provisioning

Cleanup:
  --cleanup          Revoke auth, delete service account key (IAM + local), remove IAM bindings
  --delete-sa        Also delete the service account
  --delete-kubeconfig  Also delete the kubeconfig file specified by --kubeconfig-out

General:
  -h, --help         Show this help
EOF
}

log()   { printf '%s\n' "INFO: $*"; }
ok()    { printf '%s\n' "OK: $*"; }
warn()  { printf '%s\n' "WARN: $*" 1>&2; }
die()   { printf '%s\n' "ERROR: $*" 1>&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

secure_rm() {
  # Securely remove file if possible; fall back to rm -f.
  # Usage: secure_rm /path/to/file
  local f="$1"
  [ -f "$f" ] || return 0
  if command -v shred >/dev/null 2>&1;
  then
    shred -u "$f" || rm -f "$f"
  elif command -v gshred >/dev/null 2>&1;
  then
    gshred -u "$f" || rm -f "$f"
  elif command -v srm >/dev/null 2>&1;
  then
    srm -fz "$f" || rm -f "$f"
  else
    warn "shred/srm not found; using rm -f"
    rm -f "$f"
  fi
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --project-id) PROJECT_ID="${2:-}"; shift 2;;
      --cluster)    CLUSTER="${2:-}"; shift 2;;
      --region)     REGION="${2:-}"; shift 2;;
      --sa-name)    SA_NAME="${2:-}"; shift 2;;
      --key-file)   KEY_FILE="${2:-}"; shift 2;;
      --roles)      ROLES="${2:-}"; shift 2;;
      --cleanup)    CLEANUP=1; shift;;
      --delete-sa)  DELETE_SA=1; shift;;
      --kubeconfig-out) KUBECONFIG_OUT="${2:-}"; shift 2;;
      --print-kubeconfig) PRINT_KUBECONFIG=1; shift;;
      --delete-kubeconfig) DELETE_KUBECONFIG=1; shift;;
      -h|--help)    usage; exit 0;;
      *) die "Unknown argument: $1";;
    esac
  done
}

sa_email() {
  [ -n "$PROJECT_ID" ] || die "PROJECT_ID is required"
  [ -n "$SA_NAME" ] || die "SA_NAME is required"
  printf '%s@%s.iam.gserviceaccount.com' "$SA_NAME" "$PROJECT_ID"
}

activate_and_get_credentials() {
  local email="$1"
  log "Activating service account auth"
  gcloud auth activate-service-account "$email" --key-file="$KEY_FILE" >/dev/null
  ok "gcloud auth active for $email"

  log "Fetching cluster credentials"
  mkdir -p "$(dirname "$KUBECONFIG_OUT")"
  : > "$KUBECONFIG_OUT"   # ensure file exists
  KUBECONFIG="$KUBECONFIG_OUT" \
  gcloud container clusters get-credentials "$CLUSTER" \
    --region "$REGION" \
    --project "$PROJECT_ID" >/dev/null
  ok "kubectl configured for cluster: $CLUSTER (kubeconfig: $KUBECONFIG_OUT)"
}

verify_kube_access() {
  log "Verifying Kubernetes access"
  if kubectl --kubeconfig="$KUBECONFIG_OUT" get ns default >/dev/null 2>&1;
  then
    ok "Kubernetes access verified"
  else
    die "Failed to verify Kubernetes access"
  fi
}

cleanup() {
  local email="$1"
  log "Starting cleanup for $email"

  # Delete the specific key in IAM if we can extract its ID from the local file
  if [ -f "$KEY_FILE" ]; then
    local key_id
    key_id="$(sed -n 's/.*"private_key_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$KEY_FILE" | head -n1 || true)"
    if [ -n "${key_id:-}" ]; then
      log "Deleting IAM key id: $key_id"
      gcloud iam service-accounts keys delete "$key_id" \
        --iam-account "$email" \
        --project "$PROJECT_ID" \
        --quiet || warn "Could not delete IAM key id $key_id (may already be gone)"
    else
      warn "Could not parse private_key_id from $KEY_FILE; skip IAM key delete"
    fi
  else
    warn "Key file not found locally; skipping IAM key id parsing"
  fi

  # Revoke local gcloud auth for the service account
  log "Revoking gcloud auth for $email"
  gcloud auth revoke --account "$email" --quiet || warn "Auth revoke returned non-zero"

  # Remove IAM roles
  IFS=',' read -r -a arr <<< "$ROLES"
  for role in "${arr[@]}"; do
    log "Removing role $role from $email"
    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
      --member "serviceAccount:$email" \
      --role "$role" \
      --quiet || warn "Role removal returned non-zero for $role"
  done

  # Delete the service account if requested
  if [ "$DELETE_SA" -eq 1 ]; then
    log "Deleting service account $email"
    gcloud iam service-accounts delete "$email" \
      --project "$PROJECT_ID" \
      --quiet || warn "Service account delete returned non-zero"
  fi

  # Securely remove the local key file
  if [ -f "$KEY_FILE" ]; then
    log "Securely deleting local key file: $KEY_FILE"
    secure_rm "$KEY_FILE"
    ok "Local key file removed"
  else
    warn "Local key file not found: $KEY_FILE"
  fi

  if [ "$DELETE_KUBECONFIG" -eq 1 ] && [ -f "$KUBECONFIG_OUT" ]; then
    log "Deleting kubeconfig file: $KUBECONFIG_OUT"
    secure_rm "$KUBECONFIG_OUT"
    ok "Kubeconfig file removed"
  fi

  ok "Cleanup complete"
}

main() {
  parse_args "$@"

  require_cmd gcloud
  require_cmd kubectl

  local email
  email="$(sa_email)"

  if [ "$CLEANUP" -eq 1 ]; then
    [ -n "$PROJECT_ID" ] || die "--project-id is required for cleanup"
    cleanup "$email"
    exit 0
  fi

  [ -n "$PROJECT_ID" ] || die "--project-id is required"
  [ -n "$CLUSTER" ] || die "--cluster is required"
  [ -n "$REGION" ] || die "--region is required"

  log "Project:  $PROJECT_ID"
  log "Cluster:  $CLUSTER"
  log "Region:   $REGION"
  log "SA name:  $SA_NAME"
  log "SA email: $email"
  log "Key file: $KEY_FILE"
  log "Roles:    $ROLES"

  activate_and_get_credentials "$email"
  verify_kube_access
  ok "Provisioning complete"

  if [ "$PRINT_KUBECONFIG" -eq 1 ] && [ -f "$KUBECONFIG_OUT" ]; then
    printf '%s\n' "BEGIN-KUBECONFIG"
    cat "$KUBECONFIG_OUT"
    printf '%s\n' "END-KUBECONFIG"
  fi
  printf '%s\n' "To clean up later:"
  printf '  %s\n' "$0 --cleanup --project-id $PROJECT_ID --sa-name $SA_NAME --key-file $KEY_FILE --roles $ROLES [--delete-sa] [--delete-kubeconfig] --kubeconfig-out $KUBECONFIG_OUT"
}

main "$@"