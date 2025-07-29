import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AudioEffectsProcessor } from '../lib/audioEffects'
import { getLoopCaptureEngine, LoopCaptureEngine, Loop } from '../lib/loopCapture'

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
  const effectsProcessorRef = useRef<AudioEffectsProcessor | null>(null)
  const loopCaptureEngineRef = useRef<LoopCaptureEngine | null>(null)
  const [isEnhanced, setIsEnhanced] = useState(false)
  const [loops, setLoops] = useState<Loop[]>([])

  // Initialize player
  useEffect(() => {
    console.log(`[${playerId}] Initializing player...`, { hasToken: !!spotifyToken, hasSpotifySdk: !!window.Spotify })
    if (!spotifyToken || !window.Spotify) {
      console.warn(`[${playerId}] Missing requirements:`, { token: !!spotifyToken, sdk: !!window.Spotify })
      return
    }

    const initPlayer = () => {
      console.log(`[${playerId}] Creating new Spotify player...`)
      const newPlayer = new (window as any).Spotify.Player({
        name: `DJ Studio - ${playerId}`,
        getOAuthToken: (cb: (token: string) => void) => { 
          console.log(`[${playerId}] Token requested`)
          cb(spotifyToken) 
        },
        volume: 0.75
      })

      // Error handling
      newPlayer.addListener('initialization_error', ({ message }: any) => {
        console.error(`[${playerId}] Initialization error:`, message)
        setPlayerState(prev => ({ ...prev, isReady: false }))
      })

      newPlayer.addListener('authentication_error', ({ message }: any) => {
        console.error(`[${playerId}] Authentication error:`, message)
        setPlayerState(prev => ({ ...prev, isReady: false }))
      })

      newPlayer.addListener('account_error', ({ message }: any) => {
        console.error(`[${playerId}] Account error:`, message)
        setPlayerState(prev => ({ ...prev, isReady: false }))
      })

      newPlayer.addListener('playback_error', ({ message }: any) => {
        console.error(`[${playerId}] Playback error:`, message)
      })

      // Ready
      newPlayer.addListener('ready', ({ device_id }: any) => {
        console.log(`[${playerId}] ✅ Player ready! Device ID:`, device_id)
        setDeviceId(device_id)
        setPlayerState(prev => ({ ...prev, isReady: true }))
      })

      // Not Ready
      newPlayer.addListener('not_ready', ({ device_id }: any) => {
        console.warn(`[${playerId}] ⚠️ Device went offline:`, device_id)
        setPlayerState(prev => ({ ...prev, isReady: false }))
      })

      // Player state changed
      newPlayer.addListener('player_state_changed', (state: any) => {
        console.log(`[${playerId}] State changed:`, state)
        if (!state) {
          console.warn(`[${playerId}] State is null - player might be inactive`)
          return
        }

        setPlayerState(prev => ({
          ...prev,
          isPlaying: !state.paused,
          currentTrack: state.track_window.current_track,
          position: state.position,
          duration: state.duration
        }))
      })

      // Connect to the player!
      console.log(`[${playerId}] Connecting player...`)
      newPlayer.connect().then((success: boolean) => {
        console.log(`[${playerId}] Connect result:`, success)
        if (!success) {
          console.error(`[${playerId}] Failed to connect player`)
        }
      })
      
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
    console.log(`[${playerId}] loadTrack called with:`, trackUri)
    
    if (!deviceId || !spotifyToken) {
      console.error(`[${playerId}] Cannot load track - missing requirements:`, { 
        deviceId, 
        hasToken: !!spotifyToken,
        playerReady: playerState.isReady 
      })
      return false
    }

    try {
      console.log(`[${playerId}] Step 1: Transferring playback to device ${deviceId}...`)
      
      // First, transfer playback to this device
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spotifyToken}`
        }
      })

      console.log(`[${playerId}] Transfer response:`, transferResponse.status)
      
      if (!transferResponse.ok && transferResponse.status !== 204) {
        const errorText = await transferResponse.text()
        console.error(`[${playerId}] Transfer failed:`, errorText)
        
        // If 404, no active device - this is expected
        if (transferResponse.status === 404) {
          console.log(`[${playerId}] No active device found, this is normal`)
        }
      }

      // Wait a bit for transfer to complete
      console.log(`[${playerId}] Waiting for transfer to complete...`)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Now play the track
      console.log(`[${playerId}] Step 2: Playing track...`)
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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

      console.log(`[${playerId}] Play response:`, playResponse.status)

      if (!playResponse.ok && playResponse.status !== 204) {
        const errorText = await playResponse.text()
        console.error(`[${playerId}] Play failed:`, errorText)
        
        // Common error: Device not found
        if (errorText.includes('Device not found')) {
          console.error(`[${playerId}] Device ${deviceId} not found. Player might need reconnection.`)
          setPlayerState(prev => ({ ...prev, isReady: false }))
        }
        
        return false
      } else {
        console.log(`[${playerId}] ✅ Track loaded successfully!`)
        return true
      }
    } catch (error) {
      console.error(`[${playerId}] Exception during track load:`, error)
      return false
    }
  }, [deviceId, spotifyToken, playerId, playerState.isReady])

  // Playback controls
  const togglePlay = useCallback(() => {
    console.log(`[${playerId}] togglePlay called, player exists:`, !!player)
    if (!player) {
      console.warn(`[${playerId}] No player instance`)
      return
    }
    player.togglePlay().catch((e: any) => console.error(`[${playerId}] togglePlay error:`, e))
  }, [player, playerId])

  const pause = useCallback(() => {
    console.log(`[${playerId}] pause called`)
    if (!player) return
    player.pause().catch((e: any) => console.error(`[${playerId}] pause error:`, e))
  }, [player, playerId])

  const resume = useCallback(() => {
    console.log(`[${playerId}] resume called`)
    if (!player) return
    player.resume().catch((e: any) => console.error(`[${playerId}] resume error:`, e))
  }, [player, playerId])

  const seek = useCallback((position: number) => {
    console.log(`[${playerId}] seek called to position:`, position)
    if (!player) return
    player.seek(position).catch((e: any) => console.error(`[${playerId}] seek error:`, e))
  }, [player, playerId])

  const setVolume = useCallback((volume: number) => {
    console.log(`[${playerId}] setVolume called:`, volume)
    if (!player) return
    const normalizedVolume = volume / 100
    player.setVolume(normalizedVolume).catch((e: any) => console.error(`[${playerId}] setVolume error:`, e))
    setPlayerState(prev => ({ ...prev, volume: normalizedVolume }))
  }, [player, playerId])

  const cue = useCallback(() => {
    console.log(`[${playerId}] cue called`)
    if (!player) return
    player.seek(0).then(() => player.pause())
      .catch((e: any) => console.error(`[${playerId}] cue error:`, e))
  }, [player, playerId])

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
      const effectsProcessor = new AudioEffectsProcessor(audioContext)
      
      sourceNodeRef.current = source
      gainNodeRef.current = gainNode
      effectsProcessorRef.current = effectsProcessor

      // Connect the audio graph: source -> effects -> gain -> destination
      effectsProcessor.connectSource(source)
      effectsProcessor.connectToOutput(gainNode)
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

  // Tempo control (visual only for now - Spotify doesn't support playback rate)
  const setTempoAdjustment = useCallback((tempoPercent: number) => {
    console.log(`[${playerId}] Tempo adjustment set to:`, tempoPercent)
    setTempo(tempoPercent)
    
    // Note: Spotify Web Playback SDK doesn't support tempo adjustment
    // This is just for visual feedback and future implementation
    // Would need to use Web Audio API with local files or preview URLs
  }, [playerId])

  // EQ Controls
  const setEQ = useCallback((eq: { high: number; mid: number; low: number }) => {
    if (!effectsProcessorRef.current) {
      console.warn(`[${playerId}] No effects processor available`)
      return
    }
    effectsProcessorRef.current.setEQ(eq)
  }, [playerId])

  const setLowEQ = useCallback((gain: number) => {
    if (!effectsProcessorRef.current) return
    effectsProcessorRef.current.setLowEQ(gain)
  }, [])

  const setMidEQ = useCallback((gain: number) => {
    if (!effectsProcessorRef.current) return
    effectsProcessorRef.current.setMidEQ(gain)
  }, [])

  const setHighEQ = useCallback((gain: number) => {
    if (!effectsProcessorRef.current) return
    effectsProcessorRef.current.setHighEQ(gain)
  }, [])

  // Filter Controls
  const setFilters = useCallback((filters: any) => {
    if (!effectsProcessorRef.current) return
    effectsProcessorRef.current.setFilters(filters)
  }, [])
  
  // Loop Capture Functions
  const captureLoop = useCallback(async (startTime: number, endTime: number, trailOff: number) => {
    if (!audioContextRef.current) {
      console.warn(`[${playerId}] No audio context for loop capture`)
      return null
    }
    
    // Initialize loop capture engine if needed
    if (!loopCaptureEngineRef.current) {
      loopCaptureEngineRef.current = getLoopCaptureEngine(audioContextRef.current)
    }
    
    // For now, we'll capture from the preview URL if available
    // In a real implementation, we'd capture from the actual playing audio
    if (audioElementRef.current && playerState.currentTrack?.preview_url) {
      try {
        // Fetch and decode the audio
        const response = await fetch(playerState.currentTrack.preview_url)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
        
        // Capture the loop
        const loop = await loopCaptureEngineRef.current.captureLoop(
          audioBuffer,
          startTime,
          endTime,
          playerId === 'Deck A' ? 'A' : 'B'
        )
        
        // Apply trail-off if specified
        if (trailOff > 0) {
          loopCaptureEngineRef.current.applyTrailOff(loop.id, trailOff)
        }
        
        // Update loops state
        setLoops(prev => [...prev, loop])
        
        console.log(`[${playerId}] Loop captured:`, loop)
        return loop
      } catch (error) {
        console.error(`[${playerId}] Error capturing loop:`, error)
        return null
      }
    }
    
    console.warn(`[${playerId}] No audio available for loop capture`)
    return null
  }, [playerId, playerState.currentTrack])
  
  const playLoop = useCallback((loopId: string, loop: boolean = true) => {
    if (!audioContextRef.current || !loopCaptureEngineRef.current || !gainNodeRef.current) {
      console.warn(`[${playerId}] Cannot play loop - missing audio components`)
      return
    }
    
    loopCaptureEngineRef.current.playLoop(loopId, gainNodeRef.current, loop)
    console.log(`[${playerId}] Playing loop:`, loopId)
  }, [playerId])
  
  const stopLoop = useCallback((loopId: string) => {
    if (!loopCaptureEngineRef.current) return
    
    loopCaptureEngineRef.current.stopLoop(loopId)
    console.log(`[${playerId}] Stopped loop:`, loopId)
  }, [playerId])
  
  const deleteLoop = useCallback((loopId: string) => {
    if (!loopCaptureEngineRef.current) return
    
    loopCaptureEngineRef.current.deleteLoop(loopId)
    setLoops(prev => prev.filter(l => l.id !== loopId))
    console.log(`[${playerId}] Deleted loop:`, loopId)
  }, [playerId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (effectsProcessorRef.current) {
        effectsProcessorRef.current.disconnect()
      }
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
    disableEnhancedMode,
    // EQ controls
    setEQ,
    setLowEQ,
    setMidEQ,
    setHighEQ,
    setFilters,
    // Loop controls
    loops,
    captureLoop,
    playLoop,
    stopLoop,
    deleteLoop
  }
}