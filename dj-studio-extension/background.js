// DJ Studio Audio Bridge - Background Service Worker
// Handles audio capture and communication with the main app

let capturedStreams = new Map() // tabId -> MediaStream
let activeConnections = new Map() // tabId -> RTCPeerConnection
let djStudioTab = null
let processingQueue = [] // Tracks queued for processing
let batchProcessing = false
let currentBatch = null

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
      
    case 'START_BATCH_PROCESSING':
      startBatchProcessing(request.playlistIds, request.batchId)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }))
      return true
      
    case 'GET_PROCESSING_STATUS':
      sendResponse({
        isProcessing: batchProcessing,
        queueLength: processingQueue.length,
        currentBatch: currentBatch
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

// Start batch processing mode
async function startBatchProcessing(playlistIds, batchId) {
  console.log('Starting batch processing for playlists:', playlistIds)
  
  if (batchProcessing) {
    throw new Error('Batch processing already in progress')
  }
  
  batchProcessing = true
  currentBatch = {
    id: batchId,
    playlistIds: playlistIds,
    processed: 0,
    total: 0,
    startTime: Date.now()
  }
  
  try {
    // Find or create Spotify tab
    let spotifyTabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' })
    
    if (spotifyTabs.length === 0) {
      // Create new Spotify tab
      const newTab = await chrome.tabs.create({ url: 'https://open.spotify.com' })
      spotifyTabs = [newTab]
      
      // Wait for tab to load
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    const spotifyTabId = spotifyTabs[0].id
    
    // Start audio capture if not already active
    if (!capturedStreams.has(spotifyTabId)) {
      await startAudioCapture(spotifyTabId)
    }
    
    // Process each playlist
    for (const playlistId of playlistIds) {
      await processPlaylistBatch(spotifyTabId, playlistId)
    }
    
    console.log('Batch processing completed successfully')
    
  } catch (error) {
    console.error('Error in batch processing:', error)
    throw error
  } finally {
    batchProcessing = false
    currentBatch = null
  }
}

// Process a single playlist in batch mode
async function processPlaylistBatch(tabId, playlistId) {
  console.log('Processing playlist:', playlistId)
  
  try {
    // Navigate to playlist
    await chrome.tabs.update(tabId, {
      url: `https://open.spotify.com/playlist/${playlistId}`
    })
    
    // Wait for page load
    await waitForPageLoad(tabId, 5000)
    
    // Get playlist tracks via content script
    const tracks = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_PLAYLIST_TRACKS'
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(response?.tracks || [])
        }
      })
    })
    
    console.log(`Found ${tracks.length} tracks in playlist ${playlistId}`)
    currentBatch.total += tracks.length
    
    // Process each track
    for (const track of tracks) {
      if (!batchProcessing) break // Stop if cancelled
      
      await processTrackBatch(tabId, track)
      currentBatch.processed++
      
      // Notify DJ Studio of progress
      if (djStudioTab) {
        chrome.tabs.sendMessage(djStudioTab.id, {
          type: 'BATCH_PROGRESS',
          batchId: currentBatch.id,
          processed: currentBatch.processed,
          total: currentBatch.total
        })
      }
    }
    
  } catch (error) {
    console.error(`Error processing playlist ${playlistId}:`, error)
  }
}

// Process individual track in batch mode
async function processTrackBatch(tabId, track) {
  console.log('Processing track:', track.name, 'by', track.artist)
  
  try {
    // Play the track
    await chrome.tabs.sendMessage(tabId, {
      type: 'PLAY_TRACK',
      trackUri: track.uri
    })
    
    // Wait for playback to start
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Record audio for analysis (30 seconds for analysis, full track for waveform)
    const audioData = await recordTrackAudio(tabId, 30000)
    
    // Generate waveform data from audio
    const waveformData = await generateWaveformFromAudio(audioData)
    
    // Send to DJ Studio for processing
    if (djStudioTab && audioData) {
      chrome.tabs.sendMessage(djStudioTab.id, {
        type: 'PROCESS_TRACK_AUDIO',
        trackData: {
          spotifyId: track.id,
          name: track.name,
          artist: track.artist,
          uri: track.uri,
          duration: track.duration_ms
        },
        audioData: audioData,
        waveformData: waveformData
      })
    }
    
    // Small delay between tracks
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } catch (error) {
    console.error(`Error processing track ${track.name}:`, error)
  }
}

// Record audio from captured stream
async function recordTrackAudio(tabId, duration) {
  const stream = capturedStreams.get(tabId)
  if (!stream) return null
  
  return new Promise((resolve) => {
    const audioChunks = []
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      
      // Convert to ArrayBuffer
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result)
      }
      reader.readAsArrayBuffer(audioBlob)
    }
    
    mediaRecorder.start()
    setTimeout(() => {
      mediaRecorder.stop()
    }, duration)
  })
}

// Wait for page to load
function waitForPageLoad(tabId, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const checkStatus = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          resolve()
          return
        }
        
        if (tab.status === 'complete') {
          resolve()
        } else if (Date.now() - startTime > timeout) {
          resolve() // Timeout
        } else {
          setTimeout(checkStatus, 500)
        }
      })
    }
    
    checkStatus()
  })
}

// Generate waveform data from audio ArrayBuffer
async function generateWaveformFromAudio(audioArrayBuffer) {
  try {
    // Create an offline audio context
    const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * 30, 44100)
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer.slice(0))
    const channelData = audioBuffer.getChannelData(0)
    
    // Generate waveform peaks
    const targetWidth = 1000
    const samplesPerPixel = Math.floor(channelData.length / targetWidth)
    const peaks = [[], []]
    
    for (let i = 0; i < targetWidth; i++) {
      const start = i * samplesPerPixel
      const end = Math.min(start + samplesPerPixel, channelData.length)
      
      let positivePeak = 0
      let negativePeak = 0
      
      for (let j = start; j < end; j++) {
        const sample = channelData[j]
        if (sample > positivePeak) {
          positivePeak = sample
        }
        if (sample < negativePeak) {
          negativePeak = sample
        }
      }
      
      peaks[0].push(positivePeak)
      peaks[1].push(Math.abs(negativePeak))
    }
    
    // Normalize peaks
    const maxPeak = Math.max(...peaks[0], ...peaks[1])
    if (maxPeak > 0) {
      peaks[0] = peaks[0].map(p => p / maxPeak)
      peaks[1] = peaks[1].map(p => p / maxPeak)
    }
    
    return {
      peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      samplesPerPixel
    }
  } catch (error) {
    console.error('Error generating waveform:', error)
    return null
  }
}