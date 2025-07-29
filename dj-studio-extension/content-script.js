// DJ Studio Audio Bridge - Content Script
// Injected into Spotify tabs to provide UI feedback and track info

console.log('DJ Studio Audio Bridge: Content script loaded on Spotify')

// Create status indicator
const indicator = document.createElement('div')
indicator.id = 'dj-studio-indicator'
indicator.innerHTML = `
  <div style="
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(139, 92, 246, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 999999;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
  " id="dj-indicator-content">
    <div style="
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    " id="status-dot"></div>
    <span id="status-text">DJ Studio Ready</span>
  </div>
  <style>
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    #dj-indicator-content:hover {
      transform: scale(1.05);
      background: rgba(139, 92, 246, 1);
    }
  </style>
`

// Add indicator to page
document.body.appendChild(indicator)

// Track current playing info
let currentTrackInfo = null

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received:', request.type)
  
  switch (request.type) {
    case 'PING':
      sendResponse({ status: 'ready' })
      break
      
    case 'UPDATE_STATUS':
      updateIndicator(request.status)
      break
      
    case 'GET_TRACK_INFO':
      sendResponse(getCurrentTrackInfo())
      break
  }
})

// Update indicator based on capture status
function updateIndicator(status) {
  const statusDot = document.getElementById('status-dot')
  const statusText = document.getElementById('status-text')
  
  switch (status) {
    case 'capturing':
      statusDot.style.background = '#ef4444' // Red - recording
      statusText.textContent = 'Capturing Audio'
      break
    case 'connected':
      statusDot.style.background = '#22c55e' // Green - connected
      statusText.textContent = 'Connected to DJ Studio'
      break
    case 'ready':
    default:
      statusDot.style.background = '#22c55e' // Green - ready
      statusText.textContent = 'DJ Studio Ready'
      break
  }
}

// Get current track information from Spotify's DOM
function getCurrentTrackInfo() {
  try {
    // Try to get track info from Spotify's player bar
    const trackName = document.querySelector('[data-testid="context-item-link"]')?.textContent
    const artistName = document.querySelector('[data-testid="context-item-info-artist"]')?.textContent
    const albumArt = document.querySelector('[data-testid="cover-art-image"]')?.src
    
    // Get playback progress
    const progressBar = document.querySelector('[data-testid="playback-progressbar"]')
    const currentTime = progressBar?.getAttribute('aria-valuetext')
    
    return {
      track: trackName || 'Unknown Track',
      artist: artistName || 'Unknown Artist',
      albumArt: albumArt || null,
      currentTime: currentTime || '0:00',
      timestamp: Date.now()
    }
  } catch (error) {
    console.error('Error getting track info:', error)
    return null
  }
}

// Monitor for track changes
const observer = new MutationObserver(() => {
  const newTrackInfo = getCurrentTrackInfo()
  if (newTrackInfo && newTrackInfo.track !== currentTrackInfo?.track) {
    currentTrackInfo = newTrackInfo
    
    // Notify background script of track change
    chrome.runtime.sendMessage({
      type: 'TRACK_CHANGED',
      trackInfo: currentTrackInfo
    })
  }
})

// Start observing player bar for changes
const playerBar = document.querySelector('[data-testid="now-playing-widget"]')
if (playerBar) {
  observer.observe(playerBar, {
    childList: true,
    subtree: true,
    characterData: true
  })
}

// Click handler for indicator
indicator.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_CAPTURE' })
})

// Notify background that Spotify tab is ready
chrome.runtime.sendMessage({ type: 'SPOTIFY_TAB_READY' })

// Add warning overlay
const warningOverlay = document.createElement('div')
warningOverlay.innerHTML = `
  <div style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 10px;
    text-align: center;
    font-size: 12px;
    z-index: 999998;
    display: none;
  " id="dj-warning">
    ⚠️ DJ Studio Audio Capture Active - For personal use only. Do not distribute recorded content.
  </div>
`
document.body.appendChild(warningOverlay)

// Show warning when capturing
chrome.storage.local.get(['isCapturing'], (result) => {
  if (result.isCapturing) {
    document.getElementById('dj-warning').style.display = 'block'
    updateIndicator('capturing')
  }
})