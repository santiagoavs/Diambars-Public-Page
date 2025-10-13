#!/bin/bash

# ⚡ Image Optimization Script
# Converts PNG/JPG images to WebP format
# Requires: imagemagick (sudo apt install imagemagick)

QUALITY=85
DIRS=(
  "public/images/home"
  "public/images/tshirt-designs"
  "public/images/navbar"
)

echo "🚀 Starting image optimization..."
echo ""

# Check if imagemagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo "   Install with: sudo apt install imagemagick"
    echo "   Or on Mac: brew install imagemagick"
    exit 1
fi

TOTAL_CONVERTED=0
TOTAL_SKIPPED=0

for DIR in "${DIRS[@]}"; do
    if [ ! -d "$DIR" ]; then
        echo "⏭️  Skipping $DIR (directory not found)"
        continue
    fi

    echo "📁 Processing: $DIR"
    CONVERTED=0
    SKIPPED=0

    # Find all PNG and JPG files
    find "$DIR" -maxdepth 1 \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r FILE; do
        BASENAME=$(basename "$FILE")
        FILENAME="${BASENAME%.*}"
        EXT="${BASENAME##*.}"
        WEBP_FILE="$DIR/$FILENAME.webp"

        # Skip if WebP already exists
        if [ -f "$WEBP_FILE" ]; then
            echo "⏭️  Skipped: $BASENAME (WebP exists)"
            ((SKIPPED++))
            continue
        fi

        echo "🔄 Converting: $BASENAME → $FILENAME.webp"

        # Backup original
        cp "$FILE" "$FILE.original"

        # Convert to WebP
        if convert "$FILE" -quality $QUALITY "$WEBP_FILE" 2>/dev/null; then
            FILESIZE_ORIGINAL=$(du -h "$FILE" | cut -f1)
            FILESIZE_WEBP=$(du -h "$WEBP_FILE" | cut -f1)
            echo "✅ Converted: $BASENAME ($FILESIZE_ORIGINAL → $FILESIZE_WEBP)"
            ((CONVERTED++))
        else
            echo "❌ Failed: $BASENAME"
            rm -f "$FILE.original"
            ((SKIPPED++))
        fi
    done

    echo "📊 $DIR: Processed"
    echo ""
done

echo "=================================================="
echo "✨ Optimization complete!"
echo "📊 Check the directories for .webp files"
echo "💾 Originals backed up with .original extension"
echo "=================================================="
