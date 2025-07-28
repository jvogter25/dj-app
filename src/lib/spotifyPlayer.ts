/// <reference path="../types/spotify.d.ts" />

export interface SpotifyPlayer {
  device_id: string
  player: Spotify.Player
}

export class SpotifyPlayerManager {
  private playerA: Spotify.Player | null = null
  private playerB: Spotify.Player | null = null
  private deviceIdA: string | null = null
  private deviceIdB: string | null = null
  private token: string
  private audioContext: AudioContext
  
  constructor(token: string) {
    this.token = token
    this.audioContext = new AudioContext()
  }

  async initializePlayers(): Promise<void> {
    return new Promise((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        // Initialize Player A
        this.playerA = new window.Spotify.Player({
          name: 'DJ Studio - Deck A',
          getOAuthToken: (cb: (token: string) => void) => { cb(this.token) },
          volume: 0.75
        })

        // Initialize Player B
        this.playerB = new window.Spotify.Player({
          name: 'DJ Studio - Deck B',
          getOAuthToken: (cb: (token: string) => void) => { cb(this.token) },
          volume: 0.75
        })

        this.setupPlayerEvents(this.playerA, 'A')
        this.setupPlayerEvents(this.playerB, 'B')

        // Connect both players
        Promise.all([
          this.playerA.connect(),
          this.playerB.connect()
        ]).then(() => {
          console.log('Both Spotify players connected')
          resolve()
        })
      }

      // Load Spotify SDK
      if (!window.Spotify) {
        const script = document.createElement('script')
        script.src = 'https://sdk.scdn.co/spotify-player.js'
        script.async = true
        document.body.appendChild(script)
      }
    })
  }

  private setupPlayerEvents(player: Spotify.Player, deck: 'A' | 'B') {
    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log(`Deck ${deck} ready with Device ID`, device_id)
      if (deck === 'A') {
        this.deviceIdA = device_id
      } else {
        this.deviceIdB = device_id
      }
    })

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log(`Deck ${deck} has gone offline`, device_id)
    })

    player.addListener('player_state_changed', (state: Spotify.PlaybackState) => {
      if (!state) return
      console.log(`Deck ${deck} state changed:`, state)
    })

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error(`Deck ${deck} initialization error:`, message)
    })

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error(`Deck ${deck} authentication error:`, message)
    })

    player.addListener('account_error', ({ message }: { message: string }) => {
      console.error(`Deck ${deck} account error:`, message)
    })
  }

  async playTrack(deck: 'A' | 'B', trackUri: string) {
    const deviceId = deck === 'A' ? this.deviceIdA : this.deviceIdB
    if (!deviceId) {
      throw new Error(`Deck ${deck} not initialized`)
    }

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        uris: [trackUri]
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to play track')
    }
  }

  async pause(deck: 'A' | 'B') {
    const player = deck === 'A' ? this.playerA : this.playerB
    if (player) {
      await player.pause()
    }
  }

  async resume(deck: 'A' | 'B') {
    const player = deck === 'A' ? this.playerA : this.playerB
    if (player) {
      await player.resume()
    }
  }

  async setVolume(deck: 'A' | 'B', volume: number) {
    const player = deck === 'A' ? this.playerA : this.playerB
    if (player) {
      await player.setVolume(volume / 100)
    }
  }

  async seek(deck: 'A' | 'B', positionMs: number) {
    const player = deck === 'A' ? this.playerA : this.playerB
    if (player) {
      await player.seek(positionMs)
    }
  }

  getDeviceId(deck: 'A' | 'B'): string | null {
    return deck === 'A' ? this.deviceIdA : this.deviceIdB
  }

  disconnect() {
    if (this.playerA) {
      this.playerA.disconnect()
    }
    if (this.playerB) {
      this.playerB.disconnect()
    }
  }
}