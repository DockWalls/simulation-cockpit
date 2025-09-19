#!/bin/bash

# Fail fast
set -e

# Channel name
CHANNEL="jallybean_Channel"

# Firebase project ID
PROJECT_ID="ivory-mountain-470414-k1"

# Build the Vite project
echo "🔧 Building Vite project..."
npm run build

# Deploy to Firebase preview channel
echo "🚀 Deploying to Firebase channel: $CHANNEL"
firebase hosting:channel:deploy $CHANNEL --project $PROJECT_ID