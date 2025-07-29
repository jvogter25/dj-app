import { useEffect, useState, useCallback, useRef } from 'react'
import { EnhancedAudioEngine, EnhancedPlayerState, AudioSource } from '../lib/enhancedAudioEngine'
import { useSpotifyPlayer } from './useSpotifyPlayer'
import { EffectsSettings } from '../lib/audioEffects'

interface UseEnhancedPlayerOptions {
  playerId: string
  onTrackEnd?: () => void
}

export const useEnhancedPlayer = ({ playerId, onTrackEnd }: UseEnhancedPlayerOptions) => {
  // Use the existing Spotify player
  const spotifyPlayer = useSpotifyPlayer(playerId)
  
  // Enhanced audio engine
  const [audioEngine, setAudioEngine] = useState<EnhancedAudioEngine | null>(null)
  const [enhancedState, setEnhancedState] = useState<EnhancedPlayerState | null>(null)
  const [isEnhancedMode, setIsEnhancedMode] = useState(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Initialize audio engine
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const engine = new EnhancedAudioEngine(audioContextRef.current)
      
      // Set up state change listener
      engine.onStateChanged((state) => {
        setEnhancedState(state)
      })
      
      // Set up track end listener
      if (onTrackEnd) {
        engine.onTrackEnded(onTrackEnd)
      }
      
      setAudioEngine(engine)
    }
    
    return () => {
      if (audioEngine) {
        audioEngine.disconnect()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Enable enhanced mode
  const enableEnhancedMode = useCallback(async () => {
    if (!audioEngine || !spotifyPlayer.playerState.currentTrack) return
    
    const track = spotifyPlayer.playerState.currentTrack
    
    // Try to get audio source
    let audioSource: AudioSource | null = null
    
    if (track.preview_url) {
      // Use Spotify preview URL (30 seconds)
      audioSource = {
        url: track.preview_url,
        type: 'spotify-preview',
        duration: 30
      }
    } else {
      console.warn('No audio source available for enhanced mode')
      return
    }
    
    try {
      // Pause Spotify player
      spotifyPlayer.pause()
      
      // Load audio into enhanced engine
      await audioEngine.loadAudio(audioSource)
      
      // Sync position if needed
      if (spotifyPlayer.playerState.position > 0) {
        audioEngine.seek(spotifyPlayer.playerState.position / 1000)
      }
      
      setIsEnhancedMode(true)
      console.log(`Enhanced mode enabled for ${playerId}`)
    } catch (error) {
      console.error('Failed to enable enhanced mode:', error)
    }
  }, [audioEngine, spotifyPlayer, playerId])
  
  // Disable enhanced mode
  const disableEnhancedMode = useCallback(() => {
    if (!audioEngine) return
    
    audioEngine.stop()
    setIsEnhancedMode(false)
    console.log(`Enhanced mode disabled for ${playerId}`)
  }, [audioEngine, playerId])
  
  // Unified play/pause
  const togglePlay = useCallback(() => {
    if (isEnhancedMode && audioEngine) {
      if (enhancedState?.isPlaying) {
        audioEngine.pause()
      } else {
        audioEngine.play()
      }
    } else {
      spotifyPlayer.togglePlay()
    }
  }, [isEnhancedMode, audioEngine, enhancedState, spotifyPlayer])
  
  // Unified pause
  const pause = useCallback(() => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.pause()
    } else {
      spotifyPlayer.pause()
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Unified resume
  const resume = useCallback(() => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.play()
    } else {
      spotifyPlayer.resume()
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Unified cue
  const cue = useCallback(() => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.cue()
    } else {
      spotifyPlayer.cue()
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Unified seek
  const seek = useCallback((position: number) => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.seek(position / 1000) // Convert to seconds
    } else {
      spotifyPlayer.seek(position)
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Unified volume
  const setVolume = useCallback((volume: number) => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.setVolume(volume / 100) // Convert to 0-1
    }
    // Always set Spotify volume too for consistency
    spotifyPlayer.setVolume(volume)
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Tempo control (enhanced mode only)
  const setTempoAdjustment = useCallback((tempoPercent: number) => {
    if (isEnhancedMode && audioEngine) {
      // Convert percentage to multiplier (-50% = 0.5x, +50% = 1.5x)
      const multiplier = 1 + (tempoPercent / 100)
      audioEngine.setTempo(multiplier)
    } else {
      // Just update visual tempo for Spotify mode
      spotifyPlayer.setTempoAdjustment(tempoPercent)
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // EQ controls
  const setEQ = useCallback((eq: { high: number; mid: number; low: number }) => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.getEffectsProcessor().setEQ(eq)
    } else {
      spotifyPlayer.setEQ(eq)
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Effects controls
  const setEffects = useCallback((effects: EffectsSettings) => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.getEffectsProcessor().setEffects(effects)
    } else {
      spotifyPlayer.setEffects(effects)
    }
  }, [isEnhancedMode, audioEngine, spotifyPlayer])
  
  // Loop controls (enhanced mode only)
  const setLoop = useCallback((start: number | null, end: number | null) => {
    if (isEnhancedMode && audioEngine) {
      audioEngine.setLoop(start, end)
    }
  }, [isEnhancedMode, audioEngine])
  
  // Get unified player state
  const getPlayerState = () => {
    if (isEnhancedMode && enhancedState) {
      return {
        isReady: true,
        isPlaying: enhancedState.isPlaying,
        currentTrack: spotifyPlayer.playerState.currentTrack,
        position: enhancedState.currentTime * 1000, // Convert to ms
        duration: enhancedState.duration * 1000,
        volume: enhancedState.volume
      }
    }
    return spotifyPlayer.playerState
  }
  
  // Get tempo value
  const getTempo = () => {
    if (isEnhancedMode && enhancedState) {
      // Convert multiplier back to percentage
      return (enhancedState.tempo - 1) * 100
    }
    return spotifyPlayer.tempo
  }
  
  return {
    // Spotify player passthrough
    player: spotifyPlayer.player,
    deviceId: spotifyPlayer.deviceId,
    
    // Unified state
    playerState: getPlayerState(),
    tempo: getTempo(),
    isEnhanced: isEnhancedMode,
    
    // Track loading
    loadTrack: spotifyPlayer.loadTrack,
    
    // Playback controls
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
    cue,
    
    // Enhanced controls
    setTempoAdjustment,
    enableEnhancedMode,
    disableEnhancedMode,
    
    // Effects
    setEQ,
    setEffects,
    
    // Loop controls
    setLoop,
    loops: spotifyPlayer.loops,
    captureLoop: spotifyPlayer.captureLoop,
    playLoop: spotifyPlayer.playLoop,
    stopLoop: spotifyPlayer.stopLoop,
    deleteLoop: spotifyPlayer.deleteLoop
  }
}