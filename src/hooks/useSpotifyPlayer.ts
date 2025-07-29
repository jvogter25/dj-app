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
  
  const playerRef = useRef<any | null>(null)

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

  return {
    player,
    deviceId,
    playerState,
    loadTrack,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
    cue
  }
}