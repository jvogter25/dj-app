// DJ Studio Audio Bridge - Content Script
// Injected into Spotify pages to detect track changes and extract metadata

let currentTrackInfo = null
let trackObserver = null
let isObserving = false

// Initialize content script
console.log('DJ Studio Audio Bridge content script loaded')

// Function to extract track information from Spotify page
function extractTrackInfo() {
  const url = window.location.href
  let trackInfo = null
  
  console.log('Extracting track info from URL:', url)
  
  // Method 1: Check for currently playing track (highest priority)
  // Look for the now playing bar at the bottom of the page
  const nowPlayingBar = document.querySelector('[data-testid="now-playing-bar"]') ||
                       document.querySelector('[data-testid="now-playing-widget"]') ||
                       document.querySelector('.now-playing-bar') ||
                       document.querySelector('[class*="now-playing"]') ||
                       document.querySelector('[class*="player-bar"]') ||
                       document.querySelector('[data-testid="playback-controls"]') ||
                       document.querySelector('[data-testid="playback-bar"]')
  
  if (nowPlayingBar) {
    console.log('DEBUG: Method 1 - Found now playing bar')
    // Look for track name in the now playing bar
    const trackNameElement = nowPlayingBar.querySelector('[data-testid="track-name"]') ||
                           nowPlayingBar.querySelector('.track-name') ||
                           nowPlayingBar.querySelector('[class*="track-name"]') ||
                           nowPlayingBar.querySelector('[data-testid="track-info"]') ||
                           nowPlayingBar.querySelector('[class*="track-info"]') ||
                           nowPlayingBar.querySelector('[data-testid="now-playing-track-name"]') ||
                           nowPlayingBar.querySelector('[class*="track-title"]')
    
    // Look for artist in the now playing bar
    const artistElement = nowPlayingBar.querySelector('[data-testid="track-artist"]') ||
                         nowPlayingBar.querySelector('.track-artist') ||
                         nowPlayingBar.querySelector('[class*="track-artist"]') ||
                         nowPlayingBar.querySelector('[data-testid="track-info"] [class*="artist"]') ||
                         nowPlayingBar.querySelector('[data-testid="now-playing-track-artist"]') ||
                         nowPlayingBar.querySelector('[class*="artist-name"]')
    
    // Look for album in the now playing bar
    const albumElement = nowPlayingBar.querySelector('[data-testid="track-album"]') ||
                        nowPlayingBar.querySelector('.track-album') ||
                        nowPlayingBar.querySelector('[class*="track-album"]') ||
                        nowPlayingBar.querySelector('[data-testid="track-info"] [class*="album"]') ||
                        nowPlayingBar.querySelector('[data-testid="now-playing-track-album"]')
    
    if (trackNameElement) {
      trackInfo = {
        name: trackNameElement.textContent?.trim(),
        artist: artistElement?.textContent?.trim() || 'Unknown Artist',
        album: albumElement?.textContent?.trim() || 'Unknown Album',
        id: trackNameElement.closest('[data-testid]')?.getAttribute('data-testid') || 
            nowPlayingBar.getAttribute('data-testid') || null,
        type: 'currently_playing'
      }
      console.log('Found currently playing track:', trackInfo)
      return trackInfo
    } else {
      console.log('DEBUG: Method 1 - No track name element found in now playing bar')
    }
  } else {
    console.log('DEBUG: Method 1 - No now playing bar found')
  }
  
  // Method 2: Check for track info in the main content area (when playing from playlist)
  const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main"]')
  if (mainContent) {
    console.log('DEBUG: Method 2 - Found main content')
    // Look for track info that might be displayed prominently
    const trackNameElement = mainContent.querySelector('[data-testid="track-name"]') ||
                           mainContent.querySelector('.track-name') ||
                           mainContent.querySelector('[class*="track-name"]') ||
                           mainContent.querySelector('h1') ||
                           mainContent.querySelector('[class*="title"]')
    
    const artistElement = mainContent.querySelector('[data-testid="track-artist"]') ||
                         mainContent.querySelector('.track-artist') ||
                         mainContent.querySelector('[class*="track-artist"]') ||
                         mainContent.querySelector('[class*="artist"]') ||
                         mainContent.querySelector('[class*="subtitle"]')
    
    const albumElement = mainContent.querySelector('[data-testid="track-album"]') ||
                        mainContent.querySelector('.track-album') ||
                        mainContent.querySelector('[class*="track-album"]') ||
                        mainContent.querySelector('[class*="album"]')
    
    if (trackNameElement && artistElement && 
        !trackNameElement.textContent?.includes('playlist') &&
        !artistElement.textContent?.includes('Various Artists')) {
      
      trackInfo = {
        name: trackNameElement.textContent?.trim(),
        artist: artistElement.textContent?.trim(),
        album: albumElement?.textContent?.trim() || 'Unknown Album',
        id: trackNameElement.closest('[data-testid]')?.getAttribute('data-testid') || null,
        type: 'main_content_track'
      }
      console.log('Found track in main content:', trackInfo)
      return trackInfo
    } else {
      console.log('DEBUG: Method 2 - No track info found in main content')
    }
  } else {
    console.log('DEBUG: Method 2 - No main content found')
  }

  // Method 2.5: Check page title for track info when on playlist page
  const playlistUrlMatch = url.match(/\/playlist\/([a-zA-Z0-9]+)/)
  if (playlistUrlMatch) {
    console.log('DEBUG: Method 2.5 - Found playlist URL')
    const pageTitle = document.title
    console.log('DEBUG: Checking page title for track info:', pageTitle)
    
    // Spotify page titles often follow the pattern: "Song Name - Artist Name | Spotify" or "Song Name • Artist Name | Spotify"
    const titleMatch = pageTitle.match(/^(.+?)\s*[-•]\s*(.+?)\s*\|/)
    console.log('DEBUG: Title regex match result:', titleMatch)
    
    if (titleMatch && !pageTitle.toLowerCase().includes('playlist')) {
      const songName = titleMatch[1].trim()
      const artistName = titleMatch[2].trim()
      
      console.log('DEBUG: Extracted song name:', songName)
      console.log('DEBUG: Extracted artist name:', artistName)
      
      // Only use this if it looks like a real song (not playlist info)
      if (songName && artistName && 
          songName.length > 0 && artistName.length > 0 &&
          !songName.includes('playlist') && !artistName.includes('Various Artists')) {
        
        trackInfo = {
          name: songName,
          artist: artistName,
          album: 'Unknown Album',
          id: playlistUrlMatch[1] + '_current',
          type: 'playlist_current_track'
        }
        console.log('Found track from page title:', trackInfo)
        return trackInfo
      } else {
        console.log('DEBUG: Song/artist validation failed - songName:', songName, 'artistName:', artistName)
      }
    } else {
      console.log('DEBUG: Title regex failed or contains playlist keyword')
    }
  } else {
    console.log('DEBUG: Method 2.5 - No playlist URL match found')
  }

  // Method 3: Check for individual track page (when not playing)
  const trackMatch = url.match(/\/track\/([a-zA-Z0-9]+)/)
  if (trackMatch) {
    console.log('DEBUG: Method 3 - Found track URL')
    const trackId = trackMatch[1]
    
    // Look for track info in the page
    const trackNameElement = document.querySelector('[data-testid="track-name"]') ||
                           document.querySelector('.track-name') ||
                           document.querySelector('[class*="track-name"]') ||
                           document.querySelector('h1')
    
    const artistElement = document.querySelector('[data-testid="track-artist"]') ||
                         document.querySelector('.track-artist') ||
                         document.querySelector('[class*="track-artist"]') ||
                         document.querySelector('[class*="artist"]')
    
    const albumElement = document.querySelector('[data-testid="track-album"]') ||
                        document.querySelector('.track-album') ||
                        document.querySelector('[class*="track-album"]') ||
                        document.querySelector('[class*="album"]')
    
    if (trackNameElement) {
      trackInfo = {
        name: trackNameElement.textContent?.trim(),
        artist: artistElement?.textContent?.trim() || 'Unknown Artist',
        album: albumElement?.textContent?.trim() || 'Unknown Album',
        id: trackId,
        type: 'track_page'
      }
      console.log('Found individual track page:', trackInfo)
      return trackInfo
    } else {
      console.log('DEBUG: Method 3 - No track info found in individual track page')
    }
  } else {
    console.log('DEBUG: Method 3 - No track URL match found')
  }
  
  // Method 4: Check for individual tracks in playlist (when browsing playlist)
  const playlistTracks = document.querySelectorAll('[data-testid="playlist-track"]')
  if (playlistTracks.length > 0) {
    console.log('DEBUG: Method 4 - Found playlist tracks')
    // Look for the first track or the track that might be highlighted
    let selectedTrack = null
    
    // First, look for a track that's currently selected/highlighted
    for (const track of playlistTracks) {
      if (track.classList.contains('selected') || 
          track.getAttribute('aria-selected') === 'true' ||
          track.querySelector('[data-testid="track-name"]')?.closest('.selected')) {
        selectedTrack = track
        break
      }
    }
    
    // If no selected track, use the first one
    if (!selectedTrack && playlistTracks.length > 0) {
      selectedTrack = playlistTracks[0]
    }
    
    if (selectedTrack) {
      const trackNameElement = selectedTrack.querySelector('[data-testid="track-name"]') ||
                             selectedTrack.querySelector('.track-name')
      const artistElement = selectedTrack.querySelector('[data-testid="track-artist"]') ||
                          selectedTrack.querySelector('.track-artist')
      const albumElement = selectedTrack.querySelector('[data-testid="track-album"]') ||
                         selectedTrack.querySelector('.track-album')
      
      if (trackNameElement) {
        trackInfo = {
          name: trackNameElement.textContent?.trim(),
          artist: artistElement?.textContent?.trim() || 'Unknown Artist',
          album: albumElement?.textContent?.trim() || 'Unknown Album',
          id: selectedTrack.getAttribute('data-testid') || null,
          type: 'playlist_track'
        }
        console.log('Found playlist track:', trackInfo)
        return trackInfo
      } else {
        console.log('DEBUG: Method 4 - No track info found in playlist track')
      }
    } else {
      console.log('DEBUG: Method 4 - No selected track found in playlist')
    }
  } else {
    console.log('DEBUG: Method 4 - No playlist tracks found')
  }
  
  // Method 5: Check for album page
  const albumMatch = url.match(/\/album\/([a-zA-Z0-9]+)/)
  if (albumMatch) {
    console.log('DEBUG: Method 5 - Found album URL')
    const albumId = albumMatch[1]
    trackInfo = {
      name: document.title?.replace(' | Spotify', '') || 'Unknown Album',
      artist: document.querySelector('[data-testid="album-artist"]')?.textContent?.trim() || 'Unknown Artist',
      album: document.title?.replace(' | Spotify', '') || 'Unknown Album',
      id: albumId,
      type: 'album'
    }
    console.log('Found album page:', trackInfo)
    return trackInfo
  } else {
    console.log('DEBUG: Method 5 - No album URL match found')
  }
  
  // Method 6: Check for playlist info (lowest priority - only if nothing else found)
  const playlistMatch = url.match(/\/playlist\/([a-zA-Z0-9]+)/)
  if (playlistMatch) {
    console.log('DEBUG: Method 6 - Found playlist URL')
    const playlistId = playlistMatch[1]
    trackInfo = {
      name: document.title?.replace(' | Spotify', '') || 'Playlist',
      artist: 'Various Artists',
      album: 'Playlist',
      id: playlistId,
      type: 'playlist'
    }
    console.log('Found playlist page:', trackInfo)
    return trackInfo
  } else {
    console.log('DEBUG: Method 6 - No playlist URL match found')
  }
  
  // If nothing found, return null
  console.log('No track information found')
  return null
}

