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

export const useSpotifyPlayer = (playerId: string) => {
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
  const [tempo, setTempo] = useState(0) // Tempo adjustment percentage (-50 to +100)
  
  const playerRef = useRef<any | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const [isEnhanced, setIsEnhanced] = useState(false)

  // Initialize player
  useEffect(() => {
    if (!spotifyToken || !window.Spotify) return

    const initPlayer = () => {
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
        console.log(`Player ${playerId} ready with Device ID`, device_id)
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

      // Connect to the player!
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
    }
  }, [spotifyToken, playerId])

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
  const togglePlay = useCallback(() => {
    if (!player) return
    player.togglePlay()
  }, [player])

  const pause = useCallback(() => {
    if (!player) return
    player.pause()
  }, [player])

  const resume = useCallback(() => {
    if (!player) return
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
  }, [player])

  const cue = useCallback(() => {
    if (!player) return
    player.seek(0)
    player.pause()
  }, [player])

  // Enhanced tempo control with Web Audio API
  const initAudioProcessing = useCallback(async () => {
    try {
      // Get the current track info for fetching preview URL
      if (!playerState.currentTrack) return

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      // Create audio element for the track
      const audioElement = document.createElement('audio')
      audioElement.crossOrigin = 'anonymous'
      audioElement.preload = 'auto'
      
      // Use Spotify preview URL for tempo-adjustable playback
      if (playerState.currentTrack.preview_url) {
        audioElement.src = playerState.currentTrack.preview_url
      } else {
        console.warn('No preview URL available for tempo adjustment')
        return
      }

      audioElementRef.current = audioElement
      
      // Create Web Audio nodes
      const source = audioContext.createMediaElementSource(audioElement)
      const gainNode = audioContext.createGain()
      
      sourceNodeRef.current = source
      gainNodeRef.current = gainNode

      // Connect the audio graph
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Set initial volume
      gainNode.gain.value = playerState.volume

      // Sync with current playback position
      if (playerState.position > 0) {
        audioElement.currentTime = playerState.position / 1000
      }

      setIsEnhanced(true)
      console.log(`Enhanced audio processing enabled for ${playerId}`)
      
    } catch (error) {
      console.error('Failed to initialize enhanced audio processing:', error)
    }
  }, [playerState.currentTrack, playerState.volume, playerState.position, playerId])

  // Switch between Spotify SDK and enhanced playback
  const enableEnhancedMode = useCallback(async () => {
    if (!playerState.currentTrack) return
    
    // Pause Spotify playback
    if (player) {
      player.pause()
    }
    
    // Initialize enhanced audio processing
    await initAudioProcessing()
  }, [player, playerState.currentTrack, initAudioProcessing])

  const disableEnhancedMode = useCallback(() => {
    // Stop enhanced audio
    if (audioElementRef.current) {
      audioElementRef.current.pause()
    }
    
    // Clean up Web Audio
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    
    setIsEnhanced(false)
    console.log(`Enhanced mode disabled for ${playerId}`)
  }, [playerId])

  // Enhanced tempo control
  const setTempoAdjustment = useCallback(async (tempoPercent: number) => {
    setTempo(tempoPercent)
    
    if (tempoPercent === 0) {
      // Return to normal Spotify playback
      if (isEnhanced) {
        disableEnhancedMode()
        // Resume Spotify playback
        if (player) {
          player.resume()
        }
      }
    } else {
      // Enable enhanced mode for tempo adjustment
      if (!isEnhanced) {
        await enableEnhancedMode()
      }
      
      // Apply tempo adjustment
      if (audioElementRef.current) {
        const playbackRate = 1 + (tempoPercent / 100)
        audioElementRef.current.playbackRate = Math.max(0.25, Math.min(4.0, playbackRate))
        console.log(`Tempo adjusted to ${tempoPercent}% (${playbackRate}x) on ${playerId}`)
      }
    }
  }, [isEnhanced, enableEnhancedMode, disableEnhancedMode, player, playerId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current && audioElementRef.current.parentNode) {
        audioElementRef.current.parentNode.removeChild(audioElementRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    player,
    deviceId,
    playerState,
    tempo,
    isEnhanced,
    loadTrack,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
    cue,
    setTempoAdjustment,
    enableEnhancedMode,
    disableEnhancedMode
  }
}