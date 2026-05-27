// DJ Studio Audio Bridge - Injected Script
// This script is injected into Spotify pages for additional functionality

console.log('DJ Studio Audio Bridge injected script loaded')

// Listen for messages from content script
window.addEventListener('message', (event) => {
  // Only accept messages from our content script
  if (event.source !== window) return
  
  const message = event.data
  if (message.source !== 'dj-studio-extension') return
  
  console.log('Injected script received message:', message)
  
  // Handle different message types
  switch (message.type) {
    case 'EXTRACT_TRACK_INFO':
      const trackInfo = extractTrackInfo()
      window.postMessage({
        source: 'dj-studio-extension',
        type: 'TRACK_INFO_RESPONSE',
        trackInfo
      }, '*')
      break
  }
})

// Function to extract track information
function extractTrackInfo() {
  try {
    // Look for track information in various Spotify page elements
    let trackInfo = null
    
    // Method 1: Check for Spotify Web Player track info
    const trackNameElement = document.querySelector('[data-testid="now-playing-widget"] [data-testid="track-info"] [data-testid="track-name"]') ||
                           document.querySelector('[data-testid="track-name"]') ||
                           document.querySelector('.track-name') ||
                           document.querySelector('[class*="track-name"]')
    
    const artistElement = document.querySelector('[data-testid="now-playing-widget"] [data-testid="track-info"] [data-testid="track-artist"]') ||
                         document.querySelector('[data-testid="track-artist"]') ||
                         document.querySelector('.track-artist') ||
                         document.querySelector('[class*="track-artist"]')
    
    const albumElement = document.querySelector('[data-testid="now-playing-widget"] [data-testid="track-info"] [data-testid="track-album"]') ||
                        document.querySelector('[data-testid="track-album"]') ||
                        document.querySelector('.track-album') ||
                        document.querySelector('[class*="track-album"]')
    
    if (trackNameElement) {
      trackInfo = {
        name: trackNameElement.textContent?.trim(),
        artist: artistElement?.textContent?.trim() || 'Unknown Artist',
        album: albumElement?.textContent?.trim() || 'Unknown Album',
        id: trackNameElement.closest('[data-testid]')?.getAttribute('data-testid') || null,
        timestamp: Date.now()
      }
    }
    
    return trackInfo
    
  } catch (error) {
    console.error('Error extracting track info in injected script:', error)
    return null
  }
}
