// Waveform generation utilities for audio visualization
// Creates visual waveforms from audio data for tracks

export interface WaveformData {
  peaks: number[][]  // [positive peaks, negative peaks]
  duration: number
  sampleRate: number
  samplesPerPixel: number
}

export class WaveformGenerator {
  private audioContext: AudioContext
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  
  // Generate waveform from audio buffer
  async generateFromBuffer(audioBuffer: AudioBuffer, targetWidth: number = 1000): Promise<WaveformData> {
    const channelData = audioBuffer.getChannelData(0) // Use first channel
    const duration = audioBuffer.duration
    const sampleRate = audioBuffer.sampleRate
    const totalSamples = channelData.length
    const samplesPerPixel = Math.floor(totalSamples / targetWidth)
    
    const peaks: number[][] = [[], []]
    
    for (let i = 0; i < targetWidth; i++) {
      const start = i * samplesPerPixel
      const end = Math.min(start + samplesPerPixel, totalSamples)
      
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
      duration,
      sampleRate,
      samplesPerPixel
    }
  }
  
  // Generate waveform from audio file
  async generateFromFile(file: File | Blob, targetWidth: number = 1000): Promise<WaveformData> {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    return this.generateFromBuffer(audioBuffer, targetWidth)
  }
  
  // Generate waveform from URL
  async generateFromUrl(url: string, targetWidth: number = 1000): Promise<WaveformData> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    return this.generateFromBuffer(audioBuffer, targetWidth)
  }
  
  // Generate multiple resolution waveforms for zooming
  async generateMultiResolution(
    audioBuffer: AudioBuffer, 
    resolutions: number[] = [100, 500, 1000, 2000]
  ): Promise<Map<number, WaveformData>> {
    const waveforms = new Map<number, WaveformData>()
    
    for (const resolution of resolutions) {
      const waveform = await this.generateFromBuffer(audioBuffer, resolution)
      waveforms.set(resolution, waveform)
    }
    
    return waveforms
  }
  
  // Analyze audio for additional features
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<{
    rms: number
    peak: number
    zeroCrossings: number
    spectralCentroid: number
  }> {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    
    let sumSquares = 0
    let peak = 0
    let zeroCrossings = 0
    let previousSample = 0
    
    // Time domain analysis
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i])
      sumSquares += sample * sample
      
      if (sample > peak) {
        peak = sample
      }
      
      // Count zero crossings
      if (i > 0 && previousSample * channelData[i] < 0) {
        zeroCrossings++
      }
      previousSample = channelData[i]
    }
    
    const rms = Math.sqrt(sumSquares / channelData.length)
    
    // Frequency domain analysis (simplified spectral centroid)
    const fftSize = 2048
    const analyser = this.audioContext.createAnalyser()
    analyser.fftSize = fftSize
    
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(analyser)
    
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencyData)
    
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i]
      const frequency = (i * sampleRate) / fftSize
      weightedSum += frequency * magnitude
      magnitudeSum += magnitude
    }
    
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
    
    return {
      rms,
      peak,
      zeroCrossings: zeroCrossings / channelData.length * sampleRate, // Zero crossings per second
      spectralCentroid
    }
  }
  
  // Generate colored waveform based on frequency content
  async generateColoredWaveform(
    audioBuffer: AudioBuffer, 
    targetWidth: number = 1000
  ): Promise<{
    peaks: number[][]
    colors: string[] // Color for each peak based on frequency content
  }> {
    const waveform = await this.generateFromBuffer(audioBuffer, targetWidth)
    const colors: string[] = []
    
    const channelData = audioBuffer.getChannelData(0)
    const samplesPerPixel = Math.floor(channelData.length / targetWidth)
    
    for (let i = 0; i < targetWidth; i++) {
      const start = i * samplesPerPixel
      const end = Math.min(start + samplesPerPixel, channelData.length)
      
      // Simple frequency analysis for color
      let lowFreq = 0
      let midFreq = 0
      let highFreq = 0
      
      for (let j = start; j < end - 2; j++) {
        const diff1 = Math.abs(channelData[j + 1] - channelData[j])
        const diff2 = Math.abs(channelData[j + 2] - channelData[j])
        
        if (diff1 < 0.1) lowFreq++
        else if (diff1 < 0.3) midFreq++
        else highFreq++
      }
      
      const total = lowFreq + midFreq + highFreq
      const lowRatio = lowFreq / total
      const midRatio = midFreq / total
      const highRatio = highFreq / total
      
      // Generate color based on frequency content
      const r = Math.floor(255 * highRatio)
      const g = Math.floor(255 * midRatio)
      const b = Math.floor(255 * lowRatio)
      
      colors.push(`rgb(${r}, ${g}, ${b})`)
    }
    
    return {
      peaks: waveform.peaks,
      colors
    }
  }
  
  // Cache waveform data
  async cacheWaveform(trackId: string, waveformData: WaveformData): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open('waveform-cache-v1')
      const response = new Response(JSON.stringify(waveformData))
      await cache.put(`/waveform/${trackId}`, response)
    }
  }
  
  // Retrieve cached waveform
  async getCachedWaveform(trackId: string): Promise<WaveformData | null> {
    if ('caches' in window) {
      const cache = await caches.open('waveform-cache-v1')
      const response = await cache.match(`/waveform/${trackId}`)
      if (response) {
        return await response.json()
      }
    }
    return null
  }
}

// Singleton instance
export const waveformGenerator = new WaveformGenerator()