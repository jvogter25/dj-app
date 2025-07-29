import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface SpotifyPlayerState {
  isReady: boolean
  isPlaying: boolean
  currentTrack: any | null
  position: number
  duration: number
  volume: number
}

export const useEnhancedSpotifyPlayer = (playerId: string) => {
  const { spotifyToken } = useAuth()
  const [player, setPlayer] = useState<any | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [playerState, setPlayerState] = useState<SpotifyPlayerState>({
    isReady: false,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.75
  })
  const [tempo, setTempo] = useState(0) // Tempo adjustment percentage (-10 to +10)
  
  const playerRef = useRef<any | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const pitchShiftRef = useRef<any | null>(null)

  // Enhanced Web Audio processing for Spotify streams
  const initWebAudioProcessing = useCallback(async () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create a hidden audio element to capture Spotify stream
      const audioElement = document.createElement('audio')
      audioElement.crossOrigin = 'anonymous'
      audioElement.style.display = 'none'
      document.body.appendChild(audioElement)
      audioElementRef.current = audioElement

      // Create Web Audio nodes
      const source = audioContext.createMediaElementSource(audioElement)
      const gainNode = audioContext.createGain()
      
      sourceNodeRef.current = source
      gainNodeRef.current = gainNode

      // For pitch shifting, we'll use a simple approach with playback rate
      // More advanced pitch shifting would require additional libraries
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)

      console.log(`Enhanced Web Audio processing initialized for ${playerId}`)
    } catch (error) {
      console.error('Failed to initialize Web Audio processing:', error)
    }
  }, [playerId])

  // Initialize Spotify player with Web Audio enhancement
  useEffect(() => {
    if (!spotifyToken || !window.Spotify) return

    const initPlayer = async () => {
      // Initialize Web Audio processing first
      await initWebAudioProcessing()

      const newPlayer = new (window as any).Spotify.Player({
        name: `DJ Studio - ${playerId}`,
        getOAuthToken: (cb: (token: string) => void) => { cb(spotifyToken) },
        volume: 0.75
      })

      // Error handling
      newPlayer.addListener('initialization_error', ({ message }: any) => {
        console.error('Failed to initialize', message)
      })

      newPlayer.addListener('authentication_error', ({ message }: any) => {
        console.error('Failed to authenticate', message)
      })

      newPlayer.addListener('account_error', ({ message }: any) => {
        console.error('Failed to validate account', message)
      })

      newPlayer.addListener('playback_error', ({ message }: any) => {
        console.error('Failed to perform playback', message)
      })

      // Ready
      newPlayer.addListener('ready', ({ device_id }: any) => {
        console.log(`Enhanced Player ${playerId} ready with Device ID`, device_id)
        setDeviceId(device_id)
        setPlayerState(prev => ({ ...prev, isReady: true }))
      })

      // Not Ready
      newPlayer.addListener('not_ready', ({ device_id }: any) => {
        console.log('Device ID has gone offline', device_id)
        setPlayerState(prev => ({ ...prev, isReady: false }))
      })

      // Player state changed
      newPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return

        setPlayerState(prev => ({
          ...prev,
          isPlaying: !state.paused,
          currentTrack: state.track_window.current_track,
          position: state.position,
          duration: state.duration
        }))
      })

      // Connect to the player
      newPlayer.connect()
      
      setPlayer(newPlayer)
      playerRef.current = newPlayer
    }

    // Wait for SDK to be ready
    if ((window as any).Spotify?.Player) {
      initPlayer()
    } else {
      (window as any).onSpotifyWebPlaybackSDKReady = initPlayer
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
      if (audioElementRef.current) {
        document.body.removeChild(audioElementRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [spotifyToken, playerId, initWebAudioProcessing])

  // Load and play a track
  const loadTrack = useCallback(async (trackUri: string) => {
    if (!deviceId || !spotifyToken) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [trackUri],
          position_ms: 0
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
    } catch (error) {
      console.error('Error loading track:', error)
    }
  }, [deviceId, spotifyToken])

  // Playback controls
  const togglePlay = useCallback(async () => {
    if (!player) return
    
    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    
    player.togglePlay()
  }, [player])

  const pause = useCallback(() => {
    if (!player) return
    player.pause()
  }, [player])

  const resume = useCallback(async () => {
    if (!player) return
    
    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    
    player.resume()
  }, [player])

  const seek = useCallback((position: number) => {
    if (!player) return
    player.seek(position)
  }, [player])

  const setVolume = useCallback((volume: number) => {
    if (!player) return
    player.setVolume(volume / 100)
    setPlayerState(prev => ({ ...prev, volume: volume / 100 }))
    
    // Also update Web Audio gain
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
  }, [player])

  const cue = useCallback(() => {
    if (!player) return
    player.seek(0)
    player.pause()
  }, [player])

  // Enhanced tempo control using Web Audio API
  const setTempoAdjustment = useCallback((tempoPercent: number) => {
    setTempo(tempoPercent)
    
    if (audioElementRef.current) {
      // Use playback rate for tempo adjustment
      // This affects both tempo and pitch (like a vinyl record)
      const playbackRate = 1 + (tempoPercent / 100)
      audioElementRef.current.playbackRate = Math.max(0.25, Math.min(4.0, playbackRate))
      
      console.log(`Tempo adjusted to ${tempoPercent}% (${playbackRate}x speed) on ${playerId}`)
    }
  }, [playerId])

  // Advanced pitch shifting (requires additional processing)
  const setPitchShift = useCallback((cents: number) => {
    // This is a placeholder for advanced pitch shifting
    // Would require additional libraries like Tone.js or custom Web Audio processing
    console.log(`Pitch shift ${cents} cents requested for ${playerId} (not yet implemented)`)
  }, [playerId])

  return {
    player,
    deviceId,
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
    setPitchShift,
    audioContext: audioContextRef.current,
    gainNode: gainNodeRef.current
  }
}