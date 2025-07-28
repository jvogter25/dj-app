declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: typeof Spotify
  }
}

declare namespace Spotify {
  interface Player {
    addListener: (
      event: string,
      callback: (state: any) => void
    ) => void
    connect: () => Promise<boolean>
    disconnect: () => void
    getCurrentState: () => Promise<PlaybackState | null>
    getVolume: () => Promise<number>
    nextTrack: () => Promise<void>
    pause: () => Promise<void>
    previousTrack: () => Promise<void>
    resume: () => Promise<void>
    seek: (positionMs: number) => Promise<void>
    setName: (name: string) => Promise<void>
    setVolume: (volume: number) => Promise<void>
    togglePlay: () => Promise<void>
  }

  interface PlaybackState {
    context: {
      uri: string
      metadata: any
    }
    disallows: {
      [key: string]: boolean
    }
    paused: boolean
    position: number
    duration: number
    track_window: {
      current_track: Track
      next_tracks: Track[]
      previous_tracks: Track[]
    }
  }

  interface Track {
    uri: string
    id: string
    type: string
    media_type: string
    name: string
    is_playable: boolean
    album: {
      uri: string
      name: string
      images: Image[]
    }
    artists: Artist[]
  }

  interface Artist {
    uri: string
    name: string
  }

  interface Image {
    url: string
    height: number
    width: number
  }

  interface PlayerInit {
    name: string
    getOAuthToken: (callback: (token: string) => void) => void
    volume?: number
  }

  const Player: new (options: PlayerInit) => Player
}

export {}