#!/bin/bash

# DJ Studio Extension Build Script
echo "Building DJ Studio Audio Bridge Extension..."

cd dj-studio-extension

# Create icons directory if it doesn't exist
mkdir -p icons

# Check if icons exist, if not provide instructions
if [ ! -f "icons/icon-128.png" ]; then
  echo ""
  echo "⚠️  Extension icons missing!"
  echo ""
  echo "Please create the following icon files in dj-studio-extension/icons/:"
  echo "  - icon-16.png (16x16 pixels)" 
  echo "  - icon-32.png (32x32 pixels)"
  echo "  - icon-48.png (48x48 pixels)" 
  echo "  - icon-128.png (128x128 pixels)"
  echo ""
  echo "You can:"
  echo "  1. Use any purple music/DJ icon"
  echo "  2. Create simple colored squares as placeholders"
  echo "  3. Use an online icon generator"
  echo ""
  echo "For now, continuing without icons (extension will work but have default appearance)..."
  
  # Create simple placeholder icons using base64 data
  echo "Creating placeholder icons..."
  
  # Create a simple purple square icon (base64 encoded 1x1 purple pixel, scaled by browser)
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > icons/icon-16.png
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > icons/icon-32.png  
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > icons/icon-48.png
  echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > icons/icon-128.png
fi

# Validate manifest.json
echo "Validating manifest.json..."
if ! python3 -m json.tool manifest.json > /dev/null 2>&1; then
  echo "❌ Invalid manifest.json - please check for syntax errors"
  exit 1
fi

echo "✅ Manifest is valid"

# Create zip for distribution
echo "Creating extension package..."
cd ..
zip -r dj-studio-extension.zip dj-studio-extension/ -x "dj-studio-extension/.DS_Store" "dj-studio-extension/*/.DS_Store"

echo ""
echo "🎉 Extension built successfully!"
echo ""
echo "📦 Installation options:"
echo ""
echo "Option 1 - Load Unpacked (Recommended for development):"
echo "  1. Open Chrome and go to chrome://extensions/"
echo "  2. Enable 'Developer mode' (toggle in top right)"
echo "  3. Click 'Load unpacked'"
echo "  4. Select the 'dj-studio-extension' folder"
echo ""
echo "Option 2 - Install from ZIP:"
echo "  1. Extract dj-studio-extension.zip"
echo "  2. Follow Option 1 steps with extracted folder"
echo ""
echo "🚀 Usage:"
echo "  1. Open Spotify Web Player"
echo "  2. Click the DJ Studio extension icon" 
echo "  3. Click 'Capture' on your Spotify tab"
echo "  4. Open DJ Studio to start using the audio stream"
echo ""