#!/bin/bash

# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────
PROJECT_ID="simulation-cockpit"
SERVICE_ACCOUNT="firebase-hosting-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_RUN_URL="https://jverse-backend-372419426577.us-central1.run.app/trigger-animation"
TELEMETRY_BUCKET="gs://jallybean-telemetry-archive"
DATE=$(date +%Y%m%d)

# ─────────────────────────────────────────────────────────────
# STEP 1: Authenticate to Google Cloud
# ─────────────────────────────────────────────────────────────
echo "Authenticating to Google Cloud..."
gcloud auth activate-service-account "$SERVICE_ACCOUNT" --key-file="$GCP_KEY_PATH"
gcloud config set project "$PROJECT_ID"

# ─────────────────────────────────────────────────────────────
# STEP 2: Run Validator
# ─────────────────────────────────────────────────────────────
echo "Running validator.py..."
python JVerse/validators/validator.py --mode=batch --check=animation --exit-on-fail > validator.log || {
  echo "Validator failed. Aborting deployment."
  exit 1
}

# ─────────────────────────────────────────────────────────────
# STEP 3: Deploy Avatars and HUD Overlays to Firebase Hosting
# ─────────────────────────────────────────────────────────────
echo "Deploying avatars and HUD overlays..."
firebase deploy --only hosting:jverse -P simulation-cockpit
firebase deploy --only hosting:jversehud -P simulation-cockpit

# ─────────────────────────────────────────────────────────────
# STEP 4: Trigger Cloud Run Animation Endpoint
# ─────────────────────────────────────────────────────────────
echo "Triggering Cloud Run animation endpoint..."
curl -X POST "$CLOUD_RUN_URL" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"event":"avatar_animation","source":"ci_cd","context":"greeting","ethics":"nonviolent"}'

# ─────────────────────────────────────────────────────────────
# STEP 5: Ensure Telemetry Bucket Exists
# ─────────────────────────────────────────────────────────────
echo "Checking telemetry bucket..."
if ! gsutil ls "$TELEMETRY_BUCKET" >/dev/null 2>&1; then
  echo "Creating telemetry bucket..."
  gsutil mb -p "$PROJECT_ID" "$TELEMETRY_BUCKET"
fi

# ─────────────────────────────────────────────────────────────
# STEP 6: Archive Telemetry Logs
# ─────────────────────────────────────────────────────────────
echo "Archiving telemetry logs..."
gsutil cp validator.log "$TELEMETRY_BUCKET/$DATE/validator.log"
gsutil cp rulebook.log "$TELEMETRY_BUCKET/$DATE/rulebook.log"

# ─────────────────────────────────────────────────────────────
# STEP 7: Log Deployment to Rulebook
# ─────────────────────────────────────────────────────────────
echo "$(date) - Full simulation deployment executed" >> rulebook.log
git add rulebook.log
git commit -m "Log full simulation deployment"

# Ensure upstream tracking
git push --set-upstream origin feature/jverse-simulation-cockpit

echo "✅ Full simulation deployment complete."