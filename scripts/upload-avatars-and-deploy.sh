#!/bin/bash

# Upload avatar images and deploy to Firebase Hosting channel: jallybean_Channel

# Define source and target paths
SOURCE_DIR="$HOME/Downloads"
TARGET_DIR="public/avatars"

# List of avatar files
AVATARS=("commander-blue.png" "tactical-black.png" "stealth-green.png" "justice-white.png")

echo "Preparing to upload avatars..."

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Move each avatar into public/avatars/
for avatar in "${AVATARS[@]}"; do
  if [ -f "$SOURCE_DIR/$avatar" ]; then
    cp "$SOURCE_DIR/$avatar" "$TARGET_DIR/"
    echo "Uploaded: $avatar"
  else
    echo "Missing: $avatar (not found in $SOURCE_DIR)"
  fi
done

# Stage and commit changes
git add "$TARGET_DIR/"
git commit -m "Upload avatar assets for viewer hydration"
git push origin main

# Deploy to Firebase Hosting channel
firebase hosting:channel:deploy jallybean_Channel

# Report status
if [ $? -eq 0 ]; then
  echo "Deploy successful"
else
  echo "Deploy failed"
fi