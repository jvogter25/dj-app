import { useState, useRef, useCallback, useEffect } from 'react'

interface WebAudioPlayerState {
  isReady: boolean
  isPlaying: boolean
  currentTrack: any | null
  position: number
  duration: number
  volume: number
}

export const useWebAudioPlayer = (playerId: string) => {
  const [playerState, setPlayerState] = useState<WebAudioPlayerState>({
    isReady: true, // Web Audio API is always ready
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.75
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [tempo, setTempo] = useState(0) // Tempo adjustment percentage (-10 to +10)

  // Initialize Web Audio API
  useEffect(() => {
    const initAudio = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        audio.preload = 'auto'

        const source = audioContext.createMediaElementSource(audio)
        const gainNode = audioContext.createGain()
        
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        audioContextRef.current = audioContext
        audioRef.current = audio
        gainNodeRef.current = gainNode
        sourceNodeRef.current = source

        // Set initial volume
        gainNode.gain.value = playerState.volume

        // Audio event listeners
        audio.addEventListener('loadedmetadata', () => {
          setPlayerState(prev => ({
            ...prev,
            duration: audio.duration * 1000 // Convert to milliseconds
          }))
        })

        audio.addEventListener('play', () => {
          setPlayerState(prev => ({ ...prev, isPlaying: true }))
          startPositionUpdates()
        })

        audio.addEventListener('pause', () => {
          setPlayerState(prev => ({ ...prev, isPlaying: false }))
          stopPositionUpdates()
        })

        audio.addEventListener('ended', () => {
          setPlayerState(prev => ({ ...prev, isPlaying: false, position: 0 }))
          stopPositionUpdates()
        })

        console.log(`Web Audio Player "${playerId}" initialized`)

      } catch (error) {
        console.error('Failed to initialize Web Audio API:', error)
      }
    }

    initAudio()

    return () => {
      stopPositionUpdates()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [playerId])

  // Position update loop
  const startPositionUpdates = () => {
    const updatePosition = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setPlayerState(prev => ({
          ...prev,
          position: audioRef.current!.currentTime * 1000 // Convert to milliseconds
        }))
        animationFrameRef.current = requestAnimationFrame(updatePosition)
      }
    }
    updatePosition()
  }

  const stopPositionUpdates = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  // Load and play a track
  const loadTrack = useCallback(async (track: any) => {
    if (!audioRef.current) return

    try {
      // Stop current playback
      audioRef.current.pause()
      audioRef.current.currentTime = 0

      // For now, use Spotify preview URLs (30-second clips)
      // TODO: Implement full track playback through other means
      const audioUrl = track.preview_url
      
      if (!audioUrl) {
        console.warn('No preview URL available for track:', track.name)
        alert(`No preview available for "${track.name}". This is a Spotify limitation - only some tracks have preview URLs.`)
        return
      }

      audioRef.current.src = audioUrl
      
      setPlayerState(prev => ({
        ...prev,
        currentTrack: track,
        position: 0
      }))

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      console.log(`Loaded track: ${track.name} on ${playerId}`)
    } catch (error) {
      console.error('Error loading track:', error)
    }
  }, [playerId])

  // Playback controls
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return

    try {
      if (audioRef.current.paused) {
        // Resume audio context if suspended
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        await audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    } catch (error) {
      console.error('Error toggling playback:', error)
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const resume = useCallback(async () => {
    if (audioRef.current) {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        await audioRef.current.play()
      } catch (error) {
        console.error('Error resuming playback:', error)
      }
    }
  }, [])

  const seek = useCallback((positionMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = positionMs / 1000
      setPlayerState(prev => ({
        ...prev,
        position: positionMs
      }))
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (gainNodeRef.current) {
      // Volume should be between 0 and 1
      const normalizedVolume = Math.max(0, Math.min(1, volume / 100))
      gainNodeRef.current.gain.value = normalizedVolume
      setPlayerState(prev => ({ ...prev, volume: normalizedVolume }))
    }
  }, [])

  const cue = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlayerState(prev => ({ ...prev, position: 0, isPlaying: false }))
    }
  }, [])

  // Tempo control (changes playback rate)
  const setTempoAdjustment = useCallback((tempoPercent: number) => {
    if (audioRef.current) {
      // Convert percentage to playback rate (0 = 1.0x, +10 = 1.1x, -10 = 0.9x)
      const playbackRate = 1 + (tempoPercent / 100)
      audioRef.current.playbackRate = Math.max(0.25, Math.min(4.0, playbackRate))
      setTempo(tempoPercent)
    }
  }, [])

  return {
    playerState,
    tempo,
    loadTrack,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
    cue,
    setTempoAdjustment,
    audioElement: audioRef.current,
    audioContext: audioContextRef.current,
    gainNode: gainNodeRef.current
  }
}