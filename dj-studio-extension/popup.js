// DJ Studio Audio Bridge - Popup Script
// Manages the extension popup UI

let spotifyTabs = []
let capturingTabs = new Set()

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded')
  await updateTabsList()
  await updateStatus()
})

// Update list of Spotify tabs
async function updateTabsList() {
  const tabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' })
  spotifyTabs = tabs
  
  const container = document.getElementById('tabs-container')
  
  if (tabs.length === 0) {
    container.innerHTML = `
      <div class="no-tabs">
        <p>No Spotify tabs found</p>
        <p style="font-size: 12px; margin-top: 8px;">Open Spotify Web Player to start capturing</p>
      </div>
    `
    return
  }
  
  container.innerHTML = tabs.map(tab => {
    const isCapturing = capturingTabs.has(tab.id)
    return `
      <div class="tab-item ${isCapturing ? 'active' : ''}" data-tab-id="${tab.id}">
        <div class="tab-title">${tab.title || 'Spotify'}</div>
        <button class="capture-btn ${isCapturing ? 'stop' : ''}" data-tab-id="${tab.id}">
          ${isCapturing ? 'Stop' : 'Capture'}
        </button>
      </div>
    `
  }).join('')
  
  // Add click handlers
  container.querySelectorAll('.capture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const tabId = parseInt(btn.dataset.tabId)
      toggleCapture(tabId)
    })
  })
}

// Toggle audio capture for a tab
async function toggleCapture(tabId) {
  const isCapturing = capturingTabs.has(tabId)
  
  if (isCapturing) {
    // Stop capture
    chrome.runtime.sendMessage({
      type: 'STOP_CAPTURE',
      tabId: tabId
    }, () => {
      capturingTabs.delete(tabId)
      updateTabsList()
      updateStatus()
    })
  } else {
    // Start capture
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId: tabId
    }, (response) => {
      if (response.success) {
        capturingTabs.add(tabId)
        updateTabsList()
        updateStatus()
        
        // Show notification
        showNotification('Audio capture started! Open DJ Studio to connect.')
      } else {
        showNotification('Failed to capture audio: ' + response.error, 'error')
      }
    })
  }
}

// Update connection status
async function updateStatus() {
  const statusDot = document.getElementById('status-dot')
  const statusText = document.getElementById('status-text')
  const statusDetail = document.getElementById('status-detail')
  
  if (capturingTabs.size > 0) {
    statusDot.classList.add('capturing')
    statusText.textContent = `Capturing ${capturingTabs.size} tab${capturingTabs.size > 1 ? 's' : ''}`
    statusDetail.textContent = 'Audio stream active'
    
    // Check if connected to DJ Studio
    const djTabs = await chrome.tabs.query({
      url: ['http://localhost:3000/*', 'https://*.vercel.app/*']
    })
    
    if (djTabs.length > 0) {
      statusDot.classList.add('active')
      statusDetail.textContent = 'Connected to DJ Studio'
    }
  } else {
    statusDot.classList.remove('capturing', 'active')
    statusText.textContent = 'Not capturing'
    statusDetail.textContent = 'Click a tab to start'
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // You could implement a toast notification here
  console.log(`[${type}] ${message}`)
}

// Listen for status updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STATUS_UPDATE') {
    updateStatus()
  }
})

// Auto-refresh tabs list when popup opens
setInterval(updateTabsList, 2000)