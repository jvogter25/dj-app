# DJ Studio Audio Bridge - Chrome Extension

This Chrome extension enables audio capture from Spotify Web Player for use in DJ Studio's Mix Creation Mode.

## Features

- Captures audio from Spotify tabs
- Streams audio to DJ Studio via WebRTC
- Enables full audio processing (stems, effects, tempo control)
- Shows capture status on Spotify pages

## Installation

### Developer Mode Installation (Recommended for now)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dj-studio-extension` folder
5. The extension will appear in your extensions bar

### Creating Icons

For now, you can use any 128x128 PNG image as the icon. Create these files:
- `icons/icon-16.png` (16x16)
- `icons/icon-32.png` (32x32)
- `icons/icon-48.png` (48x48)
- `icons/icon-128.png` (128x128)

Or use a purple music note icon from any icon generator.

## Usage

1. Open Spotify Web Player in a Chrome tab
2. Click the DJ Studio extension icon
3. Click "Capture" next to the Spotify tab
4. Open DJ Studio and switch to "Mix Creation Mode"
5. The audio stream will automatically connect

## Privacy & Legal

**IMPORTANT: This extension is for PERSONAL USE ONLY**

- Do not distribute or share any content captured from streaming services
- Respect copyright and terms of service of all platforms
- Use only for personal mixing, learning, and analysis

## How It Works

1. **Tab Capture**: Uses Chrome's `tabCapture` API to get audio stream
2. **WebRTC**: Streams audio to DJ Studio with low latency
3. **Processing**: DJ Studio processes audio for:
   - Stem separation
   - Tempo/pitch control
   - Effects and filters
   - Waveform generation
   - Mix recording

## Troubleshooting

- **No audio**: Make sure Spotify is playing audio
- **Can't connect**: Ensure DJ Studio is open on the same machine
- **High CPU**: Audio processing is intensive; close other tabs

## Development

To modify the extension:
1. Edit the source files
2. Click "Reload" in chrome://extensions/
3. Test the changes

## Future Features

- Multi-tab capture
- Audio routing options
- Built-in EQ preview
- Automatic track detection