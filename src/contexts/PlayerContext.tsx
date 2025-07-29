import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'

interface PlayerContextType {
  deckA: ReturnType<typeof useSpotifyPlayer>
  deckB: ReturnType<typeof useSpotifyPlayer>
  crossfaderPosition: number
  setCrossfaderPosition: (position: number) => void
  masterVolume: number
  setMasterVolume: (volume: number) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deckA = useSpotifyPlayer('Deck A')
  const deckB = useSpotifyPlayer('Deck B')
  const [crossfaderPosition, setCrossfaderPosition] = useState(0)
  const [masterVolume, setMasterVolume] = useState(75)

  // Apply crossfader logic
  useEffect(() => {
    // Crossfader at -50 = full A, 0 = both, +50 = full B
    const aDeckVolume = crossfaderPosition <= 0 ? 100 : 100 - (crossfaderPosition * 2)
    const bDeckVolume = crossfaderPosition >= 0 ? 100 : 100 + (crossfaderPosition * 2)
    
    // Apply master volume
    const finalAVolume = (aDeckVolume * masterVolume) / 100
    const finalBVolume = (bDeckVolume * masterVolume) / 100
    
    deckA.setVolume(finalAVolume)
    deckB.setVolume(finalBVolume)
  }, [crossfaderPosition, masterVolume, deckA, deckB])

  return (
    <PlayerContext.Provider value={{
      deckA,
      deckB,
      crossfaderPosition,
      setCrossfaderPosition,
      masterVolume,
      setMasterVolume
    }}>
      {children}
    </PlayerContext.Provider>
  )
}