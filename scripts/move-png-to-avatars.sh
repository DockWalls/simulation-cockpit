#!/bin/bash

# Move all .png files from public/ to public/avatars/

SOURCE_DIR="public"
TARGET_DIR="public/avatars"

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Find and move .png files
find "$SOURCE_DIR" -maxdepth 1 -type f -iname "*.png" -exec mv {} "$TARGET_DIR/" \;

echo "All .png files moved from $SOURCE_DIR/ to $TARGET_DIR/"