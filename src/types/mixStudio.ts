export interface AudioSource {
  id: string
  type: 'local' | 'soundcloud' | 'spotify' | 'apple' | 'youtube'
  name: string
  artist: string
  duration: number
  bpm?: number
  key?: string
  audioUrl?: string // For local/soundcloud
  previewUrl?: string // For spotify/apple
  metadata?: any
  isEditable: boolean
}

export interface AudioClip {
  id: string
  sourceId: string
  source: AudioSource
  startTime: number // Position on timeline (seconds)
  duration: number // Clip duration (seconds)
  trimStart: number // Trim from source start (seconds)
  trimEnd: number // Trim from source end (seconds)
  fadeIn: number // Fade in duration (seconds)
  fadeOut: number // Fade out duration (seconds)
  volume: number // 0-1
  effects: ClipEffect[]
}

export interface ClipEffect {
  id: string
  type: 'eq' | 'filter' | 'reverb' | 'delay' | 'compression'
  params: any
  enabled: boolean
}

export interface Track {
  id: string
  name: string
  clips: AudioClip[]
  volume: number // 0-1
  pan: number // -1 to 1
  isMuted: boolean
  isSolo: boolean
  effects: TrackEffect[]
}

export interface TrackEffect {
  id: string
  type: string
  params: any
  enabled: boolean
}

export interface MixProject {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  bpm: number
  duration: number // Total duration in seconds
  tracks: Track[]
  masterVolume: number
  exportSettings?: ExportSettings
}

export interface ExportSettings {
  format: 'mp3' | 'wav'
  quality: number // Bitrate for mp3, sample rate for wav
  normalize: boolean
  includeMetadata: boolean
}

export interface TimelineSelection {
  startTime: number
  endTime: number
  trackIds: string[]
}

export interface AutomationPoint {
  time: number
  value: number
  curve: 'linear' | 'exponential' | 'logarithmic'
}

export interface AutomationLane {
  parameter: string
  points: AutomationPoint[]
  enabled: boolean
}