// DJ Studio Audio Bridge - Background Service Worker
// Handles audio capture and communication with the main app

let capturedStreams = new Map() // tabId -> MediaStream
let activeConnections = new Map() // tabId -> RTCPeerConnection
let djStudioTab = null

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.type)
  
  switch (request.type) {
    case 'START_CAPTURE':
      startAudioCapture(request.tabId)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }))
      return true // Keep channel open for async response
      
    case 'STOP_CAPTURE':
      stopAudioCapture(request.tabId)
      sendResponse({ success: true })
      break
      
    case 'GET_STATUS':
      sendResponse({
        isCapturing: capturedStreams.has(request.tabId),
        isConnected: activeConnections.has(request.tabId)
      })
      break
      
    case 'SPOTIFY_TAB_READY':
      // Spotify tab is ready, store its info
      console.log('Spotify tab ready:', sender.tab.id)
      break
  }
})

// Start capturing audio from a tab
async function startAudioCapture(tabId) {
  console.log('Starting audio capture for tab:', tabId)
  
  try {
    // Request audio capture permission
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
      audioConstraints: {
        mandatory: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          googEchoCancellation: false,
          googAutoGainControl: false,
          googNoiseSuppression: false,
          googHighpassFilter: false
        }
      }
    })
    
    if (!stream) {
      throw new Error('Failed to capture audio stream')
    }
    
    console.log('Audio stream captured successfully')
    capturedStreams.set(tabId, stream)
    
    // Find DJ Studio tab
    const djTabs = await chrome.tabs.query({
      url: ['http://localhost:3000/*', 'https://*.vercel.app/*']
    })
    
    if (djTabs.length > 0) {
      djStudioTab = djTabs[0]
      await establishConnection(tabId, stream)
    } else {
      console.warn('DJ Studio tab not found. Open DJ Studio to connect.')
    }
    
    // Update icon to show active state
    chrome.action.setBadgeText({ text: 'ON' })
    chrome.action.setBadgeBackgroundColor({ color: '#00ff00' })
    
  } catch (error) {
    console.error('Error capturing audio:', error)
    throw error
  }
}

// Stop capturing audio
function stopAudioCapture(tabId) {
  console.log('Stopping audio capture for tab:', tabId)
  
  // Stop the stream
  const stream = capturedStreams.get(tabId)
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    capturedStreams.delete(tabId)
  }
  
  // Close connection
  const connection = activeConnections.get(tabId)
  if (connection) {
    connection.close()
    activeConnections.delete(tabId)
  }
  
  // Update icon
  if (capturedStreams.size === 0) {
    chrome.action.setBadgeText({ text: '' })
  }
}

// Establish WebRTC connection with DJ Studio
async function establishConnection(tabId, stream) {
  console.log('Establishing connection for tab:', tabId)
  
  // Create peer connection
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })
  
  // Add audio stream
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream)
  })
  
  // Store connection
  activeConnections.set(tabId, pc)
  
  // Send connection offer to DJ Studio tab
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  
  // Send offer to DJ Studio through messaging
  chrome.tabs.sendMessage(djStudioTab.id, {
    type: 'AUDIO_STREAM_OFFER',
    tabId: tabId,
    offer: offer
  })
  
  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      chrome.tabs.sendMessage(djStudioTab.id, {
        type: 'ICE_CANDIDATE',
        tabId: tabId,
        candidate: event.candidate
      })
    }
  }
}

// Listen for tab updates to detect Spotify
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('open.spotify.com')) {
    // Inject content script if needed
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, response => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-script.js']
        })
      }
    })
  }
})

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  stopAudioCapture(tabId)
})

// Listen for messages from DJ Studio web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('External message received:', request)
  
  switch (request.type) {
    case 'GET_SPOTIFY_TABS':
      chrome.tabs.query({ url: 'https://open.spotify.com/*' }, (tabs) => {
        sendResponse({
          tabs: tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            isCapturing: capturedStreams.has(tab.id)
          }))
        })
      })
      return true
      
    case 'WEBRTC_ANSWER':
      handleWebRTCAnswer(request.tabId, request.answer)
      sendResponse({ success: true })
      break
  }
})

// Handle WebRTC answer from DJ Studio
async function handleWebRTCAnswer(tabId, answer) {
  const pc = activeConnections.get(tabId)
  if (pc) {
    await pc.setRemoteDescription(answer)
  }
}