// Function to check if track has changed
function checkTrackChange() {
  const newTrackInfo = extractTrackInfo()
  
  // Check if track info has actually changed
  const hasChanged = !currentTrackInfo || 
                    !newTrackInfo || 
                    newTrackInfo.name !== currentTrackInfo.name || 
                    newTrackInfo.artist !== currentTrackInfo.artist ||
                    newTrackInfo.id !== currentTrackInfo.id ||
                    newTrackInfo.type !== currentTrackInfo.type
  
  if (hasChanged && newTrackInfo) {
    console.log('Track changed:', newTrackInfo)
    currentTrackInfo = newTrackInfo
    
    // Send track info to background script
    chrome.runtime.sendMessage({
      type: 'TRACK_INFO_UPDATE',
      tabId: null, // Will be filled by background script
      trackInfo: newTrackInfo
    }).catch(error => {
      console.warn('Failed to send track info:', error)
    })
  } else if (!newTrackInfo && currentTrackInfo) {
    // Track info was cleared (e.g., stopped playing)
    console.log('Track info cleared')
    currentTrackInfo = null
    
    // Send cleared track info to background script
    chrome.runtime.sendMessage({
      type: 'TRACK_INFO_UPDATE',
      tabId: null,
      trackInfo: null
    }).catch(error => {
      console.warn('Failed to send cleared track info:', error)
    })
  }
}

