// Extension Bridge - Handles communication with DJ Studio Chrome Extension
// This receives audio streams from Spotify tabs and processes them

// Chrome extension API types
declare global {
  interface Window {
    chrome?: any
  }
}

interface ExtensionMessage {
  type: string
  tabId?: number
  offer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidate
  trackInfo?: any
}

export class ExtensionBridge {
  private extensionId: string = 'YOUR_EXTENSION_ID_HERE' // Will be set after extension is loaded
  private connections: Map<number, RTCPeerConnection> = new Map()
  private audioStreams: Map<number, MediaStream> = new Map()
  private audioContext: AudioContext
  private onStreamCallback: ((stream: MediaStream, tabId: number) => void) | null = null
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.setupMessageListener()
  }
  
  // Set up listener for messages from extension
  private setupMessageListener() {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      // Verify origin
      if (event.origin !== window.location.origin) return
      
      const message = event.data
      if (message.source !== 'dj-studio-extension') return
      
      this.handleExtensionMessage(message)
    })
  }
  
  // Handle messages from extension
  private async handleExtensionMessage(message: ExtensionMessage) {
    console.log('Extension message received:', message.type)
    
    switch (message.type) {
      case 'AUDIO_STREAM_OFFER':
        await this.handleStreamOffer(message.tabId!, message.offer!)
        break
        
      case 'ICE_CANDIDATE':
        await this.handleIceCandidate(message.tabId!, message.candidate!)
        break
        
      case 'TRACK_CHANGED':
        this.handleTrackChange(message.trackInfo)
        break
    }
  }
  
  // Handle WebRTC offer from extension
  private async handleStreamOffer(tabId: number, offer: RTCSessionDescriptionInit) {
    console.log('Handling stream offer for tab:', tabId)
    
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    // Store connection
    this.connections.set(tabId, pc)
    
    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('Received audio track from tab:', tabId)
      const stream = event.streams[0]
      this.audioStreams.set(tabId, stream)
      
      // Notify callback
      if (this.onStreamCallback) {
        this.onStreamCallback(stream, tabId)
      }
    }
    
    // Set remote description and create answer
    await pc.setRemoteDescription(offer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    // Send answer back to extension
    this.sendToExtension({
      type: 'WEBRTC_ANSWER',
      tabId: tabId,
      answer: answer
    })
  }
  
  // Handle ICE candidate
  private async handleIceCandidate(tabId: number, candidate: RTCIceCandidate) {
    const pc = this.connections.get(tabId)
    if (pc) {
      await pc.addIceCandidate(candidate)
    }
  }
  
  // Handle track change notification
  private handleTrackChange(trackInfo: any) {
    console.log('Track changed:', trackInfo)
    // Could update UI with current track info
  }
  
  // Send message to extension
  private sendToExtension(message: any) {
    if (!this.extensionId) {
      console.warn('Extension ID not set')
      return
    }
    
    // Send via Chrome runtime messaging
    if (window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(this.extensionId, message)
    }
  }
  
  // Public API
  
  // Set callback for when audio stream is received
  onAudioStream(callback: (stream: MediaStream, tabId: number) => void) {
    this.onStreamCallback = callback
  }
  
  // Get list of Spotify tabs from extension
  async getSpotifyTabs(): Promise<any[]> {
    return new Promise((resolve) => {
      this.sendToExtension({ type: 'GET_SPOTIFY_TABS' })
      
      // Set up one-time listener for response
      const listener = (request: any, sender: any, sendResponse: any) => {
        if (request.tabs) {
          window.chrome.runtime.onMessage.removeListener(listener)
          resolve(request.tabs)
        }
      }
      
      if (window.chrome?.runtime?.onMessage) {
        window.chrome.runtime.onMessage.addListener(listener)
      } else {
        resolve([])
      }
    })
  }
  
  // Process audio stream for analysis
  processAudioStream(stream: MediaStream): {
    analyser: AnalyserNode,
    source: MediaStreamAudioSourceNode
  } {
    const source = this.audioContext.createMediaStreamSource(stream)
    const analyser = this.audioContext.createAnalyser()
    
    analyser.fftSize = 2048
    source.connect(analyser)
    
    return { analyser, source }
  }
  
  // Get audio stream for a tab
  getAudioStream(tabId: number): MediaStream | null {
    return this.audioStreams.get(tabId) || null
  }
  
  // Check if extension is installed
  async isExtensionInstalled(): Promise<boolean> {
    try {
      // Try to ping the extension
      return new Promise((resolve) => {
        if (!window.chrome?.runtime?.sendMessage) {
          resolve(false)
          return
        }
        
        window.chrome.runtime.sendMessage(this.extensionId, { type: 'PING' }, (response: any) => {
          resolve(!!response)
        })
        
        // Timeout after 1 second
        setTimeout(() => resolve(false), 1000)
      })
    } catch {
      return false
    }
  }
  
  // Set extension ID (call this after extension is installed)
  setExtensionId(id: string) {
    this.extensionId = id
  }
}

// Singleton instance
export const extensionBridge = new ExtensionBridge()