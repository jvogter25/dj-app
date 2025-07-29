// Mix recording engine for capturing and exporting DJ mixes
// Records the master output and exports as WAV/MP3

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  peakLevel: number
}

export interface RecordingSettings {
  format: 'wav' | 'mp3'
  quality: number // 0-1 for MP3 bitrate
  normalizeAudio: boolean
}

export interface MixMetadata {
  title: string
  artist: string
  date: Date
  tracklist: Array<{
    time: number
    trackName: string
    artist: string
  }>
}

export class MixRecorder {
  private audioContext: AudioContext
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private sourceNode: MediaStreamAudioDestinationNode | null = null
  private analyser: AnalyserNode
  private startTime: number = 0
  private pausedDuration: number = 0
  private lastPauseTime: number = 0
  private isRecording: boolean = false
  private isPaused: boolean = false
  
  // For accurate time tracking
  private recordingStartTime: number = 0
  private animationFrameId: number | null = null
  
  // Callbacks
  private onStateChange?: (state: RecordingState) => void
  private onDataAvailable?: (blob: Blob) => void
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    
    // Create analyser for level monitoring
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
  }
  
  // Connect the master output to the recorder
  connectSource(masterOutput: AudioNode) {
    if (!this.sourceNode) {
      this.sourceNode = this.audioContext.createMediaStreamDestination()
      
      // Connect for recording
      masterOutput.connect(this.sourceNode)
      
      // Connect analyser for monitoring
      masterOutput.connect(this.analyser)
    }
  }
  
  // Start recording
  async startRecording(settings: RecordingSettings = { 
    format: 'wav', 
    quality: 0.8,
    normalizeAudio: true 
  }): Promise<void> {
    if (this.isRecording || !this.sourceNode) {
      throw new Error('Already recording or no source connected')
    }
    
    try {
      // Reset state
      this.recordedChunks = []
      this.startTime = this.audioContext.currentTime
      this.pausedDuration = 0
      this.lastPauseTime = 0
      this.recordingStartTime = Date.now()
      
      // Configure MediaRecorder
      const mimeType = this.getMimeType(settings.format)
      const options: MediaRecorderOptions = {
        mimeType,
        bitsPerSecond: settings.format === 'mp3' 
          ? Math.floor(settings.quality * 320000) // 32-320 kbps
          : undefined
      }
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.sourceNode.stream, options)
      
      // Handle data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType })
        if (this.onDataAvailable) {
          this.onDataAvailable(blob)
        }
      }
      
      // Start recording
      this.mediaRecorder.start(1000) // Capture in 1-second chunks
      this.isRecording = true
      this.isPaused = false
      
      // Start monitoring
      this.startMonitoring()
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }
  
  // Pause recording
  pauseRecording() {
    if (!this.isRecording || this.isPaused || !this.mediaRecorder) return
    
    this.mediaRecorder.pause()
    this.isPaused = true
    this.lastPauseTime = this.audioContext.currentTime
  }
  
  // Resume recording
  resumeRecording() {
    if (!this.isRecording || !this.isPaused || !this.mediaRecorder) return
    
    this.mediaRecorder.resume()
    this.isPaused = false
    
    // Track paused duration
    if (this.lastPauseTime > 0) {
      this.pausedDuration += this.audioContext.currentTime - this.lastPauseTime
    }
  }
  
  // Stop recording
  async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('Not recording')
    }
    
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return
      
      // Set up one-time handler for the blob
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder!.mimeType
        const blob = new Blob(this.recordedChunks, { type: mimeType })
        
        // Reset state
        this.isRecording = false
        this.isPaused = false
        this.stopMonitoring()
        
        resolve(blob)
      }
      
      // Stop recording
      this.mediaRecorder.stop()
    })
  }
  
  // Get appropriate MIME type
  private getMimeType(format: 'wav' | 'mp3'): string {
    // Check browser support for different formats
    const types = format === 'mp3' 
      ? ['audio/mpeg', 'audio/mp3', 'audio/webm']
      : ['audio/wav', 'audio/wave', 'audio/webm']
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    // Fallback to webm which is widely supported
    return 'audio/webm'
  }
  
  // Monitor levels and duration
  private startMonitoring() {
    const monitor = () => {
      if (!this.isRecording) return
      
      // Calculate duration
      const currentTime = this.audioContext.currentTime
      const duration = currentTime - this.startTime - this.pausedDuration
      
      // Get peak level
      const bufferLength = this.analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      this.analyser.getByteFrequencyData(dataArray)
      
      // Calculate peak
      let peak = 0
      for (let i = 0; i < bufferLength; i++) {
        peak = Math.max(peak, dataArray[i])
      }
      const peakLevel = peak / 255
      
      // Notify state change
      if (this.onStateChange) {
        this.onStateChange({
          isRecording: this.isRecording,
          isPaused: this.isPaused,
          duration,
          peakLevel
        })
      }
      
      // Continue monitoring
      this.animationFrameId = requestAnimationFrame(monitor)
    }
    
    monitor()
  }
  
  private stopMonitoring() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }
  
  // Export recording with metadata
  async exportRecording(
    blob: Blob, 
    metadata: MixMetadata,
    settings: RecordingSettings
  ): Promise<Blob> {
    // For now, just return the blob
    // In a full implementation, we would:
    // 1. Convert to desired format if needed
    // 2. Normalize audio if requested
    // 3. Add metadata tags
    // 4. Generate cue sheet for tracklist
    
    if (settings.normalizeAudio) {
      // Would normalize audio here
      console.log('Audio normalization requested but not implemented')
    }
    
    return blob
  }
  
  // Generate filename
  generateFilename(metadata: MixMetadata, format: string): string {
    const date = metadata.date.toISOString().split('T')[0]
    const title = metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const artist = metadata.artist.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    
    return `${artist}_${title}_${date}.${format}`
  }
  
  // Download the recording
  downloadRecording(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Set state change callback
  onStateChanged(callback: (state: RecordingState) => void) {
    this.onStateChange = callback
  }
  
  // Set data available callback
  onDataReady(callback: (blob: Blob) => void) {
    this.onDataAvailable = callback
  }
  
  // Get current recording state
  getState(): RecordingState {
    const currentTime = this.audioContext.currentTime
    const duration = this.isRecording 
      ? currentTime - this.startTime - this.pausedDuration 
      : 0
    
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      duration,
      peakLevel: 0
    }
  }
  
  // Check if format is supported
  static isFormatSupported(format: 'wav' | 'mp3'): boolean {
    const types = format === 'mp3' 
      ? ['audio/mpeg', 'audio/mp3']
      : ['audio/wav', 'audio/wave']
    
    return types.some(type => MediaRecorder.isTypeSupported(type))
  }
  
  // Disconnect and cleanup
  disconnect() {
    this.stopMonitoring()
    
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop()
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    
    this.analyser.disconnect()
  }
}