// Function to start observing for track changes
function startObserving() {
  if (isObserving) return
  
  console.log('Starting track observation')
  isObserving = true
  
  // Debug: Log all available elements
  debugPageElements()
  
  // Initial check
  checkTrackChange()
  
  // Set up periodic checking (less frequent to avoid spam)
  const checkInterval = setInterval(() => {
    if (!isObserving) {
      clearInterval(checkInterval)
      return
    }
    checkTrackChange()
  }, 5000) // Check every 5 seconds instead of 2
  
  // Set up mutation observer for DOM changes
  trackObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        // Check if any relevant elements changed
        const hasRelevantChanges = mutation.addedNodes.length > 0 || 
                                 mutation.removedNodes.length > 0 ||
                                 (mutation.target && (
                                   mutation.target.matches?.('[data-testid*="track"]') ||
                                   mutation.target.matches?.('[class*="track"]') ||
                                   mutation.target.matches?.('[class*="player"]') ||
                                   mutation.target.matches?.('[data-testid*="playlist"]') ||
                                   mutation.target.matches?.('[data-testid*="now-playing"]')
                                 ))
        
        if (hasRelevantChanges) {
          // Debounce the check
          clearTimeout(trackObserver.timeout)
          trackObserver.timeout = setTimeout(() => {
            checkTrackChange()
          }, 1000) // Increased debounce time
        }
      }
    }
  })
  
  // Start observing
  trackObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-testid', 'class', 'aria-selected']
  })
}

