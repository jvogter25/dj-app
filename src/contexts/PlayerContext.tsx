import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'

interface PlayerContextType {
  deckA: ReturnType<typeof useSpotifyPlayer>
  deckB: ReturnType<typeof useSpotifyPlayer>
  crossfaderPosition: number
  setCrossfaderPosition: (position: number) => void
  masterVolume: number
  setMasterVolume: (volume: number) => void
  channelAVolume: number
  setChannelAVolume: (volume: number) => void
  channelBVolume: number
  setChannelBVolume: (volume: number) => void
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
  const [channelAVolume, setChannelAVolume] = useState(75)
  const [channelBVolume, setChannelBVolume] = useState(75)

  // Apply crossfader and channel volume logic
  useEffect(() => {
    // Crossfader at -50 = full A, 0 = both, +50 = full B
    const crossfaderA = crossfaderPosition <= 0 ? 1 : Math.max(0, 1 - (crossfaderPosition / 50))
    const crossfaderB = crossfaderPosition >= 0 ? 1 : Math.max(0, 1 + (crossfaderPosition / 50))
    
    // Apply all volume controls: channel volume * crossfader * master
    const finalAVolume = (channelAVolume / 100) * crossfaderA * (masterVolume / 100) * 100
    const finalBVolume = (channelBVolume / 100) * crossfaderB * (masterVolume / 100) * 100
    
    console.log('Volume calculations:', { 
      channelAVolume, channelBVolume, crossfaderPosition, masterVolume,
      crossfaderA, crossfaderB, finalAVolume, finalBVolume 
    })
    
    deckA.setVolume(finalAVolume)
    deckB.setVolume(finalBVolume)
  }, [crossfaderPosition, masterVolume, channelAVolume, channelBVolume, deckA, deckB])

  return (
    <PlayerContext.Provider value={{
      deckA,
      deckB,
      crossfaderPosition,
      setCrossfaderPosition,
      masterVolume,
      setMasterVolume,
      channelAVolume,
      setChannelAVolume,
      channelBVolume,
      setChannelBVolume
    }}>
      {children}
    </PlayerContext.Provider>
  )
}