// Function to stop observing
function stopObserving() {
  if (!isObserving) return
  
  console.log('Stopping track observation')
  isObserving = false
  
  if (trackObserver) {
    trackObserver.disconnect()
    trackObserver = null
  }
}

// Function to debug what elements are available on the page
function debugPageElements() {
  console.log('=== DEBUG: Page Elements ===')
  
  // Check for now playing elements
  const nowPlayingElements = document.querySelectorAll('[class*="now-playing"], [data-testid*="now"], [class*="player"]')
  console.log('Now playing elements found:', nowPlayingElements.length)
  nowPlayingElements.forEach((el, i) => {
    console.log(`Now playing element ${i}:`, el.tagName, el.className, el.getAttribute('data-testid'))
  })
  
  // Check for track info elements
  const trackElements = document.querySelectorAll('[class*="track"], [data-testid*="track"]')
  console.log('Track elements found:', trackElements.length)
  trackElements.forEach((el, i) => {
    console.log(`Track element ${i}:`, el.tagName, el.className, el.getAttribute('data-testid'), el.textContent?.substring(0, 50))
  })
  
  // Check for artist elements
  const artistElements = document.querySelectorAll('[class*="artist"], [data-testid*="artist"]')
  console.log('Artist elements found:', artistElements.length)
  artistElements.forEach((el, i) => {
    console.log(`Artist element ${i}:`, el.tagName, el.className, el.getAttribute('data-testid'), el.textContent?.substring(0, 50))
  })
  
  // Check for main content
  const mainContent = document.querySelector('main') || document.querySelector('[data-testid="main"]')
  if (mainContent) {
    console.log('Main content found:', mainContent.tagName, mainContent.className)
    console.log('Main content children:', mainContent.children.length)
  }
  
  // Check page title and URL
  console.log('Page title:', document.title)
  console.log('Page URL:', window.location.href)
  
  // Check for specific Spotify elements
  const spotifyElements = document.querySelectorAll('[data-testid]')
  console.log('All data-testid elements found:', spotifyElements.length)
  spotifyElements.forEach((el, i) => {
    const testId = el.getAttribute('data-testid')
    if (testId && (testId.includes('track') || testId.includes('artist') || testId.includes('album') || testId.includes('now'))) {
      console.log(`Spotify element ${i}:`, el.tagName, testId, el.textContent?.substring(0, 50))
    }
  })
  
  // Check for the bottom player bar specifically
  const bottomPlayer = document.querySelector('[data-testid="now-playing-bar"]') || 
                      document.querySelector('[data-testid="now-playing-widget"]') ||
                      document.querySelector('.now-playing-bar') ||
                      document.querySelector('[class*="now-playing"]') ||
                      document.querySelector('[class*="player-bar"]')
  
  if (bottomPlayer) {
    console.log('Bottom player found:', bottomPlayer.tagName, bottomPlayer.className, bottomPlayer.getAttribute('data-testid'))
    console.log('Bottom player HTML:', bottomPlayer.outerHTML.substring(0, 500))
  } else {
    console.log('No bottom player found')
  }
  
  console.log('=== END DEBUG ===')
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message)
  
  switch (message.type) {
    case 'START_OBSERVING':
      startObserving()
      sendResponse({ success: true })
      break
      
    case 'STOP_OBSERVING':
      stopObserving()
      sendResponse({ success: true })
      break
      
    case 'GET_CURRENT_TRACK':
      sendResponse({ trackInfo: currentTrackInfo })
      break
      
    case 'DEBUG_PAGE':
      debugPageElements()
      sendResponse({ success: true, message: 'Debug info logged to console' })
      break
  }
})

// Start observing when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserving)
} else {
  startObserving()
}

// Also start observing when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startObserving()
  } else {
    stopObserving()
  }
})

// Handle page navigation (for SPA)
let lastUrl = location.href
new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    console.log('Page navigated to:', url)
    // Reset track info and restart observation
    currentTrackInfo = null
    stopObserving()
    setTimeout(startObserving, 1000) // Wait for page to load
  }
}).observe(document, { subtree: true, childList: true })
